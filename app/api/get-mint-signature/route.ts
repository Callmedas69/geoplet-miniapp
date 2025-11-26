//api/get-mint-signature/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, type Address, recoverTypedDataAddress, isAddressEqual } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import { PAYMENT_CONFIG } from '@/lib/payment-config';
import {
  PaymentErrorCode,
  MintErrorCode,
  AppError,
  type APIError,
} from '@/types/errors';

// Onchain.fi API configuration
const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';

// Public client for Base chain time diagnostic
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

/**
 * API Route: Get Mint Signature with x402 Payment Verification & Settlement
 *
 * Flow:
 * 1. Verify x402 payment via Onchain.fi API (direct fetch call)
 * 2. Settle payment onchain (transfer USDC to recipient)
 * 3. Generate EIP-712 signature for mint voucher
 * 4. Return signature + voucher data
 *
 * Security:
 * - Payment verification & settlement via x402 header
 * - EIP-712 signature with deadline (5 min)
 * - Nonce uniqueness (timestamp-based)
 * - CORS protection
 *
 * Implementation:
 * - Direct API calls (no SDK) for better control and reliability
 * - Same approach as Onchain.fi UI
 * - Structured error responses with error codes
 */

// CORS headers for frontend requests
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://geoplet.geoart.studio',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
};

// Signer configuration
const PRIVATE_KEY = process.env.SIGNER_PRIVATE_KEY as string;
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as string;

// Mint voucher type
interface MintVoucher {
  to: string;
  fid: string;
  nonce: string;
  deadline: string;
}

// Validate environment variables
function validateEnv() {
  const required = {
    SIGNER_PRIVATE_KEY: PRIVATE_KEY,
    RECIPIENT_ADDRESS: RECIPIENT_ADDRESS,
    ONCHAIN_FI_API_KEY: process.env.ONCHAIN_FI_API_KEY,
    BASE_USDC_ADDRESS: process.env.BASE_USDC_ADDRESS,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('[ENV] ❌ Missing required environment variables:', missing);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }

  console.log('[ENV] ✅ All required environment variables present');
}

/**
 * Create error response with error code
 * Maintains backward compatibility by including message field
 */
function createErrorResponse(
  code: PaymentErrorCode | MintErrorCode,
  message: string,
  status: number,
  details?: APIError['details']
): NextResponse {
  const errorResponse: { error: APIError } = {
    error: {
      code,
      message,
      details,
    },
  };

  return NextResponse.json(errorResponse, {
    status,
    headers: corsHeaders,
  });
}

/**
 * Convert AppError to appropriate error code for this endpoint
 * This endpoint only handles Payment and Mint errors, not Generation errors
 */
function getErrorCodeForEndpoint(error: AppError): PaymentErrorCode | MintErrorCode {
  // If it's already a Payment or Mint error code, return as-is
  if (Object.values(PaymentErrorCode).includes(error.code as PaymentErrorCode)) {
    return error.code as PaymentErrorCode;
  }
  if (Object.values(MintErrorCode).includes(error.code as MintErrorCode)) {
    return error.code as MintErrorCode;
  }

  // For other error types (like GenerationErrorCode), map to generic API error
  return PaymentErrorCode.API_ERROR;
}

/**
 * Verify x402 payment via Onchain.fi API (WITHOUT settling)
 *
 * This function ONLY verifies the EIP-3009 payment signature.
 * Settlement happens separately after contract simulation passes.
 *
 * Flow (per LOG.md):
 * 1. Verify payment (this function)
 * 2. Simulate contract call (frontend)
 * 3. Settle payment (separate endpoint)
 * 4. Execute mint transaction
 *
 * @param paymentHeader - Base64-encoded x402 payment authorization
 * @returns { valid: boolean, paymentId?: string } - paymentId required for settlement
 */
