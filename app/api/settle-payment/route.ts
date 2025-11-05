// app/api/settle-payment/route.ts
//
// Payment Settlement Endpoint
// Settles payment AFTER contract simulation passes (per LOG.md)

import { NextRequest, NextResponse } from 'next/server';

// Onchain.fi API configuration
const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as string;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Handle OPTIONS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * POST /api/settle-payment
 *
 * Settle payment onchain after both:
 * 1. Payment verification passed
 * 2. Contract simulation passed
 *
 * Flow (per LOG.md):
 * 1. Verify payment (done in /api/get-mint-signature)
 * 2. Simulate contract (done in frontend)
 * 3. Settle payment (THIS ENDPOINT)
 * 4. Execute mint transaction (frontend)
 *
 * @param paymentHeader - Base64-encoded x402 payment authorization
 * @returns Settlement result with transaction hash
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentHeader } = body;

    // Validate required fields
    if (!paymentHeader) {
      return NextResponse.json(
        {
          success: false,
          error: 'Payment header is required',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Validate environment variables
    if (!process.env.ONCHAIN_FI_API_KEY) {
      console.error('[SETTLE] ❌ ONCHAIN_FI_API_KEY not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Payment service not configured',
        },
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    console.log('[SETTLE] Settling payment onchain...');

    // Call onchain.fi settle endpoint
    const settleResponse = await fetch(`${ONCHAIN_API_URL}/settle`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentHeader,
        network: 'base',
        priority: 'balanced',
      }),
    });

    const settleData = await settleResponse.json();

    console.log('[SETTLE] Settle response:', {
      status: settleResponse.status,
      settled: settleData.data?.settled,
      txHash: settleData.data?.txHash,
    });

    if (!settleResponse.ok || settleData.status !== 'success' || !settleData.data?.settled) {
      console.error('[SETTLE] ❌ Settlement failed:', settleData.data?.reason);
      return NextResponse.json(
        {
          success: false,
          error: settleData.data?.reason || 'Payment settlement failed',
        },
        {
          status: 402,
          headers: corsHeaders,
        }
      );
    }

    console.log('[SETTLE] ✅ Payment settled successfully!');
    console.log('[SETTLE] Transaction hash:', settleData.data.txHash);
    console.log('[SETTLE] Treasury address:', RECIPIENT_ADDRESS);

    return NextResponse.json(
      {
        success: true,
        settled: true,
        txHash: settleData.data.txHash,
        facilitator: settleData.data.facilitator,
      },
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (error: unknown) {
    console.error('[SETTLE] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Settlement failed';

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
