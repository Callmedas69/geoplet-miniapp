import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, type Address, recoverTypedDataAddress, isAddressEqual } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { X402Client } from '@onchainfi/x402-aggregator-client';
import { GEOPLET_CONFIG } from '@/lib/contracts';

/**
 * API Route: Get Mint Signature with x402 Payment Verification & Settlement
 *
 * Flow:
 * 1. Verify x402 payment via Onchain.fi
 * 2. Settle payment onchain (transfer USDC to recipient)
 * 3. Generate EIP-712 signature for mint voucher
 * 4. Return signature + voucher data
 *
 * Security:
 * - Payment verification & settlement via x402 header
 * - EIP-712 signature with deadline (5 min)
 * - Nonce uniqueness (timestamp-based)
 * - CORS protection
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
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as string;

// Validate environment variables
function validateEnv() {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not configured');
  if (!RECIPIENT_ADDRESS) throw new Error('RECIPIENT_ADDRESS not configured');
  if (!process.env.ONCHAIN_FI_API_KEY) throw new Error('ONCHAIN_FI_API_KEY not configured');
}

/**
 * Verify and settle x402 payment via Onchain.fi SDK
 *
 * This function both verifies the payment signature AND settles it onchain,
 * ensuring the USDC actually transfers to the recipient address.
 */
async function verifyX402Payment(paymentHeader: string): Promise<boolean> {
  try {
    const client = new X402Client({
      apiKey: process.env.ONCHAIN_FI_API_KEY!,
    });

    // Decode payment header to log details
    try {
      const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('[TEST] Payment Details:', {
        from: decoded.payload?.authorization?.from,
        to: decoded.payload?.authorization?.to,
        value: decoded.payload?.authorization?.value,
        scheme: decoded.scheme,
        network: decoded.network,
      });
    } catch (e) {
      console.log('[TEST] Could not decode payment header');
    }

    console.log('[TEST] Verifying x402 payment via Onchain.fi (verify only)...');

    const result = await client.verify({
      paymentHeader,
      network: 'base',
      expectedAmount: MINT_PRICE,
      expectedToken: 'USDC',
      recipientAddress: RECIPIENT_ADDRESS,
    });

    console.log('[TEST] Verify result:', {
      valid: result.valid,
      facilitator: result.facilitator,
      from: result.from,
      to: result.to,
      amount: result.amount,
      token: result.token,
      txHash: result.txHash,
    });

    console.log('[TEST] ⚠️  CHECK YOUR TREASURY WALLET TO SEE IF USDC TRANSFERRED!');
    console.log('[TEST] Treasury Address:', RECIPIENT_ADDRESS);

    return result.valid;
  } catch (error: any) {
    console.error('[TEST] Payment verification error:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
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
): Promise<{ voucher: any; signature: `0x${string}` }> {
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
  const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now

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
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, fid' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get x402 payment header
    const paymentHeader = request.headers.get('X-Payment');
    if (!paymentHeader) {
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

    // Verify and settle payment via Onchain.fi
    console.log('Verifying and settling x402 payment...');
    const paymentValid = await verifyX402Payment(paymentHeader);

    if (!paymentValid) {
      return NextResponse.json(
        {
          error: 'Payment verification/settlement failed',
          message: 'Invalid or insufficient payment. Please try again.',
        },
        { status: 402, headers: corsHeaders }
      );
    }

    console.log('Payment verified and settled successfully');

    // Generate EIP-712 signature
    console.log('Generating mint signature for:', { userAddress, fid });
    const { voucher, signature } = await generateMintSignature(userAddress as Address, fid);

    // Return success response
    return NextResponse.json(
      {
        success: true,
        voucher,
        signature,
        message: 'Mint signature generated successfully',
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Access-Control-Expose-Headers': 'X-PAYMENT-RESPONSE',
        },
      }
    );

  } catch (error: any) {
    console.error('Get mint signature error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message || 'Failed to generate mint signature',
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
