import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Import PortOne Webhook verification - uncomment when implementing actual verification
// import { Webhook } from '@portone/server-sdk';

export async function POST(request: NextRequest) {
  try {
    // Get the raw request body
    const rawBody = await request.text();
    console.log('[Webhook] Received raw body:', rawBody); // Log raw body
    
    // Get the request headers
    const headers = Object.fromEntries(request.headers);
    console.log('[Webhook] Received headers:', JSON.stringify(headers, null, 2)); // Log headers

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
      console.log('[Webhook] Parsed webhook payload:', JSON.stringify(webhook, null, 2)); // Log parsed payload
    } catch (e) {
      console.error('Failed to parse webhook payload:', e);
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    console.log('Received payment webhook:', webhook);

    // For a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Handle different webhook events (payment.paid, payment.failed, etc.)
    // 3. Update your database records accordingly
    
    if (webhook?.data?.paymentId) {
      const portoneTransactionId = webhook.data.paymentId; // This is typically PortOne's imp_uid
      const merchantUid = webhook?.data?.merchant_uid || webhook?.merchant_uid; // Attempt to get merchant_uid
      
      console.log(`[Webhook] Extracted PortOne Transaction ID (imp_uid): ${portoneTransactionId}`);
      console.log(`[Webhook] Extracted Merchant UID (kiosk_order_id): ${merchantUid}`);

      const supabase = await createClient();
      
      console.log(`[Webhook] Received webhook for PortOne transaction ID: ${portoneTransactionId}`);

      // Find the order associated with this PortOne transaction ID
      // We should use the column where we store PortOne's imp_uid, which is 'portone_imp_uid'
      const { data: orderData, error: orderError } = await supabase
        .from('kiosk_orders')
        .select('kiosk_order_id, status')
        .eq('portone_imp_uid', portoneTransactionId) // Corrected column name
        .maybeSingle();
        
      if (orderError) {
        console.error(`[Webhook] Error finding order by portone_imp_uid ${portoneTransactionId}:`, orderError);
      } else if (orderData) {
        console.log(`[Webhook] Found order ${orderData.kiosk_order_id} for PortOne transaction ${portoneTransactionId}. Current status: ${orderData.status}`);
        // Update the order status based on the webhook event
        // This is a simplified example - you would handle different webhook events
        // and map webhook.status (e.g., "paid", "failed") to your internal statuses.
        let newStatus = orderData.status; // Default to current status
        const webhookStatus = webhook.status; // Assuming webhook top-level status e.g. webhook.status === 'paid'

        if (webhookStatus === 'paid' && orderData.status !== 'completed') {
          newStatus = 'completed'; // Or 'processing' if you have further steps
        } else if (webhookStatus === 'failed' && orderData.status !== 'failed' && orderData.status !== 'cancelled') { // Added 'cancelled' check
          newStatus = 'failed';
        } else if (webhookStatus === 'ready') { // Example if PortOne sends 'ready' for virtual accounts etc.
           // Map to your 'processing' or an equivalent if necessary
           if (orderData.status !== 'completed' && orderData.status !== 'processing') {
            newStatus = 'processing'; 
           }
        } else if (webhookStatus === 'cancelled' && orderData.status !== 'cancelled') {
          newStatus = 'cancelled';
        }
        // Add more mappings as needed based on PortOne webhook statuses

        if (newStatus !== orderData.status) {
          const { error: updateError } = await supabase
            .from('kiosk_orders')
            .update({
              status: newStatus, 
              updated_at: new Date().toISOString(),
              // You might want to store the raw webhook payload or parts of it for auditing
              // payment_provider_webhook_details: webhook 
            })
            .eq('kiosk_order_id', orderData.kiosk_order_id);
            
          if (updateError) {
            console.error(`[Webhook] Error updating order ${orderData.kiosk_order_id} status to ${newStatus}:`, updateError);
          } else {
            console.log(`[Webhook] Updated order ${orderData.kiosk_order_id} status from ${orderData.status} to ${newStatus} based on webhook.`);
          }
        } else {
          console.log(`[Webhook] Order ${orderData.kiosk_order_id} status (${orderData.status}) already matches webhook implication or no change needed for webhook status: ${webhookStatus}.`);
        }
      } else {
        console.warn(`[Webhook] No order found with portone_imp_uid: ${portoneTransactionId}. Checking by merchant_uid if available.`);
        if (merchantUid) {
          const { data: orderDataByMerchantUid, error: orderErrorByMerchantUid } = await supabase
            .from('kiosk_orders')
            .select('kiosk_order_id, status, portone_imp_uid')
            .eq('kiosk_order_id', merchantUid)
            .maybeSingle();

          if (orderErrorByMerchantUid) {
            console.error(`[Webhook] Error finding order by merchant_uid ${merchantUid}:`, orderErrorByMerchantUid);
          } else if (orderDataByMerchantUid) {
            console.log(`[Webhook] Found order ${orderDataByMerchantUid.kiosk_order_id} by merchant_uid ${merchantUid}. Current status: ${orderDataByMerchantUid.status}. Current portone_imp_uid: ${orderDataByMerchantUid.portone_imp_uid}`);
            // If found by merchant_uid, and portone_imp_uid is missing or different, update it.
            if (!orderDataByMerchantUid.portone_imp_uid || orderDataByMerchantUid.portone_imp_uid !== portoneTransactionId) {
              console.log(`[Webhook] Updating portone_imp_uid for order ${orderDataByMerchantUid.kiosk_order_id} to ${portoneTransactionId}`);
              const { error: updateImpUidError } = await supabase
                .from('kiosk_orders')
                .update({ portone_imp_uid: portoneTransactionId })
                .eq('kiosk_order_id', orderDataByMerchantUid.kiosk_order_id);
              if (updateImpUidError) {
                console.error(`[Webhook] Error updating portone_imp_uid for order ${orderDataByMerchantUid.kiosk_order_id}:`, updateImpUidError);
              } else {
                 // Successfully updated imp_uid, now re-process this order with the original logic (or duplicate status update logic here)
                 console.log(`[Webhook] portone_imp_uid updated. The event for ${portoneTransactionId} can now be processed correctly if resent or handled below.`);
                 // Simplified: just update status for this orderDataByMerchantUid
                let newStatus = orderDataByMerchantUid.status;
                const webhookStatus = webhook.status;
                if (webhookStatus === 'paid' && orderDataByMerchantUid.status !== 'completed') newStatus = 'completed';
                else if (webhookStatus === 'failed' && orderDataByMerchantUid.status !== 'failed' && orderDataByMerchantUid.status !== 'cancelled') newStatus = 'failed';
                else if (webhookStatus === 'ready' && orderDataByMerchantUid.status !== 'completed' && orderDataByMerchantUid.status !== 'processing') newStatus = 'processing';
                else if (webhookStatus === 'cancelled' && orderDataByMerchantUid.status !== 'cancelled') newStatus = 'cancelled';

                if (newStatus !== orderDataByMerchantUid.status) {
                  const { error: updateError } = await supabase
                    .from('kiosk_orders')
                    .update({
                      status: newStatus,
                      updated_at: new Date().toISOString(),
                      payment_provider_webhook_details: webhook
                    })
                    .eq('kiosk_order_id', orderDataByMerchantUid.kiosk_order_id);
                  if (updateError) {
                    console.error(`[Webhook] Error updating order ${orderDataByMerchantUid.kiosk_order_id} status to ${newStatus} (found by merchant_uid):`, updateError);
                  } else {
                    console.log(`[Webhook] Updated order ${orderDataByMerchantUid.kiosk_order_id} status from ${orderDataByMerchantUid.status} to ${newStatus} (found by merchant_uid).`);
                  }
                } else {
                   console.log(`[Webhook] Order ${orderDataByMerchantUid.kiosk_order_id} status (${orderDataByMerchantUid.status}) already matches implication or no change needed for webhook status: ${webhookStatus} (found by merchant_uid).`);
                }
              }
            } else {
               console.log(`[Webhook] Order ${orderDataByMerchantUid.kiosk_order_id} already has correct portone_imp_uid. No update needed, but was not found by it initially. This is strange.`);
            }
          } else {
            console.warn(`[Webhook] No order found with merchant_uid: ${merchantUid} either.`);
          }
        }
      }
    } else {
      console.warn('[Webhook] Webhook payload did not contain webhook.data.paymentId.');
    }

    // Always respond with 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'error', message: 'Error processing webhook' });
  }
} 