async function verifyPaymentOnly(paymentHeader: string): Promise<{ valid: boolean; paymentId?: string }> {
  try {
    // Decode payment header to check expiration and log details
    try {
      const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      const validBefore = parseInt(decoded.payload?.authorization?.validBefore || '0');
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = validBefore - now;

      console.log('[PAYMENT-CHECK] Signature validity check:', {
        validBefore: validBefore,
        currentTime: now,
        expiresIn: `${timeUntilExpiry}s`,
        isExpired: now > validBefore,
        validBeforeISO: new Date(validBefore * 1000).toISOString(),
        currentTimeISO: new Date(now * 1000).toISOString(),
      });

      // Check if signature is already expired
      if (now > validBefore) {
        console.error('[PAYMENT-CHECK] ❌ Payment signature EXPIRED!');
        console.error('[PAYMENT-CHECK] Expired since:', `${now - validBefore} seconds ago`);
        return { valid: false };
      }

      // Warn if expiring soon (less than 60 seconds)
      if (timeUntilExpiry < 60) {
        console.warn('[PAYMENT-CHECK] ⚠️ Signature expiring soon:', `${timeUntilExpiry}s remaining`);
      }

      console.log('[ONCHAIN.FI] Payment Details:', {
        from: decoded.payload?.authorization?.from,
        to: decoded.payload?.authorization?.to,
        value: decoded.payload?.authorization?.value,
        scheme: decoded.scheme,
        network: decoded.network,
      });
    } catch (decodeError) {
      console.error('[ONCHAIN.FI] Could not decode payment header:', decodeError);
      return { valid: false };
    }

    console.log('[ONCHAIN.FI] Step 1: Verifying payment...');

    // Step 1: Verify payment
    const requestBody = {
      paymentHeader,
      sourceNetwork: 'base',      // New format (supports cross-chain)
      destinationNetwork: 'base',  // New format (supports cross-chain)
      expectedAmount: PAYMENT_CONFIG.MINT.price, // Decimal format per onchain.fi spec
      expectedToken: 'USDC',
      recipientAddress: RECIPIENT_ADDRESS,
      priority: 'balanced',
    };

    console.log('[ONCHAIN.FI] Request body:', JSON.stringify(requestBody, null, 2));

    const verifyResponse = await fetch(`${ONCHAIN_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const verifyData = await verifyResponse.json();

    // ✅ Comprehensive logging to diagnose issues
    console.log('[ONCHAIN.FI] Full verify response:', JSON.stringify(verifyData, null, 2));
    console.log('[ONCHAIN.FI] Response status:', verifyResponse.status);
    console.log('[ONCHAIN.FI] Response statusText:', verifyResponse.statusText);

    // Legacy logs for backward compatibility
    console.log('[ONCHAIN.FI] Verify response summary:', {
      status: verifyResponse.status,
      valid: verifyData.data?.valid,
      facilitator: verifyData.data?.facilitator,
    });

    if (!verifyResponse.ok || verifyData.status !== 'success' || !verifyData.data?.valid) {
      console.error('[ONCHAIN.FI] ❌ Verification failed');
      console.error('[ONCHAIN.FI] Error details:', {
        status: verifyData.status,
        message: verifyData.message,
        error: verifyData.error,
        reason: verifyData.data?.reason,
        data: verifyData.data,
      });
      return { valid: false };
    }

    console.log('[ONCHAIN.FI] ✅ Payment verified (settlement deferred until simulation passes)');
    console.log('[ONCHAIN.FI] paymentId:', verifyData.data.paymentId);

    return { valid: true, paymentId: verifyData.data.paymentId };
  } catch (error: unknown) {
    console.error('[ONCHAIN.FI] Payment error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error,
    });
    return { valid: false };
  }
}

/**
 * Generate EIP-712 signature for mint voucher using viem
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

  console.log('🕐 TIME DIAGNOSTIC [get-mint-signature]:', {
    serverTime,
    chainTime,
    skewSeconds: skew,
    skewMinutes: (skew / 60).toFixed(1),
    generatedDeadline: serverTime + (60 * 60),
    contractValidatesAt: chainTime,
    userAddress: to,
    fid,
  });

  // ✅ Generate voucher with consistent time units (seconds)
const now = Math.floor(Date.now() / 1000);
const EXPIRY_WINDOW = 60 * 60; // 60 minutes validity (must be <= 3600s)

const nonce = now;             // seconds, not milliseconds
const deadline = now + EXPIRY_WINDOW; // expires in 60 minutes

const voucher = {
  to,
  fid: BigInt(fid),
  nonce: BigInt(nonce),
  deadline: BigInt(deadline),
};

// 🧠 Debug log (optional, safe to keep)
console.log("[VOUCHER TIMING]", {
  now,
  deadline,
  secondsUntilExpiry: deadline - now,
  nowISO: new Date(now * 1000).toISOString(),
  deadlineISO: new Date(deadline * 1000).toISOString(),
});

// >>> DEBUG ADD — BACKEND RAW VOUCHER BEFORE SIGN
console.log("[DEBUG BACKEND VOUCHER RAW BEFORE SIGN]", {
  to: voucher.to,
  fid: voucher.fid,
  nonce: voucher.nonce,
  deadline: voucher.deadline,
});

// >>> DEBUG ADD — BACKEND DOMAIN + TYPES BEFORE SIGN
console.log("[DEBUG BACKEND EIP712 DOMAIN BEFORE SIGN]", {
  ...GEOPLET_CONFIG.eip712.domain,
  chainId: GEOPLET_CONFIG.chainId,
  verifyingContract: GEOPLET_CONFIG.address,
});

// >>> DEBUG ADD
console.log("[DEBUG BACKEND EIP712 TYPES BEFORE SIGN]", GEOPLET_CONFIG.eip712.types);

  // Create EIP-712 signature using viem (config from ABI)
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

// >>> DEBUG ADD — SIGNATURE
console.log("[DEBUG BACKEND SIGNATURE]", signature);

  // ✅ Signature Doctor - Verify locally before sending to frontend
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
      domain: GEOPLET_CONFIG.eip712.domain,
      chainId: GEOPLET_CONFIG.chainId,
      verifyingContract: GEOPLET_CONFIG.address,
    });

    throw new Error(
      `Signature verification failed: recovered=${recovered}, expected=${account.address}`
    );
  }

  console.log('[✓ Signature verified]', { signer: recovered });

  // >>> DEBUG ADD — FINAL VOUCHER SENT TO FRONTEND
  console.log("[DEBUG BACKEND VOUCHER SENT TO FRONTEND]", {
    to: voucher.to,
    fid: voucher.fid.toString(),
    nonce: voucher.nonce.toString(),
    deadline: voucher.deadline.toString(),
  });

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

// Handle OPTIONS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Handle POST request
export async function POST(request: NextRequest) {
  try {
    // Validate environment
    validateEnv();

    // Parse request body
    const body = await request.json();
    const { userAddress, fid } = body;

    // Validate required fields
    if (!userAddress || !fid) {
      return createErrorResponse(
        PaymentErrorCode.API_ERROR,
        'Missing required fields: userAddress, fid',
        400
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return createErrorResponse(
        PaymentErrorCode.API_ERROR,
        'Invalid Ethereum address',
        400
      );
    }

    // Get x402 payment header
    const paymentHeader = request.headers.get('X-Payment');
    if (!paymentHeader) {
      // ✅ LOG: Confirm 402 response path
      console.log('[X402] No X-Payment header found, returning 402 Payment Required');

      // Return x402-compliant 402 response
      // Use pre-calculated atomic units from PAYMENT_CONFIG (KISS principle)
      return NextResponse.json(
        {
          x402Version: 1,
          accepts: [
            {
              scheme: 'exact',
              network: 'base',
              maxAmountRequired: PAYMENT_CONFIG.MINT.priceAtomic,
              asset: process.env.BASE_USDC_ADDRESS!,
              payTo: RECIPIENT_ADDRESS,
              resource: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/get-mint-signature`,
              description: `Mint your unique Geoplet NFT for ${PAYMENT_CONFIG.MINT.price} USDC`,
              mimeType: 'application/json',
              maxTimeoutSeconds: 600,
              extra: {
                name: 'USD Coin',
                version: '2',
              },
            },
          ],
          error: 'Payment Required',
        },
        {
          status: 402,
          headers: corsHeaders,
        }
      );
    }

    // Validate payment header structure BEFORE calling SDK
    console.log('[VALIDATION] Starting payment header validation...');
    console.log('[DEBUG] Raw X-Payment header (base64):', paymentHeader);
    console.log('[DEBUG] X-Payment header length:', paymentHeader.length, 'characters');

    // Decode and validate payment header structure
    try {
      const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('[DEBUG] Full decoded payment header:', JSON.stringify(decoded, null, 2));

      // Validate required root-level fields
      const validationErrors: string[] = [];

      if (!decoded.x402Version || decoded.x402Version !== 1) {
        validationErrors.push('Missing or invalid x402Version (must be 1)');
      }

      if (!decoded.scheme || decoded.scheme !== 'exact') {
        validationErrors.push('Invalid payment scheme (must be "exact")');
      }

      if (!decoded.network || decoded.network !== 'base') {
        validationErrors.push('Invalid network (must be "base")');
      }

      if (!decoded.payload?.signature) {
        validationErrors.push('Missing payment signature');
      }

      if (!decoded.payload?.authorization) {
        validationErrors.push('Missing authorization data');
      }

      // Validate authorization fields
      const auth = decoded.payload?.authorization;
      if (auth) {
        // Use pre-calculated atomic value from PAYMENT_CONFIG (KISS principle - no manual calculation)
        const expectedValue = PAYMENT_CONFIG.MINT.priceAtomic;

        if (!auth.from || !/^0x[a-fA-F0-9]{40}$/.test(auth.from)) {
          validationErrors.push('Invalid "from" address');
        }
        if (!auth.to || !/^0x[a-fA-F0-9]{40}$/.test(auth.to)) {
          validationErrors.push('Invalid "to" address');
        }
        if (!auth.value || auth.value !== expectedValue) {
          validationErrors.push(`Invalid payment value (expected ${expectedValue}, got ${auth.value})`);
        }
        if (!auth.validBefore) {
          validationErrors.push('Missing validBefore timestamp');
        }
        if (!auth.nonce || !/^0x[a-fA-F0-9]{64}$/.test(auth.nonce)) {
          validationErrors.push('Invalid nonce format (must be 32-byte hex)');
        }

        console.log('[VALIDATION] Authorization details:', {
          from: auth.from,
          to: auth.to,
          value: auth.value,
          validAfter: auth.validAfter,
          validBefore: auth.validBefore,
          nonce: auth.nonce,
        });
      }

      if (validationErrors.length > 0) {
        console.error('[VALIDATION FAILED] Payment header errors:', validationErrors);
        return createErrorResponse(
          PaymentErrorCode.INVALID_SIGNATURE,
          'Invalid payment header format',
          400,
          {
            validationErrors,
            hint: 'Payment header must match onchain.fi specification. See .docs/HEADER_FORMAT.md',
          }
        );
      }

      console.log('[VALIDATION PASSED] Payment header structure is correct');
    } catch (e) {
      console.error('[VALIDATION ERROR] Could not parse payment header:', e);
      return createErrorResponse(
        PaymentErrorCode.INVALID_SIGNATURE,
        'Malformed payment header - Invalid base64 encoding or JSON structure',
        400
      );
    }

    // Verify payment via Onchain.fi (NO settlement yet - per LOG.md)
    console.log('[ONCHAIN.FI] Verifying payment (settlement deferred)...');
    const verifyResult = await verifyPaymentOnly(paymentHeader);

    if (!verifyResult.valid) {
      return createErrorResponse(
        PaymentErrorCode.PAYMENT_VERIFICATION_FAILED,
        'Payment verification failed - Invalid or insufficient payment',
        402
      );
    }

    const { paymentId } = verifyResult;
    console.log('[ONCHAIN.FI] Payment verified successfully (will settle after simulation)');
    console.log('[ONCHAIN.FI] paymentId for settlement:', paymentId);

    // Generate EIP-712 signature
    console.log('Generating mint signature for:', { userAddress, fid });
    const { voucher, signature } = await generateMintSignature(userAddress as Address, fid);

    // Return success response with payment header and paymentId for settlement
    return NextResponse.json(
      {
        success: true,
        voucher,
        signature,
        paymentHeader, // Return to frontend for settlement after simulation
        paymentId,     // Required for settlement - must be passed to /api/settle-payment
        message: 'Mint signature generated successfully (payment verified, not settled yet)',
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
        },
      }
    );

  } catch (error: unknown) {
    console.error('Get mint signature error:', error);

    // Handle AppError with error codes
    if (error instanceof AppError) {
      return createErrorResponse(
        getErrorCodeForEndpoint(error),
        error.message,
        500,
        error.details
      );
    }

    // Handle generic errors
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate mint signature';
    return createErrorResponse(
      PaymentErrorCode.API_ERROR,
      errorMessage,
      500
    );
  }
}
