'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/image';

// Interfaces for order items
interface OrderItem {
  kiosk_order_item_id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price_at_purchase: number;
  options?: OrderItemOption[];
}

interface OrderItemOption {
  option_id: string;
  option_group_name: string;
  option_choice_name: string;
  price_impact: number;
}

interface KioskOrder {
  kiosk_order_id: string;
  store_id: string;
  status: string;
  created_at: string;
  device_number?: number;
  total_amount?: number;
  order_type?: string;
  order_items?: OrderItem[]; // Add order items array
}

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const latestOrderId = searchParams.get('orderId'); // For highlighting and specific notification
  const orderType = searchParams.get('orderType'); // For the latest order
  const sessionId = searchParams.get('sessionId');
  const supabase = createClient();
  
  const [displayedOrders, setDisplayedOrders] = useState<KioskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showReadyNotification, setShowReadyNotification] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Make sure to clear cart when the success page loads
  useEffect(() => {
    let isActive = true;
    
    try {
      // Clear cart in localStorage
      localStorage.removeItem(`kiosk-cart-${storeId}`);
    } catch (err) {
      console.error('Error clearing cart:', err);
    }
    
    return () => {
      isActive = false;
    };
  }, [storeId]);
  
  // Create audio element for notification sound
  useEffect(() => {
    audioRef.current = new Audio('/notification-sound.mp3');
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);
  
  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.error('Error playing notification sound:', err);
      });
    }
  };
  
  // Set up real-time subscription for ALL relevant orders in the current session
  useEffect(() => {
    if (!sessionId) return; // Need sessionId to subscribe
    
    console.log('[KioskSuccess] Setting up real-time subscription for session:', sessionId);
    
    const channel = supabase
      .channel(`session-order-updates-${sessionId}`) // Channel name based on session
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'kiosk_orders',
          filter: `kiosk_session_id=eq.${sessionId}` // Filter by session ID
        }, 
        (payload) => {
          console.log('[KioskSuccess] Session order update received:', payload);
          const updatedOrder = payload.new as KioskOrder;
          
          // Update the specific order in displayedOrders array
          setDisplayedOrders(prevOrders => 
            prevOrders.map(order => 
              order.kiosk_order_id === updatedOrder.kiosk_order_id ? { ...order, status: updatedOrder.status } : order
            )
          );
          
          // If the updated order is now 'ready', trigger notification
          if (updatedOrder.status === 'ready') {
            // Check if this order was ALREADY 'ready' in the displayedOrders to prevent re-notifying if something else in the payload changed
            // This check is a bit tricky because displayedOrders might not have updated yet due to async nature of setState
            // A simpler approach: only notify if the PREVIOUS state of this order wasn't ready.
            // However, the current global notification will show for any 'ready' update.
            
            // For now, let's assume any 'ready' update for an order in the session is a valid trigger.
            // We might need to refine this if multiple 'ready' updates for the SAME order cause issues.
            const orderJustBecameReady = displayedOrders.find(o => o.kiosk_order_id === updatedOrder.kiosk_order_id)?.status !== 'ready';

            // Only play sound and show pop-up if it's a new "ready" status for an order we are displaying
            // and it's not already showing.
            // This logic might need to be smarter if multiple orders become ready close together.
            if (updatedOrder.status === 'ready') {
                 // Check if this specific order is one we are displaying and if its *previous* state wasn't 'ready'
                 // This helps avoid re-notifying if the page re-renders or if other fields on a 'ready' order change.
                 setDisplayedOrders(prevOrders => {
                    const existingOrder = prevOrders.find(o => o.kiosk_order_id === updatedOrder.kiosk_order_id);
                    if (existingOrder && existingOrder.status !== 'ready') {
                        playNotificationSound();
                        setShowReadyNotification(true);
                    }
                    // Return the mapped orders regardless of notification
                    return prevOrders.map(order => 
                        order.kiosk_order_id === updatedOrder.kiosk_order_id 
                            ? { ...order, status: updatedOrder.status, ...payload.new } // Ensure all new fields are copied
                            : order
                    );
                });
            } else {
                 // Just update the status for non-ready changes without notification
                 setDisplayedOrders(prevOrders => 
                    prevOrders.map(order => 
                        order.kiosk_order_id === updatedOrder.kiosk_order_id 
                            ? { ...order, status: updatedOrder.status, ...payload.new } 
                            : order
                    )
                );
            }
          }
        })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[KioskSuccess] Subscribed to order updates for session ${sessionId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[KioskSuccess] Channel error for session ${sessionId}:`, err);
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
      console.log(`[KioskSuccess] Unsubscribed from order updates for session ${sessionId}`);
    };
  }, [sessionId, supabase]); // Depend on sessionId
  
  // Fetch initial orders for the session and store name
  useEffect(() => {
    let isActive = true;
    
    const fetchData = async () => {
      if (!sessionId || !storeId) {
        if (isActive) {
          setError('필요한 세션 또는 스토어 정보가 없습니다.');
          setLoading(false);
        }
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch store data
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('store_name')
          .eq('store_id', storeId)
          .single();
          
        if (!isActive) return;
        if (storeError) {
          console.error('Error fetching store:', storeError);
          setError('스토어 정보를 불러오는데 실패했습니다.');
        } else if (storeData) {
          setStoreName(storeData.store_name);
        }
        
        // Fetch orders for the session
        const { data: ordersData, error: ordersError } = await supabase
          .from('kiosk_orders')
          .select('*')
          .eq('kiosk_session_id', sessionId)
          .in('status', ['completed', 'ready', 'pending', 'processing']) // Fetch relevant statuses
          .order('created_at', { ascending: true }); // Show OLDEST first for sequential numbering
          
        if (!isActive) return;
        
        if (ordersError) {
          console.error('Error fetching session orders:', ordersError);
          setError('세션 주문 정보를 불러오는데 실패했습니다.');
        } else if (ordersData) {
          // For each order, fetch its items
          const ordersWithItems = await Promise.all(ordersData.map(async (order) => {
            // Fetch order items with product information
            const { data: itemsData, error: itemsError } = await supabase
              .from('kiosk_order_items')
              .select(`
                kiosk_order_item_id,
                product_id,
                quantity,
                price_at_purchase,
                products:product_id (product_name)
              `)
              .eq('kiosk_order_id', order.kiosk_order_id);
              
            if (itemsError || !itemsData) {
              console.error('Error fetching order items:', itemsError);
              return order;
            }
            
            // Format items with product names
            const formattedItems = itemsData.map(item => ({
              kiosk_order_item_id: item.kiosk_order_item_id,
              product_id: item.product_id,
              product_name: (item.products as any)?.product_name || '알 수 없는 상품',
              quantity: item.quantity,
              price_at_purchase: item.price_at_purchase,
              options: [] // Initialize empty options array
            }));
            
            // Fetch options for each item if needed
            const itemsWithOptions = await Promise.all(formattedItems.map(async (item) => {
              const { data: optionsData, error: optionsError } = await supabase
                .from('kiosk_order_item_options')
                .select('*')
                .eq('kiosk_order_item_id', item.kiosk_order_item_id);
                
              if (optionsError || !optionsData) {
                return item;
              }
              
              return {
                ...item,
                options: optionsData
              };
            }));
            
            return {
              ...order,
              order_items: itemsWithOptions
            };
          }));
          
          setDisplayedOrders(ordersWithItems);
          
          // Check if the latest order (from URL) is already ready
          const currentLatestOrder = ordersWithItems.find(o => o.kiosk_order_id === latestOrderId);
          if (currentLatestOrder?.status === 'ready') {
            setShowReadyNotification(true); // Potentially show notification without sound if already ready on load
          }
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        if (isActive) setError('데이터를 불러오는데 오류가 발생했습니다.');
      } finally {
        if (isActive) setLoading(false);
      }
    };
    
    fetchData();
    
    return () => { isActive = false; };
  }, [sessionId, storeId, supabase, latestOrderId]); // Add latestOrderId to re-check notification
  
  // Session disconnection logic remains the same
  useEffect(() => {
    let isActive = true;
    let timeoutId: NodeJS.Timeout | null = null;
    const disconnectSession = async () => {
      if (!sessionId || !isActive) return;
      try {
        await supabase.from('kiosk_sessions').update({ status: 'disconnected' }).eq('kiosk_session_id', sessionId);
        console.log('Kiosk session disconnected on success page');
      } catch (err) {
        console.error('Error disconnecting session:', err);
      }
    };
    timeoutId = setTimeout(() => {
      if (isActive) {
        disconnectSession().then(() => router.push(`/kiosk/${storeId}`));
      }
    }, 300000); // Extended to 5 minutes, or adjust as needed
    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      disconnectSession();
    };
  }, [sessionId, storeId, router, supabase]);
  
  const getOrderTypeText = (type: string | null | undefined) => {
    if (!type) return '주문';
    switch (type) {
      case 'kiosk_dine_in': return '매장 에서';
      case 'kiosk_takeout': return '가져가기';
      case 'kiosk_delivery': return '배달';
      default: return '주문';
    }
  };
  
  const getOrderStatusText = (status: string | undefined) => {
    switch (status) {
      case 'pending': return '접수됨';
      case 'processing': return '처리 중';
      case 'ready': return '준비 완료';
      case 'completed': return '완료됨'; // Should we still see completed here?
      case 'cancelled': return '취소됨';
      default: return '처리 중';
    }
  };
  
  const handleNewOrder = () => {
    // Pass current sessionId to the new order page
    router.push(`/kiosk/${storeId}?sessionId=${sessionId}`);
  };
  
  const closeNotification = () => {
    setShowReadyNotification(false);
  };

  if (loading && displayedOrders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">주문 정보를 확인하는 중...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link 
            href={`/kiosk/${storeId}`}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            키오스크로 돌아가기
          </Link>
        </div>
      </div>
    );
  }
  
  const latestOrderForHeader = displayedOrders.find(o => o.kiosk_order_id === latestOrderId) || displayedOrders[0];

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-2 sm:py-8 sm:px-4">
      {/* Order Ready Notification for the LATEST order */}
      {showReadyNotification && latestOrderId && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 max-w-md w-[95%] mx-2 animate-bounce-in">
            <div className="text-center">
              <svg className="w-12 h-12 sm:w-16 sm:h-16 text-green-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">주문 #{latestOrderId?.substring(0,8)} 준비 완료!</h2>
              <p className="text-gray-600 mb-4">카운터에서 수령해주세요.</p>
              <button 
                onClick={closeNotification}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 focus:outline-none"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className={`p-4 sm:p-6 text-center ${latestOrderForHeader?.status === 'ready' && latestOrderForHeader?.kiosk_order_id === latestOrderId ? 'bg-green-500' : 'bg-blue-600'}`}>
          <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h1 className="text-xl sm:text-2xl font-bold text-white mt-2">
            {latestOrderForHeader?.status === 'ready' && latestOrderForHeader?.kiosk_order_id === latestOrderId 
              ? `주문 #${latestOrderId?.substring(0,8)} 준비 완료!`
              : displayedOrders.length > 0 ? "주문이 접수되었습니다" : "주문 내역 없음"}
          </h1>
        </div>
        
        <div className="p-3 sm:p-5">
          <div className="mb-4 sm:mb-6 text-center">
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">{storeName}</h2>
            {displayedOrders.length === 0 && !loading && (
              <p className="text-gray-500 mt-3">이 세션의 주문 내역이 없습니다.</p>
            )}
          </div>

          {displayedOrders.map((order) => (
            <div key={order.kiosk_order_id} className={`border rounded-lg p-3 mb-3 ${order.kiosk_order_id === latestOrderId ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}>
              <div className="flex flex-wrap justify-between items-center mb-2">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-1 sm:mb-0">
                  {order.device_number 
                    ? `단말기 ${order.device_number}번 ${getOrderTypeText(order.order_type)}` 
                    : `${getOrderTypeText(order.order_type)} 주문`}
                </h3>
                <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${order.status === 'ready' ? 'bg-green-100 text-green-700' : order.status === 'pending' || order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                  {getOrderStatusText(order.status)}
                </span>
              </div>
              
              <div className="text-xs sm:text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>주문 시간:</span>
                  <span>{new Date(order.created_at).toLocaleString('ko-KR')}</span>
                </div>
                
                {order.total_amount && (
                  <div className="flex justify-between">
                    <span>결제 금액:</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1 flex-row">{Number(order.total_amount).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></span>
                  </div>
                )}
              </div>
              
              {/* Order Items Section */}
              {order.order_items && order.order_items.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-200">
                  <p className="font-medium text-gray-700 mb-1 text-sm">주문 항목:</p>
                  <div className="space-y-1.5">
                    {order.order_items.map((item) => (
                      <div key={item.kiosk_order_item_id} className="bg-gray-50 p-2 rounded">
                        <div className="flex flex-wrap justify-between text-xs sm:text-sm">
                          <div className="flex items-center mr-2 mb-1 sm:mb-0">
                            <span className="text-gray-800">{item.product_name}</span>
                            <span className="text-gray-500 mx-1">x{item.quantity}</span>
                          </div>
                          <span className="text-gray-800">{Number(item.price_at_purchase * item.quantity).toLocaleString()} SGT</span>
                        </div>
                        {item.options && item.options.length > 0 && (
                          <div className="ml-2 mt-1 text-xs text-gray-600">
                            {item.options.map((option) => (
                              <div key={option.option_id} className="flex justify-between flex-wrap">
                                <span className="mr-1">{option.option_group_name}: {option.option_choice_name}</span>
                                {option.price_impact !== 0 && (
                                  <span className={option.price_impact > 0 ? 'text-green-600' : 'text-red-600'}>
                                    {option.price_impact > 0 ? '+' : ''}{option.price_impact.toLocaleString()} SGT
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {order.status === 'ready' && (
                <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2 flex items-center">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-1 sm:mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-green-700 text-xs sm:text-sm font-medium">픽업 준비 완료!</p>
                </div>
              )}
            </div>
          ))}
          
          <div className="text-center mt-6 mb-4">
            <p className="text-gray-600 text-sm">이용해 주셔서 감사합니다!</p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleNewOrder}
              className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50"
            >
              추가 주문하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 