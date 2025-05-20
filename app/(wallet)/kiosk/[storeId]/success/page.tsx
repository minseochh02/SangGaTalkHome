'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/image';

interface KioskOrder {
  kiosk_order_id: string;
  store_id: string;
  status: string;
  created_at: string;
  device_number?: number;
  total_amount?: number;
  order_type?: string;
  // Add other fields as necessary
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
  
  // Set up real-time subscription for the LATEST order status changes
  useEffect(() => {
    if (!latestOrderId) return;
    
    console.log('[KioskSuccess] Setting up real-time subscription for latest order:', latestOrderId);
    
    const channel = supabase
      .channel(`order-status-${latestOrderId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'kiosk_orders',
          filter: `kiosk_order_id=eq.${latestOrderId}`
        }, 
        (payload) => {
          console.log('[KioskSuccess] Latest order status update received:', payload);
          const newStatus = payload.new.status;
          
          // Update the specific order in displayedOrders array
          setDisplayedOrders(prevOrders => 
            prevOrders.map(order => 
              order.kiosk_order_id === latestOrderId ? { ...order, status: newStatus } : order
            )
          );
          
          if (newStatus === 'ready') {
            playNotificationSound();
            setShowReadyNotification(true);
          }
        })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[KioskSuccess] Subscribed to updates for latest order ${latestOrderId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[KioskSuccess] Channel error for latest order ${latestOrderId}:`, err);
        }
      });
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [latestOrderId, supabase]);
  
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
          .order('created_at', { ascending: false }); // Show newest first
          
        if (!isActive) return;
        
        if (ordersError) {
          console.error('Error fetching session orders:', ordersError);
          setError('세션 주문 정보를 불러오는데 실패했습니다.');
        } else if (ordersData) {
          setDisplayedOrders(ordersData as KioskOrder[]);
          // Check if the latest order (from URL) is already ready
          const currentLatestOrder = ordersData.find(o => o.kiosk_order_id === latestOrderId);
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
    <div className="min-h-screen bg-gray-100 py-12 px-4">
      {/* Order Ready Notification for the LATEST order */}
      {showReadyNotification && latestOrderId && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 animate-bounce-in">
            <div className="text-center">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-2xl font-bold mb-2">주문 #{latestOrderId?.substring(0,8)} 준비 완료!</h2>
              <p className="text-gray-600 mb-6">카운터에서 수령해주세요.</p>
              <button 
                onClick={closeNotification}
                className="px-6 py-3 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 focus:outline-none"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className={`p-6 text-center ${latestOrderForHeader?.status === 'ready' && latestOrderForHeader?.kiosk_order_id === latestOrderId ? 'bg-green-500' : 'bg-blue-600'}`}>
          <svg className="w-16 h-16 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h1 className="text-2xl font-bold text-white mt-2">
            {latestOrderForHeader?.status === 'ready' && latestOrderForHeader?.kiosk_order_id === latestOrderId 
              ? `주문 #${latestOrderId?.substring(0,8)} 준비 완료!`
              : displayedOrders.length > 0 ? "주문이 접수되었습니다" : "주문 내역 없음"}
          </h1>
        </div>
        
        <div className="p-6">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-800">{storeName}</h2>
            {displayedOrders.length === 0 && !loading && (
              <p className="text-gray-500 mt-4">이 세션의 주문 내역이 없습니다.</p>
            )}
          </div>

          {displayedOrders.map((order, index) => (
            <div key={order.kiosk_order_id} className={`border rounded-lg p-4 mb-4 ${order.kiosk_order_id === latestOrderId ? 'border-blue-500 shadow-lg' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-700">{getOrderTypeText(order.order_type)} 주문 #{order.kiosk_order_id.substring(0,8)}</h3>
                <span className={`font-medium px-2 py-0.5 rounded-full text-sm ${order.status === 'ready' ? 'bg-green-100 text-green-700' : order.status === 'pending' || order.status === 'processing' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>
                  {getOrderStatusText(order.status)}
                </span>
              </div>
              <div className="text-sm text-gray-600">
                {order.device_number && (
                  <div className="flex justify-between">
                    <span>키오스크 번호:</span>
                    <span>단말기 {order.device_number}번</span>
                  </div>
                )}
                {order.total_amount && (
                  <div className="flex justify-between">
                    <span>결제 금액:</span>
                    <span className="font-bold text-gray-800 flex items-center gap-1 flex-row">{Number(order.total_amount).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>주문 시간:</span>
                  <span>{new Date(order.created_at).toLocaleString('ko-KR')}</span>
                </div>
              </div>
              {order.status === 'ready' && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-green-700 text-sm font-medium">픽업 준비 완료!</p>
                </div>
              )}
            </div>
          ))}
          
          <div className="text-center mt-8 mb-6">
            <p className="text-gray-600">이용해 주셔서 감사합니다!</p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleNewOrder} // Updated to pass sessionId
              className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-50"
            >
              추가 주문하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 