'use client';

import React, { useState } from 'react';

// Import PortOne browser SDK with dynamic import to prevent SSR issues
let PortOne: any = null;

// Define component props interface
interface PortOnePaymentProps {
  storeId: string;
  channelKey: string;
  orderName: string;
  totalAmount: number;
  currency?: string;
  payMethod?: string;
  customData?: Record<string, any>;
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
  orderName,
  totalAmount,
  currency = 'KRW',
  payMethod = 'EASY_PAY',
  customData = {},
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

  // Generate a random payment ID
  function randomId() {
    const randomValues = crypto.getRandomValues(new Uint32Array(2));
    return Array.from(randomValues)
      .map((word) => word.toString(16).padStart(8, '0'))
      .join('');
  }

  const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setPaymentStatus({ status: 'PENDING' });
    
    // Ensure PortOne SDK is loaded
    const isLoaded = await ensurePortOneLoaded();
    if (!isLoaded) return;
    
    try {
      const paymentId = randomId();
      
      // Request payment using PortOne
      const payment = await PortOne.requestPayment({
        storeId,
        channelKey,
        paymentId,
        orderName,
        totalAmount,
        currency,
        payMethod,
        customData,
      });
      
      // Handle payment errors
      if (payment.code !== undefined) {
        setPaymentStatus({
          status: 'FAILED',
          message: payment.message,
        });
        if (onPaymentFailed) onPaymentFailed(payment);
        return;
      }
      
      // Complete the payment on the server
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
        if (onPaymentFailed) onPaymentFailed({ message: errorMessage });
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
        {isWaitingPayment ? '처리 중...' : buttonText}
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
          
          <dialog open={paymentStatus.status === 'PAID'}>
            <header>
              <h1>결제 성공</h1>
            </header>
            <p>결제에 성공했습니다.</p>
            <button type="button" onClick={handleClose}>
              닫기
            </button>
          </dialog>
        </>
      )}
    </>
  );
} 