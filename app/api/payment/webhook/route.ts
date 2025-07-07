import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
// TODO: Implement webhook verification with proper typing
// import * as PortOne from '@portone/server-sdk';

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body
    const rawBody = await request.text();
    
    // Get the request headers
    const headers = Object.fromEntries(request.headers);

    // Parse the webhook data (TODO: Add signature verification)
    let webhook;
    try {
      webhook = JSON.parse(rawBody);
      console.log('Webhook received and parsed successfully');
    } catch (e) {
      console.error('Failed to parse webhook payload:', e);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    console.log('Received payment webhook:', webhook);

    // Handle webhook based on PortOne SDK structure
    let portoneTransactionId, merchantOrderId, webhookStatus;
    
    // Check if this is a payment-related webhook
    if ('paymentId' in webhook.data) {
      // Payment-related webhook
      merchantOrderId = webhook.data.paymentId;
      portoneTransactionId = webhook.data.transactionId;
      
      console.log(`[Webhook] Payment webhook detected. Type: ${String(webhook.type)}, PaymentId: ${merchantOrderId}, TransactionId: ${portoneTransactionId}`);
      
      // Map webhook types to internal status
      const webhookType = String(webhook.type);
      switch (webhookType) {
        case 'Transaction.Ready':
          webhookStatus = 'ready';
          break;
        case 'Transaction.Paid':
          webhookStatus = 'paid';
          break;
        case 'Transaction.VirtualAccountIssued':
          webhookStatus = 'virtual_account_issued';
          break;
        case 'Transaction.PartialCancelled':
          webhookStatus = 'partial_cancelled';
          break;
        case 'Transaction.Cancelled':
          webhookStatus = 'cancelled';
          break;
        case 'Transaction.Failed':
          webhookStatus = 'failed';
          break;
        case 'Transaction.PayPending':
          webhookStatus = 'pay_pending';
          break;
        case 'Transaction.CancelPending':
          webhookStatus = 'cancel_pending';
          break;
        default:
          console.log(`[Webhook] Unknown webhook type: ${webhookType}`);
          webhookStatus = webhookType.toLowerCase();
      }
    } else {
      console.log(`[Webhook] Non-payment webhook or unknown format, ignoring`);
      return NextResponse.json({ status: 'success' });
    }

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

        // Handle status transitions based on webhook status
        if (webhookStatus === 'paid' && orderData.status !== 'completed') {
          newStatus = 'completed';
        } else if (webhookStatus === 'failed' && orderData.status !== 'failed') {
          newStatus = 'failed';
        } else if (webhookStatus === 'ready' && orderData.status !== 'completed' && orderData.status !== 'processing') { 
          newStatus = 'processing'; 
        } else if (webhookStatus === 'virtual_account_issued' && orderData.status !== 'completed' && orderData.status !== 'processing') {
          newStatus = 'processing'; // Virtual account issued, waiting for payment
        } else if (webhookStatus === 'cancelled' && orderData.status !== 'cancelled') {
          newStatus = 'cancelled';
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