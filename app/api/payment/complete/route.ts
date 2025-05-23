import { createClient } from '@/utils/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Import PortOne server SDK - uncommment when adding actual implementation
// import PortOne from '@portone/server-sdk';

// Simulated payment verification for testing purposes
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const requestData = await request.json();
    const { paymentId } = requestData;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing payment ID' },
        { status: 400 }
      );
    }

    // For now, we'll simulate verification and store a record without actual verification
    // In production, you would use the PortOne SDK to verify the payment
    /*
    const portone = PortOne.PortOneClient({ secret: process.env.PORTONE_API_SECRET });
    try {
      const paymentDetails = await portone.payment.getPayment({ paymentId });
      
      // Verify payment status
      if (paymentDetails.status !== 'PAID') {
        return NextResponse.json(
          { error: 'Payment not completed', status: paymentDetails.status },
          { status: 400 }
        );
      }
      
      // Record payment details in the database
      const { error } = await supabase
        .from('payments')
        .insert({
          payment_id: paymentId,
          amount: paymentDetails.amount.total,
          currency: paymentDetails.currency,
          status: paymentDetails.status,
          method: paymentDetails.method,
          created_at: new Date().toISOString(),
          payment_data: paymentDetails
        });
        
      if (error) {
        console.error('Error storing payment record:', error);
        return NextResponse.json(
          { error: 'Failed to store payment record' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Error verifying payment with PortOne:', error);
      return NextResponse.json(
        { error: 'Failed to verify payment' },
        { status: 500 }
      );
    }
    */

    // For testing - simulate successful payment
    // In production, use the commented code above for real verification
    console.log(`Payment completion simulated for payment ID: ${paymentId}`);

    // Return success response
    return NextResponse.json({
      status: 'PAID',
      message: '결제가 성공적으로 완료되었습니다.',
    });
  } catch (error) {
    console.error('Error processing payment completion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 