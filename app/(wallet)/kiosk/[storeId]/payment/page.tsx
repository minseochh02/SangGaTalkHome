'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// Dynamically import the PortOnePayment component with no SSR
const PortOnePayment = dynamic(() => import('@/components/payment/PortOnePayment'), { 
  ssr: false,
  loading: () => <div className="w-full py-3 bg-gray-400 text-white font-bold rounded-md text-center">결제 모듈 로딩중...</div>
});

function PaymentPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const storeId = params.storeId as string;
  const kioskOrderId = searchParams.get('kioskOrderId');
  const orderName = searchParams.get('orderName') || '상가 키오스크 주문';
  const totalAmountSGT = parseFloat(searchParams.get('totalAmountSGT') || '0');
  const orderType = searchParams.get('orderType');
  const originalSessionId = searchParams.get('originalSessionId');
  const originalDeviceNumber = searchParams.get('originalDeviceNumber');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(1000);
  const [totalAmountKRW, setTotalAmountKRW] = useState<number>(0);
  const [cleanRedirectUrl, setCleanRedirectUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setCleanRedirectUrl(window.location.origin + window.location.pathname);
    }
    try {
      const storedRate = localStorage.getItem('sgt-exchange-rate');
      if (storedRate) {
        const rate = parseFloat(storedRate);
        setExchangeRate(rate);
        setTotalAmountKRW(Math.round(totalAmountSGT * rate));
      } else {
        setTotalAmountKRW(Math.round(totalAmountSGT * 1000)); // Default rate
      }
    } catch (err) {
      console.error('Error loading exchange rate:', err);
      setTotalAmountKRW(Math.round(totalAmountSGT * 1000)); // Default rate on error
    }
    setIsLoading(false);
  }, [totalAmountSGT]);

  // Add effect to check if order is already completed
  useEffect(() => {
    // Skip if no order ID or still loading
    if (!kioskOrderId || isLoading) return;

    const checkOrderStatus = async () => {
      try {
        console.log(`[PaymentPage] Checking status of order: ${kioskOrderId}`);
        const { data: orderData, error } = await supabase
          .from('kiosk_orders')
          .select('status')
          .eq('kiosk_order_id', kioskOrderId)
          .single();

        if (error) {
          console.error('[PaymentPage] Error checking order status:', error);
          return;
        }

        console.log(`[PaymentPage] Order ${kioskOrderId} status: ${orderData?.status}`);
        
        // If order is already completed, redirect to success page
        if (orderData?.status === 'completed') {
          console.log('[PaymentPage] Order already completed, redirecting to success page');
          const successUrl = `/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${originalSessionId}`;
          window.location.href = successUrl;
        }
      } catch (err) {
        console.error('[PaymentPage] Error in checkOrderStatus:', err);
      }
    };

    checkOrderStatus();
  }, [kioskOrderId, storeId, orderType, originalSessionId, isLoading, supabase]);

  const handlePaymentSuccess = (paymentResult: any) => {
    console.log("[PaymentPage] Payment result received:", paymentResult);
    // Only redirect if payment was successful
    if (paymentResult.status === 'PAID') {
      const successUrl = `/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${originalSessionId}`;
      console.log(`[PaymentPage] Payment success, redirecting to: ${successUrl}`);
      
      // Always use window.location.href for a hard redirect
      // This is more reliable after payment processing
      try {
        console.log('[PaymentPage] Executing redirect via window.location.href');
        window.location.href = successUrl;
      } catch (error) {
        console.error('[PaymentPage] Error with redirect:', error);
        // Try an alternative approach if the first one fails
        setTimeout(() => {
          console.log('[PaymentPage] Attempting redirect again via setTimeout');
          window.location.href = successUrl;
        }, 500);
      }
    } else {
      console.log(`[PaymentPage] Payment not successful, status: ${paymentResult.status}`);
      // Handle non-successful payment (should be rare since we have onPaymentFailed for failures)
      setError(`결제 처리 오류: ${paymentResult.message || '알 수 없는 오류가 발생했습니다.'} (주문 ID: ${kioskOrderId})`);
    }
  };

  const handlePaymentFailure = (paymentError: any) => {
    setError(
      `결제 실패: ${paymentError.message || '알 수 없는 오류가 발생했습니다.'} (주문 ID: ${kioskOrderId})`
    );
    // Optionally, you might want to offer a retry or redirect to the cart/checkout
  };

  const handlePaymentModalClose = () => {
    // User closed PortOne's modal (if applicable) or our own failure/success modal.
    // If payment wasn't successful, they are still on this page.
    // Consider redirecting them back to the main kiosk page or checkout if they cancel.
    router.push(`/kiosk/${storeId}${originalSessionId ? `?sessionId=${originalSessionId}` : ''}`);
  };
  
  // Format price with commas
  const formatPrice = (price: number): string => {
    return price.toLocaleString();
  };

  if (isLoading || !kioskOrderId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">결제 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-red-600 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">결제 진행</h1>
        </div>
      </header>

      <div className="flex-1 container mx-auto p-4">
        <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
              <p className="font-semibold">오류 발생</p>
              <p>{error}</p>
              <button 
                onClick={() => router.push(`/kiosk/${storeId}/checkout?sessionId=${originalSessionId}&deviceNumber=${originalDeviceNumber}`)}
                className="mt-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                주문 방법 다시 선택
              </button>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-2 text-center">{orderName}</h2>
          <div className="mb-6 text-center">
            <p className="text-gray-700 text-lg">결제할 금액:</p>
            <p className="text-3xl font-bold text-red-600">{formatPrice(totalAmountKRW)}원</p>
            <p className="text-sm text-gray-500">({formatPrice(totalAmountSGT)} SGT)</p>
          </div>

          <PortOnePayment
            storeId={process.env.NEXT_PUBLIC_PORTONE_STORE_ID || "store-e4038486-8d83-41a5-acf1-844a009e0d94"} // Use your actual PortOne store ID
            merchantUidFromCaller={kioskOrderId}
            orderName={orderName}
            totalAmount={totalAmountKRW}
            currency="KRW"
            redirectUrl={cleanRedirectUrl}
            customData={{
              kioskOrderId: kioskOrderId,
              totalAmountSGT: totalAmountSGT,
              orderType: orderType,
              originalSessionId: originalSessionId,
              originalDeviceNumber: originalDeviceNumber,
              storeId: storeId, // The app's internal storeId
            }}
            onPaymentComplete={handlePaymentSuccess}
            onPaymentFailed={handlePaymentFailure}
            onClose={handlePaymentModalClose}
            showModals={true}
          />
          
          {/* Add debug button for manual testing */}
          <div className="mt-4 p-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">디버깅 도구</p>
            <button
              onClick={() => {
                const successUrl = `/kiosk/${storeId}/success?orderId=${kioskOrderId}&orderType=${orderType}&sessionId=${originalSessionId}`;
                console.log(`[PaymentPage] Manual redirect to: ${successUrl}`);
                window.location.href = successUrl;
              }}
              className="w-full py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              수동으로 성공 페이지로 이동 (테스트)
            </button>
          </div>
          
          <button
            onClick={() => router.push(`/kiosk/${storeId}/checkout?sessionId=${originalSessionId}&deviceNumber=${originalDeviceNumber}`)}
            className="w-full mt-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            주문 방법 다시 선택 또는 취소
          </button>
          
          {/* Legal policy links */}
          <div className="mt-6 text-xs text-gray-500 text-center">
            <p>결제 진행 시 아래 정책에 동의하는 것으로 간주합니다:</p>
            <div className="flex justify-center mt-1 space-x-3">
              <Link href="/terms" target="_blank" className="hover:underline text-blue-600">이용약관</Link>
              <span>|</span>
              <Link href="/privacy" target="_blank" className="hover:underline text-blue-600">개인정보처리방침</Link>
              <span>|</span>
              <Link href="/return-policy" target="_blank" className="hover:underline text-blue-600">환불정책</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">페이지 로딩 중...</p>
        </div>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
} 