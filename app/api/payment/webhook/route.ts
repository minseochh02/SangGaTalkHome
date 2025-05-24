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

    // For a real implementation, you would:
    // 1. Verify the webhook signature
    // 2. Handle different webhook events (payment.paid, payment.failed, etc.)
    // 3. Update your database records accordingly
    
    if (webhook?.data?.paymentId) {
      const portoneTransactionId = webhook.data.paymentId; // This is typically PortOne's imp_uid
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
        } else if (webhookStatus === 'failed' && orderData.status !== 'failed') {
          newStatus = 'failed';
        } else if (webhookStatus === 'ready') { // Example if PortOne sends 'ready' for virtual accounts etc.
           // Map to your 'processing' or an equivalent if necessary
           if (orderData.status !== 'completed' && orderData.status !== 'processing') {
            newStatus = 'processing'; 
           }
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
        console.warn(`[Webhook] No order found with portone_imp_uid: ${portoneTransactionId}`);
      }
    }

    // Always respond with 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    // Still return 200 to prevent retries
    return NextResponse.json({ status: 'error', message: 'Error processing webhook' });
  }
} 