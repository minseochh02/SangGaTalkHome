'use client';

import { useEffect } from 'react';

// Define IMP type if PortOne provides type definitions, or use 'any'
declare global {
  interface Window {
    IMP?: any;
  }
}

interface PortonePaymentParams {
  pg?: string; // e.g., 'kakaopay', 'tosspayments.YOUR_STORE_ID_FROM_PORTONE_CONSOLE'
  pay_method: string; // 'card', 'trans', 'vbank', 'samsung', 'kakaopay', etc.
  merchant_uid: string; // Unique order ID from your system
  name: string; // Order/Product name
  amount: number; // Total amount
  buyer_email?: string;
  buyer_name?: string;
  buyer_tel?: string;
  m_redirect_url?: string; // For mobile redirects: e.g., /kiosk/[storeId]/payment/callback
  custom_data?: Record<string, any> | string; // Added custom_data
  // Add other necessary params like app_scheme etc.
}

interface PortonePaymentHandlerProps {
  storeId: string; // To construct redirect URLs or pass to backend
  paymentParams: Omit<PortonePaymentParams, 'pg' | 'm_redirect_url'>;
  onPaymentComplete: (response: any) => void; // Callback for when IMP.request_pay returns
  onPaymentError: (error: any) => void;
}

export default function PortonePaymentHandler({
  storeId,
  paymentParams,
  onPaymentComplete,
  onPaymentError,
}: PortonePaymentHandlerProps) {
  useEffect(() => {
    if (window.IMP) {
      window.IMP.init(process.env.NEXT_PUBLIC_PORTONE_STORE_ID);
    }
  }, []);

  const handlePayment = () => {
    if (!window.IMP) {
      console.error('PortOne SDK not loaded');
      onPaymentError({ error_msg: 'PortOne SDK not loaded' });
      return;
    }

    const fullParams: PortonePaymentParams = {
      pg: `kakaopay.${process.env.NEXT_PUBLIC_PORTONE_STORE_ID}`, // Example PG, configure as needed. Check PortOne docs for correct PG string.
      ...paymentParams,
      m_redirect_url: `${window.location.origin}/kiosk/${storeId}/payment/callback`, // Ensure this matches your callback page route
    };

    console.log('fullParams', fullParams);

    window.IMP.request_pay(fullParams, (rsp: any) => {
      if (rsp.success) {
        // Client-side success, but needs server verification
        onPaymentComplete(rsp);
      } else {
        onPaymentError(rsp);
      }
    });
  };

  return (
    <button
      onClick={handlePayment}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
    >
      결제하기 (Pay Now)
    </button>
  );
} 