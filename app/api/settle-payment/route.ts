// app/api/settle-payment/route.ts
//
// Payment Settlement Endpoint
// Settles payment AFTER contract simulation passes (per LOG.md)

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Onchain.fi API configuration
const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as string;

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://geoplet.geoart.studio',
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
    const { paymentHeader, fid } = body;

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

    if (!fid) {
      return NextResponse.json(
        {
          success: false,
          error: 'FID is required for payment tracking',
        },
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    console.log('[SETTLE] Request:', { fid, hasPaymentHeader: !!paymentHeader });

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
        sourceNetwork: 'base',      // New format (supports cross-chain)
        destinationNetwork: 'base',  // New format (supports cross-chain)
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

    // Write to payment_tracking table
    try {
      console.log('[SETTLE] Writing payment tracking record:', {
        fid,
        settlement_tx_hash: settleData.data.txHash
      });

      const { data: trackingData, error: trackingError } = await supabaseAdmin
        .from('payment_tracking')
        .upsert({
          fid: parseInt(fid),
          settlement_tx_hash: settleData.data.txHash,
          status: 'settled',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (trackingError) {
        console.error('[SETTLE] ⚠️  Failed to write payment tracking:', {
          error: trackingError,
          fid
        });
        // Don't fail the settlement - payment succeeded, tracking is secondary
        // User can still mint, just won't have recovery tracking
      } else {
        console.log('[SETTLE] ✅ Payment tracking record created:', {
          fid,
          trackingId: trackingData?.fid
        });
      }
    } catch (trackingErr) {
      console.error('[SETTLE] ⚠️  Exception writing payment tracking:', trackingErr);
      // Don't fail the settlement
    }

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
