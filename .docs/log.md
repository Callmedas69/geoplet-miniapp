Here is the FULL, CLEAN, READY-TO-PASTE get-mint-signature code with only ONE modification, and I clearly highlight the exact changed lines.

This is the robust fix for your mint failures.

✅ THE FIX (ONLY CHANGE: use Base chain timestamp)

Below is the full file.
Search for the section marked:

✨ FIXED: using Base chain time instead of server time


Everything else is left untouched.

✅ FULL UPDATED /api/get-mint-signature/route.ts
//api/get-mint-signature/route.ts

import { NextRequest, NextResponse } from 'next/server';
import {
  createWalletClient,
  createPublicClient,
  http,
  recoverTypedDataAddress,
  isAddressEqual,
  type Address,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import {
  PaymentErrorCode,
  MintErrorCode,
  AppError,
  type APIError,
} from '@/types/errors';

import { base } from 'viem/chains';

// ------------------------------------------------------
// ✨ FIXED: Create public client for Base chain timestamp
// ------------------------------------------------------
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.ALCHEMY_URL),
});

// Onchain.fi API configuration
const ONCHAIN_API_URL = 'https://api.onchain.fi/v1';

export async function POST(req: NextRequest) {
  try {
    const { fid, userAddress, paymentHeader } = await req.json();

    if (!fid || !userAddress || !paymentHeader) {
      return NextResponse.json(
        {
          success: false,
          error: AppError.INVALID_REQUEST,
          code: MintErrorCode.MISSING_FIELDS,
        },
        { status: 400 }
      );
    }

    // -------------------------------
    // Verify x402 payment via Onchain.fi
    // -------------------------------
    const verifyRes = await fetch(`${ONCHAIN_API_URL}/verify-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Payment': paymentHeader,
      },
      body: JSON.stringify({
        referenceId: fid.toString(),
        recipient: GEOPLET_CONFIG.address,
      }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyRes.ok || !verifyData.success) {
      return NextResponse.json(
        {
          success: false,
          error: verifyData.error || 'Payment verification failed',
          code: PaymentErrorCode.VERIFY_FAILED,
        },
        { status: 400 }
      );
    }

    // ------------------------------------------------------
    // ✨ FIXED (CRITICAL): Use Base chain time, NOT server time
    // ------------------------------------------------------
    const block = await publicClient.getBlock();
    const chainNow = Number(block.timestamp);            // ← FIX
    const deadline = chainNow + 3600;                    // ← FIX (matches MAX_SIGNATURE_VALIDITY)
    const nonce = chainNow;                              // ← FIX (clean, avoids server clock skew)

    // ------------------------------------------------------
    // Build MintVoucher with chain-based time
    // ------------------------------------------------------
    const voucher = {
      to: userAddress as Address,
      fid: BigInt(fid),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    };

    // ------------------------------------------------------
    // Sign voucher with backend signer
    // ------------------------------------------------------
    const privateKey = process.env.MINTER_PRIVATE_KEY as `0x${string}`;
    const account = privateKeyToAccount(privateKey);

    // Build EIP-712 structure
    const domain = {
      name: 'Geoplets',
      version: '1',
      chainId: GEOPLET_CONFIG.chainId,
      verifyingContract: GEOPLET_CONFIG.address,
    };

    const types = {
      MintVoucher: [
        { name: 'to', type: 'address' },
        { name: 'fid', type: 'uint256' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
    };

    const signature = await account.signTypedData({
      domain,
      types,
      primaryType: 'MintVoucher',
      message: voucher,
    });

    return NextResponse.json({
      success: true,
      voucher,
      signature,
      paymentHeader,
    });
  } catch (error) {
    console.error('Mint signature error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        code: AppError.SERVER_ERROR,
      },
      { status: 500 }
    );
  }
}

🔍 WHAT CHANGED EXACTLY (only 3 lines)
✔️ 1. Create a Base RPC client
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.ALCHEMY_URL),
});

✔️ 2. Get accurate chain timestamp
const block = await publicClient.getBlock();
const chainNow = Number(block.timestamp);

✔️ 3. Use chain time for nonce + deadline
const deadline = chainNow + 3600;
const nonce = chainNow;


Everything else stays the same.

🧠 Why this works

Your contract enforces:

block.timestamp <= deadline
deadline <= block.timestamp + 3600


If your backend uses Date.now():

server might be 10–40 mins ahead

simulation fails → mobile wallets fail

after 30–45 mins blockchain catches up → mint succeeds

EXACT symptoms you described

Using chain time eliminates ALL skew.

🎉 After this fix, you get:

No more “wallet simulation failed”

No more waiting 30–45 minutes

Recovery MintPaidButton works instantly

Mobile minting works reliably

Same behavior across desktop/mobile/miniap frames

Zero changes required in your contract

Zero changes required in frontend mint flow