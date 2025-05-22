'use client';

import { useSearchParams, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const params = useParams(); // To get storeId if needed for UI/links

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    const imp_uid = searchParams.get('imp_uid');
    const merchant_uid = searchParams.get('merchant_uid');
    const imp_success = searchParams.get('imp_success'); // From PortOne's client-side callback or your manual redirect
    const error_msg = searchParams.get('error_msg');

    if (imp_success === 'false' && error_msg) {
        setStatus('error');
        setMessage(`결제 초기화 실패 (Payment initiation failed): ${decodeURIComponent(error_msg)}`);
        return;
    }
    
    if (!imp_uid || !merchant_uid) {
      setStatus('error');
      setMessage('잘못된 접근입니다. 결제 정보가 누락되었습니다. (Invalid payment information.)');
      return;
    }

    // Optional: Get amount from your frontend state/DB to pass to backend for verification
    // This requires a way to securely retrieve the expected amount for `merchant_uid`
    // For example, you might have stored it in localStorage before redirecting, or fetch it from your DB.
    // const amount_to_check = parseFloat(localStorage.getItem(`order_amount_${merchant_uid}`) || '0');
    // if (amount_to_check > 0) {
    //   localStorage.removeItem(`order_amount_${merchant_uid}`); // Clean up
    // }

    fetch('/api/portone/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imp_uid, merchant_uid /*, amount_to_check: amount_to_check > 0 ? amount_to_check : undefined */ }),
    })
      .then((res) => res.json())
      .then((data) => {
        setPaymentDetails(data.payment); // Store payment details regardless of verification outcome for potential display
        if (data.verified) {
          setStatus('success');
          setMessage(data.message || '결제가 성공적으로 완료되었습니다. (Payment successful!)');
        } else {
          setStatus('error');
          setMessage(data.message || '결제 검증에 실패했습니다. (Payment verification failed.)');
        }
      })
      .catch((err) => {
        console.error('Verification request failed:', err);
        setStatus('error');
        setMessage('결제 검증 중 오류가 발생했습니다. (Error during payment verification.)');
      });
  }, [searchParams, params]);

  if (status === 'loading') {
    return <div className="flex justify-center items-center min-h-screen">결제 상태를 확인 중입니다... (Verifying payment status...)</div>;
  }

  const storeId = params.storeId as string; // Type assertion if you are sure it exists

  return (
    <div className="container mx-auto p-4 text-center">
      <h1 className="text-2xl font-bold mb-4">결제 결과 (Payment Result)</h1>
      {status === 'success' ? (
        <div className="p-4 bg-green-100 text-green-700 rounded">
          <p className="text-xl">✅ {message}</p>
          {/* You might want to display some payment details here from `paymentDetails` */}
          {/* e.g., <p>주문번호: {paymentDetails?.merchant_uid}</p> */}
          {/* <p>결제금액: {paymentDetails?.amount?.total}</p> */}
        </div>
      ) : (
        <div className="p-4 bg-red-100 text-red-700 rounded">
          <p className="text-xl">❌ {message}</p>
          {/* Offer to retry or contact support */}
        </div>
      )}
      <div className="mt-6">
        {storeId ? (
            <a href={`/kiosk/${storeId}`} className="text-blue-500 hover:text-blue-700">
                상점으로 돌아가기 (Back to Store)
            </a>
        ) : (
            <a href={`/`} className="text-blue-500 hover:text-blue-700">
                홈으로 돌아가기 (Back to Home)
            </a>
        )}
      </div>
    </div>
  );
} 