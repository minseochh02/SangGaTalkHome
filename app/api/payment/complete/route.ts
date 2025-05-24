import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PaymentClient } from "@portone/server-sdk";
import { isUnrecognizedPayment, GetPaymentError } from "@portone/server-sdk/payment";

// Initialize PortOne Server SDK
const paymentApiClient = PaymentClient({
  secret: process.env.PORTONE_API_SECRET || 'YOUR_PORTONE_API_SECRET',
});

export async function POST(request: Request) {
  console.log("[Payment Complete API] Request received");
  const supabase = await createClient();
  let requestBody;
  try {
    requestBody = await request.json();
    console.log("[Payment Complete API] Request body:", requestBody);
  } catch (error) {
    console.error("[Payment Complete API] Invalid request body:", error);
    return NextResponse.json({ status: 'FAILED', message: 'Invalid request body.' }, { status: 400 });
  }

  const { paymentId, impUid } = requestBody;

  if (!paymentId || !impUid) {
    console.error("[Payment Complete API] Missing paymentId or impUid:", { paymentId, impUid });
    return NextResponse.json(
      { status: 'FAILED', message: 'Missing paymentId or impUid.' },
      { status: 400 }
    );
  }

  const kioskOrderId = paymentId;
  console.log(`[Payment Complete API] Processing payment for order: ${kioskOrderId}, impUid: ${impUid}`);

  try {
    const portOnePayment = await paymentApiClient.getPayment({ paymentId: impUid });

    if (isUnrecognizedPayment(portOnePayment)) {
      console.error(`[PortOne API] Unrecognized payment response for imp_uid: ${impUid}`, portOnePayment);
      return NextResponse.json(
        { status: 'FAILED', message: 'PortOne에서 인식할 수 없는 결제 응답을 받았습니다.' },
        { status: 500 }
      );
    }
    
    // Accessing properties after type guard
    const amountPaid = portOnePayment.amount.total;
    const paymentStatusPortOne = portOnePayment.status;
    const paymentStatusString = String(paymentStatusPortOne);

    const { data: kioskOrder, error: orderError } = await supabase
      .from('kiosk_orders')
      .select('kiosk_order_id, total_amount_krw, status') // Selected kiosk_order_id for clarity, though id was okay here if it worked
      .eq('kiosk_order_id', kioskOrderId) // Corrected to use kiosk_order_id
      .single();

    if (orderError || !kioskOrder) {
      console.error(
        `[Supabase] Order not found for kioskOrderId: ${kioskOrderId}, Error: ${orderError?.message}`
      );
      return NextResponse.json(
        { status: 'FAILED', message: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    if (kioskOrder.status === 'completed') {
      console.log(`[Payment Complete API] Order ${kioskOrderId} already completed`);
      return NextResponse.json(
        { status: 'PAID', message: '이미 처리된 주문입니다.', orderId: kioskOrderId },
        { status: 200 }
      );
    }
    if (kioskOrder.status === 'failed') {
       return NextResponse.json(
         { status: 'FAILED', message: '이미 실패 처리된 주문입니다.', orderId: kioskOrderId },
         { status: 200 }
       );
    }

    const amountToBePaid = kioskOrder.total_amount_krw;

    if (paymentStatusString === 'PAID' && amountPaid === amountToBePaid) {
      console.log(`[Payment Complete API] Payment verified for order ${kioskOrderId}: ${amountPaid}`);
      const { error: updateError } = await supabase
        .from('kiosk_orders')
        .update({
          status: 'completed',
          portone_imp_uid: impUid,
          payment_provider_details: portOnePayment, 
          paid_at: new Date().toISOString(),
        })
        .eq('kiosk_order_id', kioskOrderId); // Corrected to use kiosk_order_id

      if (updateError) {
        console.error(
          `[Supabase] Failed to update order ${kioskOrderId} to completed: ${updateError.message}`
        );
        return NextResponse.json(
          { status: 'FAILED', message: '결제는 성공했으나 주문 상태 업데이트에 실패했습니다. 관리자에게 문의하세요.' },
          { status: 500 }
        );
      }
      console.log(`[Payment Complete API] Order ${kioskOrderId} updated to completed, returning PAID status`);
      return NextResponse.json(
        { status: 'PAID', message: '결제가 성공적으로 완료되었습니다.', orderId: kioskOrderId },
        { status: 200 }
      );
    } else {
      let failureReason = `결제 실패 (PortOne 상태: ${paymentStatusString})`;
      if (amountPaid !== amountToBePaid) {
        failureReason = `결제 금액 불일치 (PortOne: ${amountPaid}, 주문: ${amountToBePaid}), PortOne 상태: ${paymentStatusString}`;
      }
      console.error(`[Payment Verification Failed] Order ${kioskOrderId}: ${failureReason}`);
      
      const { error: updateError } = await supabase
        .from('kiosk_orders')
        .update({
          status: 'failed',
          portone_imp_uid: impUid,
          payment_provider_details: portOnePayment,
        })
        .eq('kiosk_order_id', kioskOrderId); // Corrected to use kiosk_order_id

      if (updateError) {
        console.error(
          `[Supabase] Failed to update order ${kioskOrderId} to failed: ${updateError.message}`
        );
      }
      return NextResponse.json(
        { status: 'FAILED', message: failureReason, orderId: kioskOrderId },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Payment Complete API Error]', error);
    let errorMessage = '결제 처리 중 서버 오류가 발생했습니다.';
    if (error instanceof GetPaymentError) {
        errorMessage = `PortOne 오류: ${String(error.data.type)} - ${error.message}`;
    } else if (error.response && error.response.data && error.response.data.message) {
      errorMessage = error.response.data.message;
    }
    return NextResponse.json(
      { status: 'FAILED', message: errorMessage, details: error.message },
      { status: 500 }
    );
  }
} 