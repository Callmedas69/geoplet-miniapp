//api/get-mint-signature/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, type Address, recoverTypedDataAddress, isAddressEqual } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import {
  PaymentErrorCode,
  MintErrorCode,
  AppError,
  type APIError,
} from '@/types/errors';

// Onchain.fi API configuration
const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';

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
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
};

// Payment configuration
const MINT_PRICE = '2.00'; // $2.00 USDC

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
 * @returns true if payment verified successfully
 */
async function verifyPaymentOnly(paymentHeader: string): Promise<boolean> {
  try {
    // Decode payment header to log details
    try {
      const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('[ONCHAIN.FI] Payment Details:', {
        from: decoded.payload?.authorization?.from,
        to: decoded.payload?.authorization?.to,
        value: decoded.payload?.authorization?.value,
        scheme: decoded.scheme,
        network: decoded.network,
      });
    } catch {
      console.log('[ONCHAIN.FI] Could not decode payment header');
    }

    console.log('[ONCHAIN.FI] Step 1: Verifying payment...');

    // Step 1: Verify payment
    const verifyResponse = await fetch(`${ONCHAIN_API_URL}/verify`, {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY!,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentHeader,
        network: 'base',
        expectedAmount: MINT_PRICE,
        expectedToken: 'USDC',
        recipientAddress: RECIPIENT_ADDRESS,
        priority: 'balanced',
      }),
    });

    const verifyData = await verifyResponse.json();
    
    console.log('[ONCHAIN.FI] Verify response:', {
      status: verifyResponse.status,
      valid: verifyData.data?.valid,
      facilitator: verifyData.data?.facilitator,
    });

    if (!verifyResponse.ok || verifyData.status !== 'success' || !verifyData.data?.valid) {
      console.error('[ONCHAIN.FI] ❌ Verification failed:', verifyData.data?.reason);
      return false;
    }

    console.log('[ONCHAIN.FI] ✅ Payment verified (settlement deferred until simulation passes)');

    return true;
  } catch (error: unknown) {
    console.error('[ONCHAIN.FI] Payment error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error,
    });
    return false;
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

  // Generate voucher
  const nonce = Date.now(); // Unique timestamp
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now (matches MAX_SIGNATURE_VALIDITY)

  const voucher = {
    to,
    fid: BigInt(fid),
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
  };

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
      // Convert amount to atomic units (USDC has 6 decimals)
      const amountInAtomicUnits = (parseFloat(MINT_PRICE) * 1e6).toString();

      return NextResponse.json(
        {
          x402Version: 1,
          accepts: [
            {
              scheme: 'exact',
              network: 'base',
              maxAmountRequired: amountInAtomicUnits,
              asset: process.env.BASE_USDC_ADDRESS!,
              payTo: RECIPIENT_ADDRESS,
              resource: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/get-mint-signature`,
              description: `Mint your unique Geoplet NFT for ${MINT_PRICE} USDC`,
              mimeType: 'application/json',
              maxTimeoutSeconds: 300,
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
        if (!auth.from || !/^0x[a-fA-F0-9]{40}$/.test(auth.from)) {
          validationErrors.push('Invalid "from" address');
        }
        if (!auth.to || !/^0x[a-fA-F0-9]{40}$/.test(auth.to)) {
          validationErrors.push('Invalid "to" address');
        }
        if (!auth.value || auth.value !== '2000000') {
          validationErrors.push(`Invalid payment value (expected 2000000, got ${auth.value})`);
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
    const paymentValid = await verifyPaymentOnly(paymentHeader);

    if (!paymentValid) {
      return createErrorResponse(
        PaymentErrorCode.PAYMENT_VERIFICATION_FAILED,
        'Payment verification failed - Invalid or insufficient payment',
        402
      );
    }

    console.log('[ONCHAIN.FI] Payment verified successfully (will settle after simulation)');

    // Generate EIP-712 signature
    console.log('Generating mint signature for:', { userAddress, fid });
    const { voucher, signature } = await generateMintSignature(userAddress as Address, fid);

    // Return success response with payment header for settlement
    return NextResponse.json(
      {
        success: true,
        voucher,
        signature,
        paymentHeader, // Return to frontend for settlement after simulation
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
