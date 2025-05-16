'use client';

import React, { useState, useEffect } from 'react';
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
      case 'kiosk_dine_in': return '매장 식사';
      case 'kiosk_takeout': return '포장';
      case 'kiosk_delivery': return '배달';
      default: return '주문';
    }
  };
  
  const handleNewOrder = () => {
    router.push(`/kiosk/${storeId}`);
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
            
            {orderDetails?.total_amount && (
              <div className="flex justify-between">
                <span className="text-gray-600">결제 금액:</span>
                <span className="font-bold text-green-600">{Number(orderDetails.total_amount).toLocaleString()}원</span>
              </div>
            )}
          </div>
          
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