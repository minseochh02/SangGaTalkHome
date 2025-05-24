import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Import PortOne Webhook verification - uncomment when implementing actual verification
// import { Webhook } from '@portone/server-sdk';

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body
    const rawBody = await request.text();
    
    // Get the request headers
    const headers = Object.fromEntries(request.headers);

    // In production, verify the webhook signature
    // This is a simplified example - you would use the PortOne SDK
    /*
    try {
      const webhook = await Webhook.verify(
        process.env.PORTONE_WEBHOOK_SECRET!,
        rawBody,
        headers
      );
      
      // webhook is now verified and safe to use
    } catch (e) {
      console.error('Webhook verification failed:', e);
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
    */

    // Parse the webhook data
    let webhook;
    try {
      webhook = JSON.parse(rawBody);
    } catch (e) {
      console.error('Failed to parse webhook payload:', e);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    console.log('Received payment webhook:', webhook);

    // PortOne's unique transaction ID is likely in webhook.tx_id or webhook.imp_uid
    // Your merchant_uid (kiosk_order_id) is in webhook.payment_id
    const portoneTransactionId = webhook.tx_id; // Use tx_id from your log
    const merchantOrderId = webhook.payment_id; // This is your kiosk_order_id

    if (portoneTransactionId && merchantOrderId) {
      const supabase = await createClient();
      console.log(`[Webhook] Processing: PortOne TX ID (imp_uid): ${portoneTransactionId}, Merchant Order ID (kiosk_order_id): ${merchantOrderId}`);

      // Option 1: Find order by PortOne Transaction ID (if you are reliably storing it from /api/payment/complete)
      let { data: orderData, error: orderError } = await supabase
        .from('kiosk_orders')
        .select('kiosk_order_id, status, portone_imp_uid')
        .eq('portone_imp_uid', portoneTransactionId)
        .maybeSingle();

      if (orderError) {
        console.error(`[Webhook] Error finding order by portone_imp_uid ${portoneTransactionId}:`, orderError.message);
        // Don't return yet, try finding by merchantOrderId as a fallback
      }

      if (orderData) {
        console.log(`[Webhook] Found order by portone_imp_uid: ${orderData.kiosk_order_id}, Current status: ${orderData.status}`);
      } else {
        // Option 2: Fallback or primary find by Merchant Order ID (your kiosk_order_id)
        console.log(`[Webhook] Order not found by portone_imp_uid ${portoneTransactionId}. Trying by merchant_order_id (kiosk_order_id): ${merchantOrderId}`);
        const { data: orderDataByMerchantId, error: orderErrorByMerchantId } = await supabase
          .from('kiosk_orders')
          .select('kiosk_order_id, status, portone_imp_uid')
          .eq('kiosk_order_id', merchantOrderId)
          .maybeSingle();
        
        if (orderErrorByMerchantId) {
          console.error(`[Webhook] Error finding order by merchant_order_id ${merchantOrderId}:`, orderErrorByMerchantId.message);
        } else if (orderDataByMerchantId) {
          orderData = orderDataByMerchantId; // Use this order data
          console.log(`[Webhook] Found order by merchant_order_id: ${orderData.kiosk_order_id}, Current status: ${orderData.status}`);
          // If found by merchant_order_id, and portone_imp_uid is not yet set or different, update it.
          if (!orderData.portone_imp_uid || orderData.portone_imp_uid !== portoneTransactionId) {
            const { error: impUidUpdateError } = await supabase
              .from('kiosk_orders')
              .update({ portone_imp_uid: portoneTransactionId, updated_at: new Date().toISOString() })
              .eq('kiosk_order_id', orderData.kiosk_order_id);
            if (impUidUpdateError) {
              console.error(`[Webhook] Error updating portone_imp_uid for order ${orderData.kiosk_order_id}:`, impUidUpdateError.message);
            }
          }
        }
      }
        
      if (orderData) {
        let newStatus = orderData.status;
        const webhookStatus = webhook.status; // e.g., 'Paid'

        // Case-insensitive comparison for status
        if (webhookStatus && webhookStatus.toLowerCase() === 'paid' && orderData.status !== 'completed') {
          newStatus = 'completed';
        } else if (webhookStatus && webhookStatus.toLowerCase() === 'failed' && orderData.status !== 'failed') {
          newStatus = 'failed';
        } else if (webhookStatus && webhookStatus.toLowerCase() === 'ready' && orderData.status !== 'completed' && orderData.status !== 'processing') { 
          newStatus = 'processing'; 
        }

        if (newStatus !== orderData.status) {
          const { error: updateError } = await supabase
            .from('kiosk_orders')
            .update({
              status: newStatus, 
              updated_at: new Date().toISOString(),
              // Storing portone_imp_uid is now handled above if found by merchantOrderId
            })
            .eq('kiosk_order_id', orderData.kiosk_order_id);
            
          if (updateError) {
            console.error(`[Webhook] Error updating order ${orderData.kiosk_order_id} status to ${newStatus}:`, updateError.message);
          } else {
            console.log(`[Webhook] Updated order ${orderData.kiosk_order_id} status from ${orderData.status} to ${newStatus} based on webhook.`);
          }
        } else {
          console.log(`[Webhook] Order ${orderData.kiosk_order_id} status (${orderData.status}) already matches webhook implication or no change needed for webhook status: ${webhookStatus}.`);
        }
      } else {
        console.warn(`[Webhook] No order found with PortOne TX ID: ${portoneTransactionId} OR Merchant Order ID: ${merchantOrderId}. Webhook not processed further.`);
      }
    } else {
      let missingIds = [];
      if (!portoneTransactionId) missingIds.push("tx_id (PortOne Transaction ID)");
      if (!merchantOrderId) missingIds.push("payment_id (Merchant Order ID)");
      console.warn(`[Webhook] Webhook ignored. Missing critical identifiers: ${missingIds.join(', ')}. Payload:`, webhook);
    }

    // Always respond with 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'error', message: 'Error processing webhook' });
  }
} 