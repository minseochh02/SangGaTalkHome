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
    const portoneStoreId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    console.log("[PortonePaymentHandler] Initializing PortOne with Store ID:", portoneStoreId);
    if (window.IMP && portoneStoreId) {
      window.IMP.init(portoneStoreId);
    } else if (!portoneStoreId) {
      console.error("[PortonePaymentHandler] Error: NEXT_PUBLIC_PORTONE_STORE_ID is not defined.");
    }
  }, []);

  const handlePayment = () => {
    const portoneStoreId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
    console.log("[PortonePaymentHandler] Attempting payment with Store ID:", portoneStoreId);
    console.log("[PortonePaymentHandler] Payment Params:", paymentParams);

    if (!window.IMP) {
      console.error('[PortonePaymentHandler] PortOne SDK (IMP) not loaded.');
      onPaymentError({ error_msg: 'PortOne SDK (IMP) not loaded.' });
      return;
    }
    if (!portoneStoreId) {
      console.error("[PortonePaymentHandler] Error during payment: NEXT_PUBLIC_PORTONE_STORE_ID is not defined.");
      onPaymentError({ error_msg: 'PortOne Store ID not configured.' });
      return;
    }

    const fullParams: PortonePaymentParams = {
      pg: 'kakaopay', // Simplified PG code for Kakaopay. Also try 'tosspayments' if that's your PG.
      ...paymentParams,
      m_redirect_url: `${window.location.origin}/kiosk/${storeId}/payment/callback`,
    };
    
    console.log("[PortonePaymentHandler] Requesting payment with full params:", fullParams);

    window.IMP.request_pay(fullParams, (rsp: any) => {
      if (rsp.success) {
        onPaymentComplete(rsp);
      } else {
        onPaymentError(rsp);
      }
    });
  };

  return (
    <button
      onClick={handlePayment}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg w-full transition-colors duration-150 ease-in-out"
    >
      결제하기 (Pay Now)
    </button>
  );
} 