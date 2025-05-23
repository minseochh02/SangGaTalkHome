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
      const paymentId = webhook.data.paymentId;
      const supabase = await createClient();
      
      // Find the order associated with this payment
      const { data: orderData, error: orderError } = await supabase
        .from('kiosk_orders')
        .select('kiosk_order_id, status')
        .eq('payment_id', paymentId)
        .maybeSingle();
        
      if (orderError) {
        console.error('Error finding order for payment:', orderError);
      } else if (orderData) {
        // Update the order status based on the webhook event
        // This is a simplified example - you would handle different webhook events
        const { error: updateError } = await supabase
          .from('kiosk_orders')
          .update({
            status: 'processing', // Or derive from webhook event
            updated_at: new Date().toISOString()
          })
          .eq('kiosk_order_id', orderData.kiosk_order_id);
          
        if (updateError) {
          console.error('Error updating order status:', updateError);
        } else {
          console.log(`Updated order ${orderData.kiosk_order_id} status based on webhook`);
        }
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