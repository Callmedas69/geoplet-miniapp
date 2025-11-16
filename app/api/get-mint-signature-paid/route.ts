/**
 * GET MINT SIGNATURE (PAID) ENDPOINT
 *
 * Generates fresh mint signature for users who already paid (payment settled onchain)
 * SKIPS x402 payment verification - validates payment_tracking table instead
 *
 * Used by MintPaidButton for recovery mints
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, type Address, recoverTypedDataAddress, isAddressEqual } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import { supabaseAdmin } from '@/lib/supabase';

// Public client for Base chain time diagnostic
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

// Signer private key (same as regular mint endpoint)
const PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error('SIGNER_PRIVATE_KEY environment variable is required');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://geoplet.geoart.studio',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

interface MintVoucher {
  to: string;
  fid: string;
  nonce: string;
  deadline: string;
}

/**
 * POST /api/get-mint-signature-paid
 *
 * Generate mint signature for users who already paid
 * NO x402 payment verification - payment already settled
 */
export async function POST(request: NextRequest) {
  try {
    const { userAddress, fid } = await request.json();

    console.log('[GET-MINT-SIG-PAID] Request received:', {
      userAddress,
      fid,
      timestamp: new Date().toISOString()
    });

    // Validate inputs
    if (!userAddress || !fid) {
      return NextResponse.json(
        { error: 'Missing userAddress or fid' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check payment_tracking for settled payment
    console.log('[GET-MINT-SIG-PAID] Checking payment status...');

    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from("payment_tracking")
      .select("*")
      .eq("fid", parseInt(fid))
      .single();

    if (paymentError || !paymentData) {
      console.error('[GET-MINT-SIG-PAID] ❌ No payment record found:', {
        fid,
        error: paymentError
      });
      return NextResponse.json(
        { error: "No settled payment found for this FID" },
        { status: 403, headers: corsHeaders }
      );
    }

    // Validate payment status
    if (paymentData.status !== "settled" && paymentData.status !== "failed") {
      console.error('[GET-MINT-SIG-PAID] ❌ Invalid payment status:', {
        fid,
        status: paymentData.status,
        settlement_tx_hash: paymentData.settlement_tx_hash
      });
      return NextResponse.json(
        { error: `Payment status is "${paymentData.status}", cannot mint. Status must be "settled" or "failed".` },
        { status: 403, headers: corsHeaders }
      );
    }

    console.log('[GET-MINT-SIG-PAID] ✅ Payment verified:', {
      fid,
      status: paymentData.status,
      settlement_tx_hash: paymentData.settlement_tx_hash
    });

    // Generate fresh mint signature (15-min validity)
    console.log('[GET-MINT-SIG-PAID] Generating fresh signature...');

    const signature = await generateMintSignature(
      userAddress as Address,
      fid
    );

    console.log('[GET-MINT-SIG-PAID] ✅ Signature generated:', {
      fid,
      to: signature.voucher.to,
      deadline: signature.voucher.deadline
    });

    return NextResponse.json(signature, { headers: corsHeaders });
  } catch (error) {
    console.error("[GET-MINT-SIG-PAID] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate mint signature" },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * Generate EIP-712 signature for mint voucher
 * (Same logic as regular get-mint-signature, but without x402 payment)
 */
async function generateMintSignature(
  to: Address,
  fid: string
): Promise<{ voucher: MintVoucher; signature: `0x${string}` }> {
  // Create account from private key
  const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);

  // Create wallet client
  const walletClient = createWalletClient({
    account,
    chain: GEOPLET_CONFIG.chain,
    transport: http(),
  });

  // ✅ TIME SKEW DIAGNOSTIC: Measure server vs chain time difference
  const serverTime = Math.floor(Date.now() / 1000);
  const block = await publicClient.getBlock();
  const chainTime = Number(block.timestamp);
  const skew = serverTime - chainTime;

  console.log('🕐 TIME DIAGNOSTIC [get-mint-signature-paid]:', {
    serverTime,
    chainTime,
    skewSeconds: skew,
    skewMinutes: (skew / 60).toFixed(1),
    generatedDeadline: serverTime + (60 * 60),
    contractValidatesAt: chainTime,
    userAddress: to,
    fid,
  });

  // Generate voucher with 60-minute validity
  const now = Math.floor(Date.now() / 1000); // seconds
  const EXPIRY_WINDOW = 60 * 60; // 60 minutes

  const nonce = now;
  const deadline = now + EXPIRY_WINDOW;

  const voucher = {
    to,
    fid: BigInt(fid),
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
  };

  console.log("[VOUCHER TIMING]", {
    now,
    deadline,
    secondsUntilExpiry: deadline - now,
    nowISO: new Date(now * 1000).toISOString(),
    deadlineISO: new Date(deadline * 1000).toISOString(),
  });

  // Create EIP-712 signature
  const signature = await walletClient.signTypedData({
    account,
    domain: {
      ...GEOPLET_CONFIG.eip712.domain,
      chainId: GEOPLET_CONFIG.chainId,
      verifyingContract: GEOPLET_CONFIG.address,
    },
    types: GEOPLET_CONFIG.eip712.types,
    primaryType: 'MintVoucher',
    message: voucher,
  });

  // Verify signature locally
  const recovered = await recoverTypedDataAddress({
    domain: {
      ...GEOPLET_CONFIG.eip712.domain,
      chainId: GEOPLET_CONFIG.chainId,
      verifyingContract: GEOPLET_CONFIG.address,
    },
    types: GEOPLET_CONFIG.eip712.types,
    primaryType: 'MintVoucher',
    message: voucher,
    signature,
  });

  if (!isAddressEqual(recovered, account.address)) {
    console.error('[SIGNATURE MISMATCH]', {
      recovered,
      expected: account.address,
    });
    throw new Error(
      `Signature verification failed: recovered=${recovered}, expected=${account.address}`
    );
  }

  console.log('[✓ Signature verified]', { signer: recovered });

  return {
    voucher: {
      to: voucher.to,
      fid: voucher.fid.toString(),
      nonce: voucher.nonce.toString(),
      deadline: voucher.deadline.toString(),
    },
    signature,
  };
}
