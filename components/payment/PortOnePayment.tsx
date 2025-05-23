'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Import PortOne browser SDK with dynamic import to prevent SSR issues
let PortOne: any = null;

// Define component props interface
interface PortOnePaymentProps {
  storeId: string;
  channelKey: string;
  merchantUidFromCaller?: string;
  orderName: string;
  totalAmount: number;
  currency?: string;
  payMethod?: string;
  customData?: Record<string, any>;
  redirectUrl?: string;
  onPaymentComplete?: (response: any) => void;
  onPaymentFailed?: (error: any) => void;
  onClose?: () => void;
  buttonText?: string;
  buttonClassName?: string;
  showModals?: boolean;
}

export default function PortOnePayment({
  storeId,
  channelKey,
  merchantUidFromCaller,
  orderName,
  totalAmount,
  currency = 'KRW',
  payMethod = 'EASY_PAY',
  customData = {},
  redirectUrl,
  onPaymentComplete,
  onPaymentFailed,
  onClose,
  buttonText = '결제하기',
  buttonClassName = '',
  showModals = true,
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
      const currentPath = window.location.pathname;
      const existingParams = new URLSearchParams(window.location.search);
      existingParams.delete('merchant_uid');
      existingParams.delete('imp_success');
      existingParams.delete('imp_uid');
      existingParams.delete('error_msg');
      const newQueryString = existingParams.toString();
      router.replace(`${currentPath}${newQueryString ? `?${newQueryString}` : ''}`);

      if (impSuccess === 'true') {
        setPaymentStatus({ status: 'PENDING', message: '결제 확인 중...' });
        fetch('/api/payment/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentId: merchantUid, impUid: impUid }),
        })
        .then(async (res) => {
          if (res.ok) {
            const paymentComplete = await res.json();
            setPaymentStatus({ status: paymentComplete.status });
            if (onPaymentComplete) onPaymentComplete({...paymentComplete, paymentId: merchantUid});
          } else {
            const errorMessage = await res.text();
            setPaymentStatus({ status: 'FAILED', message: errorMessage });
            if (onPaymentFailed) onPaymentFailed({ message: errorMessage, paymentId: merchantUid });
          }
        })
        .catch((err) => {
          setPaymentStatus({ status: 'FAILED', message: err.message || '리디렉션 후 결제 확인에 실패했습니다.' });
          if (onPaymentFailed) onPaymentFailed({ error: err, paymentId: merchantUid });
        });
      } else {
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

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setPaymentStatus({ status: 'PENDING' });
    
    const isLoaded = await ensurePortOneLoaded();
    if (!isLoaded) return;
    
    try {
      const paymentId = merchantUidFromCaller || randomId();
      
      const requestPayload: any = {
        storeId,
        channelKey,
        paymentId,
        orderName,
        totalAmount,
        currency,
        payMethod,
        customData,
      };

      if (redirectUrl) {
        requestPayload.redirectUrl = redirectUrl;
      }
      
      const payment = await PortOne.requestPayment(requestPayload);
      
      if (payment.code !== undefined) {
        setPaymentStatus({
          status: 'FAILED',
          message: payment.message,
        });
        if (onPaymentFailed) onPaymentFailed(payment);
        return;
      }
      
      if (!redirectUrl || (payment && payment.success === true && !payment.code)) {
         setPaymentStatus({ status: 'PENDING', message: '결제 확인 중...' });
         const completeResponse = await fetch('/api/payment/complete', {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
           },
           body: JSON.stringify({
             paymentId: payment.paymentId,
           }),
         });
         
         if (completeResponse.ok) {
           const paymentComplete = await completeResponse.json();
           setPaymentStatus({
             status: paymentComplete.status,
           });
           if (onPaymentComplete) onPaymentComplete({...paymentComplete, paymentId: payment.paymentId});
         } else {
           const errorMessage = await completeResponse.text();
           setPaymentStatus({
             status: 'FAILED',
             message: errorMessage,
           });
           if (onPaymentFailed) onPaymentFailed({ message: errorMessage, paymentId: payment.paymentId });
         }
      } else if (payment && payment.success === false && payment.message) {
        setPaymentStatus({
          status: 'FAILED',
          message: payment.message,
        });
        if (onPaymentFailed) onPaymentFailed(payment);
      }

    } catch (error: any) {
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
    <>
      <button
        type="button"
        onClick={handleSubmit}
        aria-busy={isWaitingPayment}
        disabled={isWaitingPayment}
        className={buttonClassName}
      >
        {isWaitingPayment ? '처리 중...' : paymentStatus.status === 'PENDING' && paymentStatus.message ? paymentStatus.message : buttonText}
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
              <p>결제에 성공했습니다.</p>
              <button type="button" onClick={handleClose}>
                닫기
              </button>
            </dialog>
          )}
        </>
      )}
    </>
  );
} 