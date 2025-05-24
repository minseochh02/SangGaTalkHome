import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { PaymentClient } from "@portone/server-sdk";
import { isUnrecognizedPayment, GetPaymentError } from "@portone/server-sdk/payment";

// Initialize PortOne Server SDK
const paymentApiClient = PaymentClient({
  secret: process.env.PORTONE_API_SECRET || 'YOUR_PORTONE_API_SECRET',
});

export async function POST(request: Request) {
  console.log("[Payment Complete API] Request received at", new Date().toISOString());
  const supabase = await createClient();
  let requestBody;
  try {
    requestBody = await request.json();
    console.log("[Payment Complete API] Request body:", JSON.stringify(requestBody, null, 2));
  } catch (error) {
    console.error("[Payment Complete API] Invalid request body:", error);
    return NextResponse.json({ status: 'FAILED', message: 'Invalid request body.' }, { status: 400 });
  }

  const { paymentId, impUid } = requestBody; // paymentId is our kioskOrderId, impUid is PortOne's transaction ID

  if (!paymentId) {
    console.error("[Payment Complete API] Missing paymentId (kioskOrderId) in request body");
    return NextResponse.json(
      { status: 'FAILED', message: 'Missing paymentId (kioskOrderId).' },
      { status: 400 }
    );
  }
  if (!impUid) {
    console.error("[Payment Complete API] Missing impUid (PortOne transaction ID) in request body for kioskOrderId:", paymentId);
    // Decide if this is a critical failure. For some flows, impUid might be retrieved differently,
    // but for PortOne direct payment completion, it should be there.
    // For now, let's flag it but proceed if other checks pass, though it's risky.
    // Ideally, impUid should always be present here if coming from PortOnePayment.tsx success callback.
    // Consider returning an error if impUid is strictly required by your logic here.
    // For now, just log and proceed to see if PortOne can find it with just paymentId (merchant_uid)
    // This is unlikely for `getPayment` which usually requires `imp_uid`.
  }

  const kioskOrderId = paymentId;
  console.log(`[Payment Complete API] Processing payment for kioskOrderId: ${kioskOrderId}, PortOne impUid: ${impUid}`);

  try {
    console.log(`[Payment Complete API] Attempting to fetch payment from PortOne with impUid: ${impUid}`);
    const portOnePayment = await paymentApiClient.getPayment({ paymentId: impUid }); // paymentId here is PortOne's SDK param name for imp_uid
    console.log("[Payment Complete API] PortOne getPayment response:", JSON.stringify(portOnePayment, null, 2));

    if (isUnrecognizedPayment(portOnePayment)) {
      console.error(`[PortOne API] Unrecognized payment response for imp_uid: ${impUid}`, portOnePayment);
      return NextResponse.json(
        { status: 'FAILED', message: 'PortOne에서 인식할 수 없는 결제 응답을 받았습니다.' },
        { status: 500 }
      );
    }
    
    const amountPaid = portOnePayment.amount.total;
    const paymentStatusPortOne = portOnePayment.status;
    const paymentStatusString = String(paymentStatusPortOne);
    console.log(`[Payment Complete API] PortOne payment details - Amount: ${amountPaid}, Status: ${paymentStatusString}, imp_uid (from PortOne response): ${portOnePayment.id}`);

    const { data: kioskOrder, error: orderError } = await supabase
      .from('kiosk_orders')
      .select('kiosk_order_id, total_amount_krw, status')
      .eq('kiosk_order_id', kioskOrderId)
      .single();

    if (orderError || !kioskOrder) {
      console.error(
        `[Supabase] Order not found for kioskOrderId: ${kioskOrderId}. Error: ${orderError?.message}`
      );
      return NextResponse.json(
        { status: 'FAILED', message: '주문 정보를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }
    console.log(`[Supabase] Found order for ${kioskOrderId}. Current DB status: ${kioskOrder.status}, Expected KRW: ${kioskOrder.total_amount_krw}`);

    if (kioskOrder.status === 'completed') {
      console.log(`[Payment Complete API] Order ${kioskOrderId} already marked as completed in DB.`);
      return NextResponse.json(
        { status: 'PAID', message: '이미 처리된 주문입니다.', orderId: kioskOrderId },
        { status: 200 }
      );
    }
    if (kioskOrder.status === 'failed') {
       console.log(`[Payment Complete API] Order ${kioskOrderId} already marked as failed in DB.`);
       return NextResponse.json(
         { status: 'FAILED', message: '이미 실패 처리된 주문입니다.', orderId: kioskOrderId },
         { status: 200 }
       );
    }

    const amountToBePaid = kioskOrder.total_amount_krw;

    if (paymentStatusString === 'PAID' && amountPaid === amountToBePaid) {
      console.log(`[Payment Complete API] Payment VERIFIED for order ${kioskOrderId}. PortOne paid: ${amountPaid}, Expected: ${amountToBePaid}. Attempting DB update.`);
      const updatePayload = {
        status: 'completed',
        portone_imp_uid: portOnePayment.id, // Use imp_uid from PortOne's response as the source of truth
        payment_provider_details: portOnePayment,
        paid_at: new Date().toISOString(),
      };
      console.log("[Payment Complete API] Supabase update payload:", JSON.stringify(updatePayload, null, 2));

      const { data: updateData, error: updateError } = await supabase
        .from('kiosk_orders')
        .update(updatePayload)
        .eq('kiosk_order_id', kioskOrderId)
        .select(); // Add select() to get the updated rows back

      if (updateError) {
        console.error(
          `[Supabase] FAILED to update order ${kioskOrderId} to completed. Error: ${updateError.message}`,
          updateError
        );
        return NextResponse.json(
          { status: 'FAILED', message: '결제는 성공했으나 주문 상태 업데이트에 실패했습니다. 관리자에게 문의하세요.' },
          { status: 500 }
        );
      }
      console.log(`[Supabase] Order ${kioskOrderId} successfully updated to completed. Update response:`, JSON.stringify(updateData, null, 2));
      return NextResponse.json(
        { status: 'PAID', message: '결제가 성공적으로 완료되었습니다.', orderId: kioskOrderId },
        { status: 200 }
      );
    } else {
      let failureReason = `결제 실패 (PortOne 상태: ${paymentStatusString})`;
      if (amountPaid !== amountToBePaid) {
        failureReason = `결제 금액 불일치 (PortOne: ${amountPaid}, 주문: ${amountToBePaid}), PortOne 상태: ${paymentStatusString}`;
      }
      console.warn(`[Payment VERIFICATION FAILED] Order ${kioskOrderId}: ${failureReason}. PortOne imp_uid was: ${portOnePayment.id}`);
      
      const failUpdatePayload = {
        status: 'failed',
        portone_imp_uid: portOnePayment.id, // Still store imp_uid for reference
        payment_provider_details: portOnePayment, 
      };
      console.log("[Payment Complete API] Supabase failure update payload:", JSON.stringify(failUpdatePayload, null, 2));

      const { data: failUpdateData, error: failUpdateSupabaseError } = await supabase
        .from('kiosk_orders')
        .update(failUpdatePayload)
        .eq('kiosk_order_id', kioskOrderId)
        .select(); // Add select() for consistency

      if (failUpdateSupabaseError) {
        console.error(
          `[Supabase] FAILED to update order ${kioskOrderId} to failed status. Error: ${failUpdateSupabaseError.message}`,
          failUpdateSupabaseError
        );
      }
       console.log(`[Supabase] Order ${kioskOrderId} updated to FAILED. Update response:`, JSON.stringify(failUpdateData, null, 2));
      return NextResponse.json(
        { status: 'FAILED', message: failureReason, orderId: kioskOrderId },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[Payment Complete API] CRITICAL ERROR in try-catch block:', error);
    if (error.response && error.response.data) {
      console.error('[Payment Complete API] PortOne Error Data:', JSON.stringify(error.response.data, null, 2));
    }
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