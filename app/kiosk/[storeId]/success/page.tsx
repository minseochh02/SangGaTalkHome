'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = params.storeId as string;
  const orderId = searchParams.get('orderId');
  const orderType = searchParams.get('orderType');
  const sessionId = searchParams.get('sessionId');
  
  const supabase = createClient();
  
  const [countdown, setCountdown] = useState<number>(15);
  const [storeName, setStoreName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Get order type name for display
  const getOrderTypeName = (): string => {
    switch(orderType) {
      case 'kiosk_dine_in':
        return '매장 식사';
      case 'kiosk_takeout':
        return '포장';
      case 'kiosk_delivery':
        return '배달';
      default:
        return '주문';
    }
  };
  
  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };
  
  // Fetch order and store details
  useEffect(() => {
    const fetchDetails = async () => {
      if (!storeId || !orderId) return;
      
      try {
        setLoading(true);
        
        // Fetch store data
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('store_name')
          .eq('store_id', storeId)
          .single();
          
        if (storeError) {
          console.error('Error fetching store:', storeError);
          setError('스토어 정보를 불러오는데 실패했습니다.');
        } else if (storeData) {
          setStoreName(storeData.store_name);
        }
        
        // Fetch order data including order items - adjust field names if needed
        const { data: orderData, error: orderError } = await supabase
          .from('kiosk_orders')
          .select(`
            kiosk_order_id,
            total_amount,
            order_type,
            device_number,
            created_at,
            status,
            kiosk_order_items (
              kiosk_order_item_id,
              product_id,
              quantity,
              price_at_purchase,
              products (
                product_name
              )
            )
          `)
          .eq('kiosk_order_id', orderId)
          .single();
          
        if (orderError) {
          console.error('Error fetching order:', orderError);
          setError('주문 정보를 불러오는데 실패했습니다.');
        } else if (orderData) {
          // Handle any field name discrepancies here
          setOrderDetails(orderData);
        }
      } catch (err) {
        console.error('Error in fetchDetails:', err);
        setError('정보를 불러오는데 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDetails();
  }, [storeId, orderId, supabase]);
  
  // Countdown and redirect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(`/kiosk/${storeId}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [router, storeId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-green-600 text-white p-4 shadow-md">
        <div className="container mx-auto">
          <h1 className="text-xl font-bold text-center">주문 완료</h1>
        </div>
      </header>
      
      {/* Main content */}
      <div className="flex-1 container mx-auto p-4">
        <div className="max-w-2xl mx-auto">
          {error ? (
            <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-bold mb-2">오류가 발생했습니다</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Link
                href={`/kiosk/${storeId}`}
                className="inline-block px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                처음으로 돌아가기
              </Link>
            </div>
          ) : (
            <>
              {/* Success message */}
              <div className="bg-white p-6 rounded-lg shadow-md mb-6 text-center">
                <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-2">주문이 완료되었습니다</h2>
                <p className="text-gray-600 mb-4">
                  {getOrderTypeName()} 주문이 정상적으로 접수되었습니다.
                </p>
                {orderDetails?.device_number && (
                  <div className="mt-4 mb-6">
                    <span className="inline-block px-4 py-2 bg-gray-100 rounded-full text-2xl font-bold">
                      주문번호: {orderDetails.device_number}
                    </span>
                  </div>
                )}
                <div className="text-sm text-gray-500 mt-2">
                  {countdown}초 후 메인 화면으로 돌아갑니다
                </div>
              </div>
              
              {/* Order details */}
              {orderDetails && (
                <div className="bg-white p-6 rounded-lg shadow-md mb-6">
                  <h3 className="text-lg font-bold mb-4">주문 상세</h3>
                  <div className="mb-4">
                    <p className="text-gray-600">매장: <span className="font-medium">{storeName}</span></p>
                    <p className="text-gray-600">주문 시간: <span className="font-medium">{formatDate(orderDetails.created_at)}</span></p>
                    <p className="text-gray-600">주문 유형: <span className="font-medium">{getOrderTypeName()}</span></p>
                  </div>
                  
                  <div className="border-t border-b py-4 my-4">
                    <h4 className="font-medium mb-2">주문 항목</h4>
                    <div className="max-h-48 overflow-y-auto">
                      {orderDetails.kiosk_order_items.map((item: any) => (
                        <div key={item.kiosk_order_item_id} className="flex justify-between py-2">
                          <div>
                            <span className="font-medium">{item.products?.product_name || '알 수 없는 상품'}</span>
                            <span className="text-gray-500 ml-2">x{item.quantity}</span>
                          </div>
                          <span className="font-medium">{formatPrice(item.price_at_purchase * item.quantity)}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-lg font-bold">
                    <span>총 결제 금액</span>
                    <span className="text-red-600">{formatPrice(orderDetails.total_amount)}원</span>
                  </div>
                </div>
              )}
              
              {/* Back button */}
              <div className="mt-6 text-center">
                <Link
                  href={`/kiosk/${storeId}`}
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  새로운 주문하기
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 