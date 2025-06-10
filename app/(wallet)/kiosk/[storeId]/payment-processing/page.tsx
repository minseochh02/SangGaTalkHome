'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the PortOnePayment component with no SSR
const PortOnePayment = dynamic(() => import('@/components/payment/PortOnePayment'), { 
  ssr: false,
  loading: () => <div className="w-full py-3 bg-gray-400 text-white font-bold rounded-md text-center">결제 모듈 로딩중...</div>
});

interface KioskOrder {
  kiosk_order_id: string;
  status: string;
  // Add other fields if needed by this page
}

function PaymentProcessingPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const storeId = params.storeId as string;
  const kioskOrderId = searchParams.get('kioskOrderId');
  const orderName = searchParams.get('orderName') || '상가 키오스크 주문';
  const totalAmountKRW = parseFloat(searchParams.get('totalAmountKRW') || '0');
  const orderType = searchParams.get('orderType');
  const originalSessionId = searchParams.get('originalSessionId');
  const originalDeviceNumber = searchParams.get('originalDeviceNumber');

  const [currentOrderStatus, setCurrentOrderStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [paymentPageUrl, setPaymentPageUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Construct a stable redirect URL for PortOne, removing PortOne's own query params if they are ever added
      const url = new URL(window.location.href);
      url.searchParams.delete('imp_uid');
      url.searchParams.delete('merchant_uid');
      url.searchParams.delete('imp_success');
      url.searchParams.delete('error_msg');
      setPaymentPageUrl(url.toString());
    }
  }, []);

  // Real-time listener for order status changes
  useEffect(() => {
    if (!kioskOrderId) {
      setError('주문 ID가 없습니다. 이전 페이지로 돌아가 다시 시도해주세요.');
      return;
    }

    setCurrentOrderStatus('pending_payment'); // Initial assumption

    const channel = supabase
      .channel(`kiosk-order-status-${kioskOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'kiosk_orders',
          filter: `kiosk_order_id=eq.${kioskOrderId}`,
        },
        (payload) => {
          const updatedOrder = payload.new as KioskOrder;
          console.log(`[PaymentProcessingPage] Order status update received: ${updatedOrder.kiosk_order_id}, New Status: ${updatedOrder.status}`);
          setCurrentOrderStatus(updatedOrder.status);

          // If payment is successful (processing) or already marked fully completed, redirect to success page
          if (updatedOrder.status === 'processing' || updatedOrder.status === 'completed') {
            router.push(
              `/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${originalSessionId}`
            );
          } else if (updatedOrder.status === 'failed') {
            setError('결제에 실패했거나 주문 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            // Potentially offer retry or guide user
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[PaymentProcessingPage] Subscribed to order updates for ${kioskOrderId}`);
          // Fetch initial status in case it changed before subscription
          fetchInitialOrderStatus();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`[PaymentProcessingPage] Subscription error for ${kioskOrderId}:`, err);
          setError('주문 상태를 실시간으로 확인하는데 실패했습니다. 페이지를 새로고침하거나 고객센터에 문의하세요.');
        }
      });
    
    const fetchInitialOrderStatus = async () => {
      const { data, error: fetchError } = await supabase
        .from('kiosk_orders')
        .select('status')
        .eq('kiosk_order_id', kioskOrderId)
        .single();
      if (fetchError) {
        console.error('[PaymentProcessingPage] Error fetching initial order status:', fetchError);
      } else if (data) {
        console.log(`[PaymentProcessingPage] Initial status for ${kioskOrderId}: ${data.status}`);
        // If payment is successful (processing) or already marked fully completed, redirect to success page
        if (data.status === 'processing' || data.status === 'completed') {
           router.push(
              `/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${originalSessionId}`
            );
        } else if (data.status === 'failed') {
           setError('이 주문은 이전에 실패 처리되었습니다.');
        }
        setCurrentOrderStatus(data.status);
      }
    };

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [kioskOrderId, storeId, orderType, originalSessionId, supabase, router]);

  const handlePaymentInitiation = () => {
    // This function could be called by a button if we want manual initiation
    // For now, PortOnePayment can auto-initiate if props are ready
    setPaymentAttempted(true); 
  };
  
  const handlePaymentSuccessCallback = useCallback((paymentResult: any) => {
    console.log('[PaymentProcessingPage] PortOne onPaymentComplete callback triggered:', paymentResult);
    // The /api/payment/complete route (called by PortOnePayment component) should update the DB.
    // The real-time listener will then pick up the 'completed' status.
    // We might set a local state here, e.g., "verifying payment..."
    if (paymentResult.status !== 'PAID') {
        setError(`결제는 완료되었으나, 최종 확인에 실패했습니다: ${paymentResult.message}`);
    }
     // If PAID, the listener should handle the redirect.
     // If for some reason the listener misses it, and we are sure it's PAID from here:
     // if (paymentResult.status === 'PAID') {
     //   router.push(`/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${originalSessionId}`);
     // }
  }, [kioskOrderId, storeId, orderType, originalSessionId, router]);

  const handlePaymentFailureCallback = useCallback((paymentError: any) => {
    console.error('[PaymentProcessingPage] PortOne onPaymentFailed callback:', paymentError);
    setError(
      `결제 실패: ${paymentError.message || '알 수 없는 오류가 발생했습니다.'} (주문 ID: ${kioskOrderId})`
    );
  },[kioskOrderId]);
  
  const handlePaymentModalClose = useCallback(() => {
    console.log('[PaymentProcessingPage] PortOne onClose callback triggered.');
    // If payment wasn't successful and modal is closed, user might want to go back.
    // Check currentOrderStatus. If it's not 'completed', perhaps redirect to checkout.
    if (currentOrderStatus !== 'completed' && currentOrderStatus !== 'processing') {
       router.push(`/kiosk/${storeId}/checkout?sessionId=${originalSessionId}&deviceNumber=${originalDeviceNumber}`);
    }
  }, [currentOrderStatus, router, storeId, originalSessionId, originalDeviceNumber]);


  if (!kioskOrderId || totalAmountKRW <= 0 || !paymentPageUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">결제 정보를 준비 중입니다...</p>
          {error && <p className="text-red-500 mt-2">오류: {error}</p>}
           <button 
              onClick={() => router.push(`/kiosk/${storeId}/checkout?sessionId=${originalSessionId}&deviceNumber=${originalDeviceNumber}`)}
              className="mt-4 px-4 py-2 bg-gray-300 text-black rounded hover:bg-gray-400"
            >
              주문으로 돌아가기
            </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-red-600 text-white p-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">결제 진행</h1>
           <Link href={`/kiosk/${storeId}${originalSessionId ? `?sessionId=${originalSessionId}` : ''}`} className="text-sm hover:underline">
              키오스크 홈
            </Link>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
        <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-xl shadow-xl">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              <p className="font-semibold text-lg mb-1">결제 오류</p>
              <p className="text-sm">{error}</p>
              <button 
                onClick={() => router.push(`/kiosk/${storeId}/checkout?sessionId=${originalSessionId}&deviceNumber=${originalDeviceNumber}`)}
                className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
              >
                주문 다시 시도
              </button>
            </div>
          )}

          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-1">{orderName}</h2>
            <p className="text-gray-600">주문 ID: {kioskOrderId?.substring(0,8)}...</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-6 shadow-inner">
             <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600">결제할 금액:</span>
                <span className="text-2xl font-bold text-red-600">{totalAmountKRW.toLocaleString()}원</span>
             </div>
             {currentOrderStatus && (
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">현재 주문 상태:</span>
                    <span className={`font-medium ${
                        currentOrderStatus === 'completed' ? 'text-green-600' :
                        currentOrderStatus === 'processing' ? 'text-blue-600' :
                        currentOrderStatus === 'failed' ? 'text-red-600' :
                        'text-gray-700'
                    }`}>
                        {currentOrderStatus === 'pending_payment' ? '결제 대기 중' :
                         currentOrderStatus === 'processing' ? '결제 완료 (처리중)' :
                         currentOrderStatus === 'completed' ? '주문 완료됨' :
                         currentOrderStatus === 'failed' ? '결제 실패' : currentOrderStatus}
                    </span>
                </div>
             )}
             
             {/* Transaction information moved here */}
             <div className="mt-4 pt-4 border-t border-gray-200">
               <div className="text-xs text-gray-600">
                 <h4 className="font-semibold text-sm text-gray-700 mb-2">거래 안내</h4>
                 <ul className="space-y-1.5 list-disc list-inside text-gray-500">
                   <li>본 쇼핑몰은 「전자상거래 등에서의 소비자보호에 관한 법률」에 따라 결제, 배송, 환불 등 거래 전 과정에 대한 책임을 집니다.</li>
                   <li>결제 과정에서 입력하신 개인정보 및 결제정보는 안전하게 보호됩니다.</li>
                 </ul>
                 <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
                   <span className="font-medium">고객센터 문의</span>
                   <span className="font-bold text-gray-700">070-4024-5884 ((주)쿠스)</span>
                 </div>
               </div>
             </div>
          </div>

          {(!currentOrderStatus || (currentOrderStatus !== 'completed' && currentOrderStatus !== 'failed')) && !error && (
            <div className="mb-6">
              <PortOnePayment
                storeId={process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "store-e4038486-8d83-41a5-acf1-844a009e0d94"}
                merchantUidFromCaller={kioskOrderId}
                orderName={orderName}
                totalAmount={totalAmountKRW}
                currency="KRW"
                redirectUrl={paymentPageUrl} // Important: use the cleaned URL
                customData={{
                  kioskOrderId: kioskOrderId,
                  orderType: orderType,
                  originalSessionId: originalSessionId,
                  originalDeviceNumber: originalDeviceNumber,
                  storeId: storeId,
                }}
                onPaymentComplete={handlePaymentSuccessCallback}
                onPaymentFailed={handlePaymentFailureCallback}
                onClose={handlePaymentModalClose}
                showModals={true} 
              />
              <div className="mt-4">
                <hr className="border-gray-300 my-3" />
                <button className="w-full py-2.5 bg-black text-white font-bold rounded-md hover:bg-gray-700 transition-colors">
                  SGT포인트로 결제
                </button>
                <p className="text-xs text-red-500 mt-1 text-center">* 부분 결제는 불가능합니다.</p>
              </div>
            </div>
          )}
          
          {(currentOrderStatus === 'processing' || (paymentAttempted && !error && currentOrderStatus === 'pending_payment')) && (
             <div className="text-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-red-600 mx-auto mb-4"></div>
                <p className="text-lg font-semibold text-gray-700">결제를 처리 중입니다...</p>
                <p className="text-sm text-gray-500">잠시만 기다려주세요. 이 페이지는 자동으로 업데이트됩니다.</p>
             </div>
          )}

          {currentOrderStatus === 'completed' && (
            <div className="text-center py-8">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-8m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <p className="text-xl font-semibold text-green-700">결제가 성공적으로 처리되었습니다!</p>
              <p className="text-sm text-gray-600 mt-2">주문 확인 페이지로 이동합니다...</p>
            </div>
          )}
           {currentOrderStatus === 'failed' && !error && ( // If status is failed but no specific PortOne error shown
             <div className="text-center py-8">
                <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <p className="text-xl font-semibold text-red-700">결제에 실패했습니다.</p>
                <p className="text-sm text-gray-600 mt-2">주문을 다시 시도해주세요.</p>
             </div>
           )}
        </div>
      </main>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function PaymentProcessingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">페이지 로딩 중...</p>
        </div>
      </div>
    }>
      <PaymentProcessingPageContent />
    </Suspense>
  );
} 