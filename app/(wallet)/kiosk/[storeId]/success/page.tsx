'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SafeImage } from '@/components/ui/image';

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const orderId = searchParams.get('orderId');
  const orderType = searchParams.get('orderType');
  const sessionId = searchParams.get('sessionId');
  const supabase = createClient();
  
  const [orderDetails, setOrderDetails] = useState<any>(null);
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
  
  // Set up real-time subscription for order status changes
  useEffect(() => {
    if (!orderId) return;
    
    console.log('[KioskSuccess] Setting up real-time subscription for order:', orderId);
    
    // Create channel for listening to order status changes
    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'kiosk_orders',
          filter: `kiosk_order_id=eq.${orderId}`
        }, 
        (payload) => {
          console.log('[KioskSuccess] Order status update received:', payload);
          const newStatus = payload.new.status;
          
          // Update order details
          setOrderDetails((prevDetails: any) => ({
            ...prevDetails,
            status: newStatus
          }));
          
          // If order is marked as ready, show notification and play sound
          if (newStatus === 'ready') {
            playNotificationSound();
            setShowReadyNotification(true);
          }
        })
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[KioskSuccess] Subscribed to updates for order ${orderId}`);
        }
        if (status === 'CHANNEL_ERROR') {
          console.error(`[KioskSuccess] Channel error for order ${orderId}:`, err);
        }
      });
      
    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, supabase]);
  
  // Fetch order details and store name only once
  useEffect(() => {
    let isActive = true;
    let isDisconnectingSession = false;
    
    const fetchData = async () => {
      if (!orderId || !storeId) {
        if (isActive) {
          setError('필요한 주문 정보가 없습니다.');
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
        
        // Fetch order data
        const { data: orderData, error: orderError } = await supabase
          .from('kiosk_orders')
          .select('*')
          .eq('kiosk_order_id', orderId)
          .single();
          
        if (!isActive) return;
        
        if (orderError) {
          console.error('Error fetching order:', orderError);
          setError('주문 정보를 불러오는데 실패했습니다.');
        } else if (orderData) {
          setOrderDetails(orderData);
          
          // If order is already ready when we load the page, show notification
          if (orderData.status === 'ready') {
            setShowReadyNotification(true);
          }
        }
      } catch (err) {
        console.error('Error in fetchData:', err);
        if (isActive) {
          setError('데이터를 불러오는데 오류가 발생했습니다.');
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };
    
    fetchData();
    
    // Cleanup function
    return () => {
      isActive = false;
    };
  }, [orderId, storeId, supabase]);
  
  // Set up session disconnection on unmount and timeout to prevent staying on success page too long
  useEffect(() => {
    let isActive = true;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Disconnect session
    const disconnectSession = async () => {
      if (!sessionId || !isActive) return;
      
      try {
        await supabase
          .from('kiosk_sessions')
          .update({ status: 'disconnected' })
          .eq('kiosk_session_id', sessionId);
        
        console.log('Kiosk session disconnected on success page unmount');
      } catch (err) {
        console.error('Error disconnecting session:', err);
      }
    };
    
    // Auto redirect after 60 seconds (prevents users from staying on success page)
    timeoutId = setTimeout(() => {
      if (isActive) {
        disconnectSession().then(() => {
          router.push(`/kiosk/${storeId}`);
        });
      }
    }, 60000);
    
    return () => {
      isActive = false;
      if (timeoutId) clearTimeout(timeoutId);
      disconnectSession();
    };
  }, [sessionId, storeId, router, supabase]);
  
  // Get order type text
  const getOrderTypeText = (type: string | null) => {
    if (!type) return '주문';
    
    switch (type) {
      case 'kiosk_dine_in': return '매장 에서';
      case 'kiosk_takeout': return '가져가기';
      case 'kiosk_delivery': return '배달';
      default: return '주문';
    }
  };
  
  // Get order status text
  const getOrderStatusText = (status: string | undefined) => {
    switch (status) {
      case 'pending': return '접수됨';
      case 'processing': return '처리 중';
      case 'ready': return '준비 완료';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      default: return '처리 중';
    }
  };
  
  const handleNewOrder = () => {
    router.push(`/kiosk/${storeId}`);
  };
  
  const closeNotification = () => {
    setShowReadyNotification(false);
  };

  if (loading) {
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

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      {/* Order Ready Notification */}
      {showReadyNotification && (
        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4 animate-bounce-in">
            <div className="text-center">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <h2 className="text-2xl font-bold mb-2">주문이 준비되었습니다!</h2>
              <p className="text-gray-600 mb-6">지금 카운터에서 주문을 수령하실 수 있습니다.</p>
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
      
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="bg-green-500 p-6 text-center">
          <svg className="w-16 h-16 text-white mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <h1 className="text-2xl font-bold text-white mt-2">주문이 완료되었습니다</h1>
        </div>
        
        <div className="p-6">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-800">{storeName}</h2>
            <p className="text-gray-600">{getOrderTypeText(orderType)} 주문</p>
          </div>
          
          <div className="border-t border-b border-gray-200 py-4 mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">주문 번호:</span>
              <span className="font-medium">{orderId ? `#${orderId.substring(0, 8)}` : 'N/A'}</span>
            </div>
            
            {orderDetails?.device_number && (
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">키오스크 번호:</span>
                <span className="font-medium">단말기 {orderDetails.device_number}번</span>
              </div>
            )}
            
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">주문 상태:</span>
              <span className={`font-medium ${orderDetails?.status === 'ready' ? 'text-green-600 font-bold' : ''}`}>
                {getOrderStatusText(orderDetails?.status)}
              </span>
            </div>
            
            {orderDetails?.total_amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">결제 금액:</span>
                <span className="font-bold text-green-600 flex items-center gap-1 flex-row">{Number(orderDetails.total_amount).toLocaleString()}<p className="text-xs text-gray-500">SGT</p></span>
              </div>
            )}
          </div>
          
          {orderDetails?.status === 'ready' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
              <svg className="w-6 h-6 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <div>
                <p className="text-green-800 font-medium">주문이 준비되었습니다!</p>
                <p className="text-green-600 text-sm">카운터에서 주문을 수령하실 수 있습니다.</p>
              </div>
            </div>
          )}
          
          <div className="text-center mb-6">
            <p className="text-gray-600">이용해 주셔서 감사합니다!</p>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={handleNewOrder}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
              새로운 주문 시작
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 