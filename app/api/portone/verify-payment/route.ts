import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { imp_uid, merchant_uid, amount_to_check } = await request.json();

    if (!imp_uid || !merchant_uid) {
      return NextResponse.json({ error: 'Missing imp_uid or merchant_uid' }, { status: 400 });
    }

    const portoneV2ApiSecret = process.env.V2_API_SECRET;
    // const portoneChannelKey = process.env.CHANNEL_KEY; // May be needed for some V2 auth/headers

    // IMPORTANT: Consult PortOne V2 API documentation for the exact authentication method and headers.
    // The Authorization header format below is an example and might need adjustment.
    // (e.g., `PortOneV2 ${portoneV2ApiSecret}`, or a Bearer token obtained via an OAuth flow)

    const response = await fetch(`https://api.portone.io/v2/payments/${imp_uid}`, {
      method: 'GET',
      headers: {
        'Authorization': `PortOneV2 ${portoneV2ApiSecret}`, // Replace with actual auth scheme from PortOne docs
        // 'X-PortOne-Channel-Key': portoneChannelKey, // Add if required by PortOne V2 API
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('PortOne API verification error:', errorData);
      // It's good practice to not expose too much internal error detail to the client.
      return NextResponse.json({ verified: false, message: 'PortOne API error during verification' }, { status: response.status });
    }

    const paymentData = await response.json();

    // Verify Payment Status and Amount
    // Common statuses: PAID, READY (for vbank), FAILED, CANCELLED
    // Check PortOne docs for all possible statuses.
    if (paymentData.status === 'PAID') { // Or the equivalent status for successful payment in V2
      if (amount_to_check && paymentData.amount && paymentData.amount.total !== amount_to_check) {
        // Amount mismatch - potential fraud or error
        console.warn(`Amount mismatch for merchant_uid: ${merchant_uid}. Expected ${amount_to_check}, got ${paymentData.amount.total}. Potential issue.`);
        // TODO: Decide if you want to automatically try to cancel the payment via PortOne API here.
        return NextResponse.json({ verified: false, message: 'Amount mismatch after verification', paymentStatus: paymentData.status }, { status: 400 });
      }
      // Payment is successful and amount matches (if checked)
      // TODO: Update your database here (e.g., mark order as paid for merchant_uid, store imp_uid, etc.)

      return NextResponse.json({ verified: true, message: 'Payment verified successfully', payment: paymentData });
    } else {
      // Payment not successful (e.g., FAILED, CANCELLED, or still PENDING like READY for virtual accounts)
      // For 'READY' (virtual account allocated), you might treat it as pending rather than outright failure.
      // Your business logic dictates how to handle these statuses.
      return NextResponse.json({ verified: false, message: `Payment not completed. Status: ${paymentData.status}`, payment: paymentData });
    }

  } catch (error) {
    console.error('Verification API internal error:', error);
    return NextResponse.json({ verified: false, message: 'Internal server error during payment verification' }, { status: 500 });
  }
} 