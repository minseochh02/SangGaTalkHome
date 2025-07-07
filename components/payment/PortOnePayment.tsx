'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Import PortOne browser SDK with dynamic import to prevent SSR issues
let PortOne: any = null;

// Define component props interface
interface PortOnePaymentProps {
  storeId: string;
  merchantUidFromCaller?: string;
  orderName: string;
  totalAmount: number;
  currency?: string;
  customData?: Record<string, any>;
  redirectUrl?: string;
  onPaymentComplete?: (response: any) => void;
  onPaymentFailed?: (error: any) => void;
  onClose?: () => void;
  buttonText?: string;
  buttonClassName?: string;
  showModals?: boolean;
  // Add customer information for Inicis requirements
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export default function PortOnePayment({
  storeId,
  merchantUidFromCaller,
  orderName,
  totalAmount,
  currency = 'KRW',
  customData = {},
  redirectUrl,
  onPaymentComplete,
  onPaymentFailed,
  onClose,
  buttonText = '카드 결제하기',
  buttonClassName = '',
  showModals = true,
  customerName,
  customerEmail,
  customerPhone,
}: PortOnePaymentProps) {
  const [paymentStatus, setPaymentStatus] = useState<{
    status: 'IDLE' | 'PENDING' | 'PAID' | 'FAILED';
    message?: string;
  }>({
    status: 'IDLE',
  });

  const router = useRouter();
  const searchParams = useSearchParams();

  // Load the PortOne SDK dynamically
  const ensurePortOneLoaded = async () => {
    if (!PortOne) {
      try {
        const PortOneModule = await import('@portone/browser-sdk/v2');
        PortOne = PortOneModule.default;
        return true;
      } catch (error) {
        console.error('Failed to load PortOne SDK:', error);
        setPaymentStatus({
          status: 'FAILED',
          message: '결제 모듈을 불러오는데 실패했습니다.',
        });
        if (onPaymentFailed) onPaymentFailed({ message: '결제 모듈을 불러오는데 실패했습니다.' });
        return false;
      }
    }
    return true;
  };

  // Effect to handle redirect from PortOne
  useEffect(() => {
    const merchantUid = searchParams.get('merchant_uid');
    const impSuccess = searchParams.get('imp_success');
    const impUid = searchParams.get('imp_uid');
    const errorMsg = searchParams.get('error_msg');

    if (merchantUid && impSuccess !== null) {
      console.log(`[PortOnePayment] Detected return from redirect. merchant_uid: ${merchantUid}, imp_success: ${impSuccess}, imp_uid: ${impUid}, error_msg: ${errorMsg}`);
      
      // Clean up URL without triggering another navigation
      const currentPath = window.location.pathname;
      const existingParams = new URLSearchParams(window.location.search);
      existingParams.delete('merchant_uid');
      existingParams.delete('imp_success');
      existingParams.delete('imp_uid');
      existingParams.delete('error_msg');
      const newQueryString = existingParams.toString();
      
      // Use history.replaceState to clean URL without causing navigation
      if (typeof window !== 'undefined') {
        const newUrl = `${currentPath}${newQueryString ? `?${newQueryString}` : ''}`;
        window.history.replaceState({}, '', newUrl);
      }

      if (impSuccess === 'true') {
        setPaymentStatus({ status: 'PENDING', message: '결제 확인 중...' });
        const requestBody = { paymentId: merchantUid, impUid: impUid };
        console.log(`[PortOnePayment] Redirect successful. Verifying payment. Sending to /api/payment/complete:`, JSON.stringify(requestBody));
        
        fetch('/api/payment/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        })
        .then(async (res) => {
          const responseBodyText = await res.text(); // Read body once as text
          console.log(`[PortOnePayment] Verification response status: ${res.status}, Body: ${responseBodyText}`);

          if (res.ok) {
            try {
              const paymentComplete = JSON.parse(responseBodyText);
              console.log(`[PortOnePayment] Payment verification JSON parsed:`, paymentComplete);
              setPaymentStatus({ status: paymentComplete.status });
              
              if (onPaymentComplete) {
                console.log(`[PortOnePayment] Calling onPaymentComplete after redirect with status: ${paymentComplete.status}`);
                setTimeout(() => {
                  onPaymentComplete({...paymentComplete, paymentId: merchantUid});
                }, 100);
              }
            } catch (parseError) {
              console.error('[PortOnePayment] Error parsing JSON response from /api/payment/complete:', parseError, 'Raw body:', responseBodyText);
              setPaymentStatus({ status: 'FAILED', message: '결제 확인 응답 처리 오류.' });
              if (onPaymentFailed) onPaymentFailed({ message: '결제 확인 응답 처리 오류.', paymentId: merchantUid, rawResponse: responseBodyText });
            }
          } else {
            console.error(`[PortOnePayment] Error verifying payment after redirect. Status: ${res.status}. Response: ${responseBodyText}`);
            setPaymentStatus({ status: 'FAILED', message: `결제 확인 실패 (상태: ${res.status})` });
            if (onPaymentFailed) onPaymentFailed({ message: `결제 확인 실패: ${responseBodyText}`, paymentId: merchantUid, status: res.status });
          }
        })
        .catch((err) => {
          console.error(`[PortOnePayment] Network or other exception verifying payment after redirect:`, err);
          setPaymentStatus({ status: 'FAILED', message: err.message || '리디렉션 후 결제 확인 중 네트워크 오류가 발생했습니다.' });
          if (onPaymentFailed) onPaymentFailed({ error: err, paymentId: merchantUid });
        });
      } else {
        console.error(`[PortOnePayment] Redirect indicates payment failure:`, errorMsg);
        setPaymentStatus({ status: 'FAILED', message: errorMsg || '리디렉션 후 결제가 실패 처리되었습니다.' });
        if (onPaymentFailed) onPaymentFailed({ message: errorMsg || '결제 실패', paymentId: merchantUid });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function randomId() {
    const randomValues = crypto.getRandomValues(new Uint32Array(2));
    return Array.from(randomValues)
      .map((word) => word.toString(16).padStart(8, '0'))
      .join('');
  }

  const handleCardPayment = async () => {
    setPaymentStatus({ status: 'PENDING' });
    
    const isLoaded = await ensurePortOneLoaded();
    if (!isLoaded) return;
    
    // Validate environment variables
    const channelKey = process.env.NEXT_PUBLIC_PORTONE_INICIS_CHANNEL_KEY;
    if (!channelKey) {
              console.error("NEXT_PUBLIC_PORTONE_INICIS_CHANNEL_KEY is not defined in environment variables.");
        setPaymentStatus({ status: 'FAILED', message: '이니시스 채널 키가 설정되지 않았습니다.' });
        if (onPaymentFailed) onPaymentFailed({ message: '이니시스 채널 키가 설정되지 않았습니다.' });
      return;
    }
    
    try {
      const paymentIdForPortOne = merchantUidFromCaller || randomId();
      console.log(`[PortOnePayment] Initiating card payment with PortOne Payment ID (merchant_uid): ${paymentIdForPortOne}`);
      console.log(`[PortOnePayment] Using Channel Key: ${channelKey}`);
      console.log(`[PortOnePayment] Payment Method: CARD`);
      console.log(`[PortOnePayment] PG Provider: inicis_v2`);
      
      // Validate required parameters for KG이니시스
      const validatedCustomerName = customerName || customData?.customerName || "테스트 고객";
      const validatedCustomerEmail = customerEmail || customData?.customerEmail || "test@example.com";
      const validatedCustomerPhone = customerPhone || customData?.customerPhone || "01012345678";

      // KG이니시스 requires customer information for PC payments
      if (!validatedCustomerName || !validatedCustomerEmail || !validatedCustomerPhone) {
        console.error("[PortOnePayment] Missing required customer information for KG이니시스");
        setPaymentStatus({
          status: 'FAILED',
          message: 'KG이니시스 결제에는 고객 정보(이름, 이메일, 전화번호)가 필요합니다.',
        });
        if (onPaymentFailed) onPaymentFailed({ 
          message: 'KG이니시스 결제에는 고객 정보(이름, 이메일, 전화번호)가 필요합니다.',
          code: 'MISSING_CUSTOMER_INFO'
        });
        return;
      }

      const requestPayload: any = {
        storeId,
        channelKey,
        paymentId: paymentIdForPortOne,
        orderName,
        totalAmount,
        currency,
        payMethod: 'CARD', // KG이니시스 card payment
        customData,
        // Required customer information for KG이니시스 (PC payments require these fields)
        customer: {
          fullName: validatedCustomerName,
          email: validatedCustomerEmail,
          phoneNumber: validatedCustomerPhone
        }
      };

      // Log the full request payload for debugging
      console.log(`[PortOnePayment] Full request payload:`, JSON.stringify(requestPayload, null, 2));

      if (redirectUrl) {
        requestPayload.redirectUrl = redirectUrl;
      }
      
      const payment = await PortOne.requestPayment(requestPayload);
      console.log(`[PortOnePayment] PortOne response:`, payment);
      
      if (payment.code !== undefined) {
        console.error(`[PortOnePayment] Payment failed with code: ${payment.code}, message: ${payment.message}`);
        
        // Provide specific guidance for common errors
        let errorMessage = payment.message;
        if (payment.code === 'INVALID_REQUEST') {
          if (payment.message && payment.message.includes('channel')) {
            errorMessage = `채널 설정 오류: ${payment.message}. 포트원 콘솔에서 KG이니시스 채널이 올바르게 설정되었는지 확인하세요.`;
          } else if (payment.message && payment.message.includes('payMethod')) {
            errorMessage = `결제수단 오류: ${payment.message}. 채널이 CARD 결제를 지원하는지 확인하세요.`;
          } else {
            errorMessage = `요청 파라미터 오류: ${payment.message}. 필수 정보가 누락되었거나 잘못된 형식입니다.`;
          }
        }
        
        setPaymentStatus({
          status: 'FAILED',
          message: errorMessage,
        });
        if (onPaymentFailed) onPaymentFailed({...payment, detailedMessage: errorMessage});
        return;
      }
      
      if (!redirectUrl || (payment && payment.success === true && !payment.code)) {
         setPaymentStatus({ status: 'PENDING', message: '결제 확인 중...' });
         // PortOne V2 uses transactionId instead of imp_uid
         const requestBody = { 
           paymentId: payment.paymentId, 
           impUid: payment.transactionId || payment.imp_uid  // V2 uses transactionId, fallback to imp_uid for V1
         };
         console.log(`[PortOnePayment] Non-redirect flow. Verifying payment. Sending to /api/payment/complete:`, JSON.stringify(requestBody));
         
         const completeResponse = await fetch('/api/payment/complete', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify(requestBody),
         });

         const responseBodyText = await completeResponse.text();
         console.log(`[PortOnePayment] Non-redirect verification response status: ${completeResponse.status}, Body: ${responseBodyText}`);
         
         if (completeResponse.ok) {
           try {
             const paymentComplete = JSON.parse(responseBodyText);
             console.log(`[PortOnePayment] Non-redirect payment verification JSON parsed:`, paymentComplete);
             setPaymentStatus({
               status: paymentComplete.status,
             });
             if (onPaymentComplete) {
               console.log(`[PortOnePayment] Calling onPaymentComplete (non-redirect) with status: ${paymentComplete.status}`);
               onPaymentComplete({...paymentComplete, paymentId: payment.paymentId});
             }
           } catch (parseError) {
             console.error('[PortOnePayment] Error parsing JSON response from /api/payment/complete (non-redirect):', parseError, 'Raw body:', responseBodyText);
             setPaymentStatus({ status: 'FAILED', message: '결제 확인 응답 처리 오류 (non-redirect).' });
             if (onPaymentFailed) onPaymentFailed({ message: '결제 확인 응답 처리 오류 (non-redirect).', paymentId: payment.paymentId, rawResponse: responseBodyText });
           }
         } else {
           console.error(`[PortOnePayment] Error verifying payment (non-redirect). Status: ${completeResponse.status}. Response: ${responseBodyText}`);
           setPaymentStatus({
             status: 'FAILED',
             message: `결제 확인 실패 (상태: ${completeResponse.status})`,
           });
           if (onPaymentFailed) onPaymentFailed({ message: `결제 확인 실패: ${responseBodyText}`, paymentId: payment.paymentId, status: completeResponse.status });
         }
      } else if (payment && payment.success === false && payment.message) {
        setPaymentStatus({
          status: 'FAILED',
          message: payment.message,
        });
        if (onPaymentFailed) onPaymentFailed(payment);
      }

    } catch (error: any) {
      console.error(`[PortOnePayment] Exception during payment:`, error);
      setPaymentStatus({
        status: 'FAILED',
        message: error.message || '결제 중 오류가 발생했습니다.',
      });
      if (onPaymentFailed) onPaymentFailed(error);
    }
  };

  const isWaitingPayment = paymentStatus.status === 'PENDING';

  const handleClose = () => {
    setPaymentStatus({ status: 'IDLE' });
    if (onClose) onClose();
  };

  return (
    <div className="space-y-3 relative">
      {/* Loading overlay during payment processing */}
      {paymentStatus.status === 'PENDING' && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex flex-col items-center justify-center z-10 rounded-md">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-purple-600 mb-4"></div>
          <p className="text-lg font-semibold text-gray-700 mb-2">카드 결제 진행 중입니다</p>
          <p className="text-sm text-gray-500 text-center px-4">
            {paymentStatus.message || '잠시만 기다려주세요. 결제가 완료될 때까지 이 창을 닫지 마세요.'}
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleCardPayment}
        aria-busy={paymentStatus.status === 'PENDING'}
        disabled={paymentStatus.status === 'PENDING'}
        className={`${buttonClassName || "w-full py-3 bg-purple-500 text-white font-bold rounded-md hover:bg-purple-600 text-lg"} ${
          paymentStatus.status === 'PENDING' ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {paymentStatus.status === 'PENDING' ? '카드 결제 진행 중...' : buttonText}
      </button>

      {showModals && (
        <>
          {paymentStatus.status === 'FAILED' && (
            <dialog open>
              <header>
                <h1>결제 실패</h1>
              </header>
              <p>{paymentStatus.message}</p>
              <button type="button" onClick={handleClose}>
                닫기
              </button>
            </dialog>
          )}
          
          {paymentStatus.status === 'PAID' && (
            <dialog open={paymentStatus.status === 'PAID'}>
              <header>
                <h1>결제 성공</h1>
              </header>
              <p>카드 결제에 성공했습니다.</p>
              <button type="button" onClick={handleClose}>
                닫기
              </button>
            </dialog>
          )}
        </>
      )}
    </div>
  );
} 