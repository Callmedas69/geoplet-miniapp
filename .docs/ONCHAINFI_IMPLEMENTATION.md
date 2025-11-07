# Onchain.fi x402 Payment Implementation

Complete documentation of the x402 payment protocol implementation using Onchain.fi aggregator for Geoplet NFT minting.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Implementation](#frontend-implementation)
3. [Backend Implementation](#backend-implementation)
4. [NPM Packages](#npm-packages)
5. [Environment Configuration](#environment-configuration)
6. [Payment Flow](#payment-flow)
7. [API Endpoints](#api-endpoints)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  GenerateMintButton.tsx (UI Component)                          │
│       ↓                                                          │
│  usePayment.ts (Payment Hook)                                   │
│       ↓                                                          │
│  x402-fetch (NPM Package)                                       │
│       - wrapFetchWithPayment()                                   │
│       - Intercepts 402 responses                                │
│       - Prompts wallet for EIP-3009 signature                   │
│       - Retries with X-Payment header                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP POST with X-Payment
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  /api/get-mint-signature/route.ts                              │
│       ↓                                                          │
│  verifyX402Payment()                                            │
│       ↓                                                          │
│  X402Client (NPM Package)                                       │
│       - verifyAndSettle()                                        │
│       - Calls Onchain.fi API                                    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTPS API Call
┌─────────────────────────────────────────────────────────────────┐
│                    ONCHAIN.FI SERVICE                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  https://x402-aggregator-api-production.up.railway.app/v1      │
│       ↓                                                          │
│  POST /verify    - Verifies payment signature                   │
│  POST /settle    - Settles payment on-chain                     │
│  GET /supported  - Gets supported networks                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Routes to Facilitator
┌─────────────────────────────────────────────────────────────────┐
│                    FACILITATOR                                   │
│  (Coinbase CDP, x402.rs, Daydreams, etc.)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  - Submits USDC transfer to Base blockchain                     │
│  - Returns transaction hash                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BASE BLOCKCHAIN                               │
│                                                                   │
│  USDC transfers from User → Treasury (0xFdF53...Acd0)          │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend Payment UI | React + TypeScript | User interface for payment flow |
| Payment Hook | `usePayment.ts` | React hook managing payment state |
| Payment Interceptor | `x402-fetch` (NPM) | Intercepts 402 responses, prompts wallet |
| Backend API | Next.js API Route | Verifies payments, generates signatures |
| Payment Verifier | `@onchainfi/x402-aggregator-client` (NPM) | Calls Onchain.fi for verification |
| Payment Aggregator | Onchain.fi Service | Routes payments to optimal facilitator |
| Payment Settlement | Facilitators (Coinbase CDP, etc.) | Executes USDC transfer on-chain |

---

## Frontend Implementation

### 1. UI Component: `components/GenerateMintButton.tsx`

**Purpose:** Manages the complete minting flow with payment-first approach

**Flow States:**
```typescript
type ButtonState =
  | "idle"              // Check USDC balance
  | "insufficient_usdc" // Show "Get USDC" button
  | "paying"            // User approving payment in wallet
  | "paid"              // Payment complete, ready to generate
  | "generating"        // Creating geometric image
  | "ready_to_mint"     // Image generated, ready to mint
  | "minting"           // Submitting mint transaction
  | "success"           // NFT minted!
  | "already_minted";   // FID already used
```

**Key Function - `handlePayment()`** (Lines 98-140):
```typescript
const handlePayment = async () => {
  if (!fid) {
    toast.error("Warplet not loaded");
    return;
  }

  try {
    setState("paying");
    toast.info("Please approve payment in your wallet...");

    // x402-fetch will handle the payment flow automatically
    const signature = await requestMintSignature(fid.toString());

    setSignatureData(signature);
    setState("paid");
    toast.success("Payment verified! Now let's create your art.");
  } catch (error) {
    console.error("Payment error:", error);

    // Error handling logic...
    // - Insufficient USDC
    // - User rejected payment
    // - Network errors
  }
};
```

**User Experience:**
1. User clicks "Pay $2 USDC"
2. Wallet prompts for signature approval
3. User signs (gasless - EIP-3009)
4. Button changes to "Generate Artwork"
5. User clicks "Generate Artwork"
6. Image generates from Warplet data
7. Button changes to "Mint NFT"
8. User mints NFT with pre-authorized signature

---

### 2. Payment Hook: `hooks/usePayment.ts`

**Purpose:** Encapsulates x402 payment logic and state management

**Key Function - `requestMintSignature()`** (Lines 55-122):
```typescript
const requestMintSignature = async (fid: string): Promise<MintSignatureResponse> => {
  try {
    // Step 1: Validate wallet connection
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!walletClient?.account) {
      throw new Error('Wallet client not available');
    }

    setStatus('processing');
    setError(null);

    // Step 2: Wrap fetch with x402 payment handling
    // x402-fetch expects either a WalletClient or LocalAccount
    // wagmi's walletClient is compatible with x402's EvmSigner type
    const maxPaymentAmount = BigInt(2 * 10 ** 6); // 2.00 USDC (6 decimals)
    const fetchWithPayment = wrapFetchWithPayment(
      fetch,                // Standard fetch API
      walletClient as any,  // User's wallet from wagmi
      maxPaymentAmount      // Maximum payment amount
    );

    console.log('Requesting mint signature with x402 payment...');

    // Step 3: Make request (x402-fetch handles payment flow automatically)
    // This will:
    // 1. Send initial request
    // 2. Receive 402 Payment Required
    // 3. Prompt wallet for $2 USDC payment signature
    // 4. Retry with X-Payment header
    // 5. Return mint signature
    const response = await fetchWithPayment(`${API_BASE_URL}/api/get-mint-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: address,
        fid,
      }),
    });

    // Step 4: Handle response
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'Payment verification failed'
      }));
      throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
    }

    setStatus('verifying');

    const data = await response.json();

    if (!data.success || !data.voucher || !data.signature) {
      throw new Error('Invalid response from server');
    }

    console.log('Payment verified and signature received!');

    setSignatureData(data);
    setStatus('success');

    return data; // { voucher, signature }
  } catch (err: any) {
    console.error('Payment error:', err);
    const errorMessage = err?.message || 'Payment failed';
    setError(errorMessage);
    setStatus('error');
    throw new Error(errorMessage);
  }
};
```

**Return Type:**
```typescript
export interface MintSignatureResponse {
  voucher: {
    to: string;      // User's address
    fid: string;     // Farcaster ID
    nonce: string;   // Timestamp-based nonce
    deadline: string; // Signature expiry (5 minutes)
  };
  signature: string; // EIP-712 signature from backend
}
```

**What `wrapFetchWithPayment()` Does:**
1. Wraps standard `fetch()` with payment interceptor
2. Detects `402 Payment Required` responses
3. Parses x402 payment schema from response
4. Prompts user's wallet for EIP-3009 signature
5. User signs gasless USDC transfer authorization
6. Creates `X-Payment` header (base64-encoded authorization)
7. Automatically retries request with payment header
8. Returns successful response with mint signature

---

## Backend Implementation

### API Route: `app/api/get-mint-signature/route.ts`

**Purpose:** Handles payment verification and mint signature generation

#### Payment Configuration (Lines 30-35)
```typescript
// Payment configuration
const MINT_PRICE = '2.00'; // $2.00 USDC

// Signer configuration
const PRIVATE_KEY = process.env.PRIVATE_KEY as string;
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS as string;
```

#### Environment Validation (Lines 38-42)
```typescript
function validateEnv() {
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not configured');
  if (!RECIPIENT_ADDRESS) throw new Error('RECIPIENT_ADDRESS not configured');
  if (!process.env.ONCHAIN_FI_API_KEY) throw new Error('ONCHAIN_FI_API_KEY not configured');
}
```

#### Payment Verification (Lines 56-115)
```typescript
/**
 * Verify and settle x402 payment via Onchain.fi SDK
 *
 * This function calls Onchain.fi's verifyAndSettle() which:
 * 1. Verifies the EIP-3009 payment signature
 * 2. Routes to optimal facilitator (Coinbase CDP, x402.rs, etc.)
 * 3. Settles payment on-chain (USDC transfers to treasury)
 * 4. Returns transaction hash for confirmation
 *
 * @param paymentHeader - Base64-encoded x402 payment authorization
 * @returns true if payment verified AND settled successfully
 */
async function verifyX402Payment(paymentHeader: string): Promise<boolean> {
  try {
    // Step 1: Initialize Onchain.fi client
    const client = new X402Client({
      apiKey: process.env.ONCHAIN_FI_API_KEY!,
    });

    // Step 2: Decode payment header to log details (debugging)
    try {
      const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());
      console.log('[ONCHAIN.FI] Payment Details:', {
        from: decoded.payload?.authorization?.from,
        to: decoded.payload?.authorization?.to,
        value: decoded.payload?.authorization?.value,
        scheme: decoded.scheme,
        network: decoded.network,
      });
    } catch (e) {
      console.log('[ONCHAIN.FI] Could not decode payment header');
    }

    console.log('[ONCHAIN.FI] Verifying and settling x402 payment...');

    // Step 3: Call Onchain.fi verifyAndSettle()
    // This method:
    // - First calls POST /verify to validate signature
    // - Then calls POST /settle to execute USDC transfer
    const result = await client.verifyAndSettle(
      paymentHeader,  // Base64-encoded payment authorization
      {
        network: 'base',                    // Base Mainnet
        expectedAmount: MINT_PRICE,         // 2.00 USDC
        expectedToken: 'USDC',              // USDC token
        recipientAddress: RECIPIENT_ADDRESS, // Treasury address
      }
    );

    console.log('[ONCHAIN.FI] Payment result:', {
      verified: result.verified,     // Signature valid?
      settled: result.settled,       // USDC transferred?
      txHash: result.txHash,         // Transaction hash
      facilitator: result.facilitator, // Which facilitator was used
    });

    // Step 4: Check both verification AND settlement
    if (result.verified && result.settled) {
      console.log('[ONCHAIN.FI] ✅ Payment successful! USDC transferred to treasury');
      console.log('[ONCHAIN.FI] Transaction hash:', result.txHash);
      console.log('[ONCHAIN.FI] Treasury address:', RECIPIENT_ADDRESS);
      return true;
    } else {
      console.error('[ONCHAIN.FI] ❌ Payment failed:', {
        verified: result.verified,
        settled: result.settled,
        reason: 'Payment not fully settled on-chain',
      });
      return false;
    }
  } catch (error: unknown) {
    console.error('[ONCHAIN.FI] Payment verification error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      error: error,
    });
    return false;
  }
}
```

#### POST Handler Flow (Lines 205-280)
```typescript
export async function POST(request: NextRequest) {
  try {
    // Step 1: Validate environment variables
    validateEnv();

    // Step 2: Parse request body
    const body = await request.json();
    const { userAddress, fid } = body;

    // Validate required fields
    if (!userAddress || !fid) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, fid' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Step 3: Check for X-Payment header
    const paymentHeader = request.headers.get('X-Payment');

    if (!paymentHeader) {
      // No payment header = first request
      // Return 402 Payment Required with x402 schema
      return NextResponse.json(
        {
          x402Version: 1,
          accepts: [
            {
              scheme: 'exact',                      // Exact amount required
              network: 'base',                      // Base network
              maxAmountRequired: '2000000',         // 2.00 USDC (6 decimals)
              asset: USDC_ADDRESS,                  // USDC contract address
              payTo: RECIPIENT_ADDRESS,             // Treasury address
              description: 'Mint your unique Geoplet NFT based on your Warplet - A one-of-a-kind geometric art piece permanently stored on Base blockchain.',
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

    // Step 4: Verify and settle payment via Onchain.fi
    console.log('Verifying and settling x402 payment via Onchain.fi...');
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

    // Step 5: Generate EIP-712 signature for mint voucher
    console.log('Generating mint signature for:', { userAddress, fid });
    const { voucher, signature } = await generateMintSignature(userAddress as Address, fid);

    // Step 6: Return success response with signature
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

  } catch (error: unknown) {
    console.error('Get mint signature error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate mint signature';
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: errorMessage,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

---

## NPM Packages

### 1. Frontend: `x402-fetch`

**Package:** `x402-fetch`
**Version:** `^0.7.0`
**Purpose:** Client-side payment interceptor
**NPM:** https://www.npmjs.com/package/x402-fetch

**Installation:**
```bash
npm install x402-fetch
```

**Key Function:**
```typescript
import { wrapFetchWithPayment } from 'x402-fetch';

const fetchWithPayment = wrapFetchWithPayment(
  fetch: typeof fetch,           // Standard fetch API
  signer: EvmSigner,             // User's wallet client (wagmi)
  maxValue: bigint               // Maximum payment amount
): typeof fetch
```

**What it does:**
- Wraps standard `fetch()` function
- Intercepts HTTP 402 responses
- Parses x402 payment schema
- Prompts wallet for EIP-3009 signature
- Creates `X-Payment` header
- Automatically retries request with payment

**Signature Format (EIP-3009):**
```typescript
interface EIP3009Authorization {
  from: string;      // Payer address
  to: string;        // Recipient address
  value: string;     // Amount in atomic units
  validAfter: number;
  validBefore: number;
  nonce: string;
  v: number;         // Signature components
  r: string;
  s: string;
}
```

---

### 2. Backend: `@onchainfi/x402-aggregator-client`

**Package:** `@onchainfi/x402-aggregator-client`
**Version:** `^0.1.2`
**Purpose:** Server-side Onchain.fi integration
**NPM:** https://www.npmjs.com/package/@onchainfi/x402-aggregator-client
**GitHub:** https://github.com/onchainfi/x402-aggregator-client

**Installation:**
```bash
npm install @onchainfi/x402-aggregator-client
```

**Key Class:**
```typescript
import { X402Client } from '@onchainfi/x402-aggregator-client';

class X402Client {
  constructor(config: {
    apiKey: string;                // Required: Onchain.fi API key
    apiBaseUrl?: string;           // Optional: Override API endpoint
    timeout?: number;              // Optional: Request timeout (default: 30000ms)
    retries?: number;              // Optional: Retry attempts (default: 3)
    retryDelay?: number;           // Optional: Retry delay (default: 1000ms)
    logger?: Logger;               // Optional: Custom logger
  });

  // Verify payment signature only
  async verify(request: VerifyRequest): Promise<VerificationResult>;

  // Settle payment on-chain only
  async settle(request: SettleRequest): Promise<SettlementResult>;

  // Verify AND settle (convenience method)
  async verifyAndSettle(
    paymentHeader: string,
    options: {
      network: string;
      expectedAmount: string;
      expectedToken: string;
      recipientAddress: string;
      priority?: 'low' | 'medium' | 'high';
    }
  ): Promise<PaymentResult>;

  // Get supported networks
  async getSupportedNetworks(): Promise<SupportedNetworksResponse>;
}
```

**Response Types:**
```typescript
interface PaymentResult {
  verified: boolean;      // Signature valid?
  settled: boolean;       // USDC transferred?
  txHash?: string;        // Transaction hash
  facilitator: string;    // Facilitator used (e.g., "coinbase-cdp")
  amount?: string;        // Amount transferred
  token?: string;         // Token transferred
  error?: string;         // Error message if failed
}
```

**Default API Base URL:**
```
https://x402-aggregator-api-production.up.railway.app/v1
```

Can be overridden via `apiBaseUrl` config option.

---

## Environment Configuration

### `.env.local`

```bash
# ============================================
# BACKEND SIGNER
# ============================================
# Private key for signing EIP-712 mint vouchers
# IMPORTANT: Keep this secret! Rotate if compromised.
PRIVATE_KEY=0xa7319d591eef66d814ef03dde69353e6956ea4e31ee674299cf83c2642ccf116

# Public address of the backend signer
# This address must match the signerWallet in the Geoplet contract
SIGNER_WALLET=0x127E3d1c1ae474A688789Be39fab0da6371926A7

# ============================================
# ONCHAIN.FI PAYMENT PROTOCOL
# ============================================
# API key for Onchain.fi x402 aggregator service
# Get your API key at: https://onchain.fi
ONCHAIN_FI_API_KEY=onchain_8545d9f230ea9b7a5e53c3f36b249d339d84e332012a16feae0bb8ce0c768f03

# ============================================
# PAYMENT CONFIGURATION
# ============================================
# Treasury address where USDC payments are sent
# Users pay 2.00 USDC to this address when minting
NEXT_PUBLIC_RECIPIENT_ADDRESS=0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0

# USDC contract address on Base Mainnet
NEXT_PUBLIC_BASE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Base Mainnet RPC URL
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# ============================================
# APPLICATION
# ============================================
# Public URL for your application (used for API calls)
NEXT_PUBLIC_APP_URL=https://596835f84e27.ngrok-free.app
```

### Required Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `PRIVATE_KEY` | Backend signer private key for EIP-712 signatures | ✅ Yes |
| `SIGNER_WALLET` | Backend signer public address | ✅ Yes |
| `ONCHAIN_FI_API_KEY` | Onchain.fi API authentication | ✅ Yes |
| `NEXT_PUBLIC_RECIPIENT_ADDRESS` | Treasury address for USDC payments | ✅ Yes |
| `NEXT_PUBLIC_BASE_USDC_ADDRESS` | USDC contract address on Base | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | Application public URL | ✅ Yes |

---

## Payment Flow

### Complete End-to-End Flow

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: USER INITIATES PAYMENT                                 │
└────────────────────────────────────────────────────────────────┘
User clicks "Pay $2 USDC" button
    ↓
GenerateMintButton.handlePayment() called
    ↓
usePayment.requestMintSignature(fid) called
    ↓
wrapFetchWithPayment() wraps standard fetch

┌────────────────────────────────────────────────────────────────┐
│ STEP 2: INITIAL REQUEST (NO PAYMENT)                          │
└────────────────────────────────────────────────────────────────┘
POST /api/get-mint-signature
Headers: Content-Type: application/json
Body: { userAddress, fid }
    ↓
Backend checks for X-Payment header → NOT FOUND
    ↓
Backend returns 402 Payment Required with x402 schema:
{
  x402Version: 1,
  accepts: [{
    scheme: 'exact',
    network: 'base',
    maxAmountRequired: '2000000',    // 2.00 USDC
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
    description: 'Mint your unique Geoplet NFT...'
  }]
}

┌────────────────────────────────────────────────────────────────┐
│ STEP 3: PAYMENT SIGNATURE (EIP-3009)                          │
└────────────────────────────────────────────────────────────────┘
x402-fetch intercepts 402 response
    ↓
Parses payment requirements
    ↓
Prompts user's wallet to sign EIP-3009 authorization
    ↓
User approves in wallet (gasless signature)
    ↓
Wallet signs transferWithAuthorization:
{
  from: user.address,
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '2000000',  // 2.00 USDC (6 decimals)
  validAfter: 0,
  validBefore: MAX_UINT256,
  nonce: random(),
  signature: { v, r, s }
}

┌────────────────────────────────────────────────────────────────┐
│ STEP 4: RETRY WITH PAYMENT                                    │
└────────────────────────────────────────────────────────────────┘
x402-fetch creates X-Payment header:
{
  scheme: 'exact',
  network: 'base',
  payload: {
    authorization: { from, to, value, ... },
    signature: '0x...'
  }
}
    ↓
Base64 encode the payment header
    ↓
Retry POST /api/get-mint-signature
Headers:
  Content-Type: application/json
  X-Payment: <base64-encoded-authorization>
Body: { userAddress, fid }

┌────────────────────────────────────────────────────────────────┐
│ STEP 5: BACKEND PAYMENT VERIFICATION                          │
└────────────────────────────────────────────────────────────────┘
Backend receives X-Payment header
    ↓
Decode payment header
    ↓
Call verifyX402Payment(paymentHeader)
    ↓
Initialize X402Client with Onchain.fi API key
    ↓
Call client.verifyAndSettle(paymentHeader, options)

┌────────────────────────────────────────────────────────────────┐
│ STEP 6: ONCHAIN.FI VERIFICATION                               │
└────────────────────────────────────────────────────────────────┘
X402Client calls POST /verify
Endpoint: https://x402-aggregator-api-production.up.railway.app/v1/verify
    ↓
Onchain.fi verifies:
  ✅ Signature is valid (EIP-3009)
  ✅ Amount matches expected (2.00 USDC)
  ✅ Token matches (USDC)
  ✅ Recipient matches treasury address
  ✅ Network is Base Mainnet
    ↓
Returns: { valid: true, facilitator: 'coinbase-cdp', ... }

┌────────────────────────────────────────────────────────────────┐
│ STEP 7: ONCHAIN.FI SETTLEMENT                                 │
└────────────────────────────────────────────────────────────────┘
X402Client calls POST /settle
Endpoint: https://x402-aggregator-api-production.up.railway.app/v1/settle
    ↓
Onchain.fi routes to optimal facilitator (e.g., Coinbase CDP)
    ↓
Facilitator submits transaction to Base Mainnet:
  Function: USDC.transferWithAuthorization(
    from: user.address,
    to: treasury.address,
    value: 2000000,
    validAfter: 0,
    validBefore: MAX_UINT256,
    nonce: nonce,
    v: v, r: r, s: s
  )
    ↓
Transaction mined on Base Mainnet
    ↓
USDC transfers from User → Treasury
    ↓
Facilitator returns txHash to Onchain.fi
    ↓
Onchain.fi returns: { settled: true, txHash: '0x...', ... }

┌────────────────────────────────────────────────────────────────┐
│ STEP 8: BACKEND GENERATES MINT SIGNATURE                      │
└────────────────────────────────────────────────────────────────┘
Backend verifies: result.verified && result.settled
    ↓
Payment confirmed! Now generate mint signature
    ↓
Create mint voucher:
{
  to: userAddress,
  fid: fid,
  nonce: Date.now(),
  deadline: Date.now() + 300  // 5 minutes
}
    ↓
Sign voucher with backend private key (EIP-712)
    ↓
Verify signature locally (Signature Doctor)
    ↓
Return to frontend:
{
  success: true,
  voucher: { to, fid, nonce, deadline },
  signature: '0x...'
}

┌────────────────────────────────────────────────────────────────┐
│ STEP 9: FRONTEND RECEIVES SIGNATURE                           │
└────────────────────────────────────────────────────────────────┘
x402-fetch returns response
    ↓
usePayment hook receives data
    ↓
Store signatureData in state
    ↓
Update status to 'success'
    ↓
Button changes to "Generate Artwork"

┌────────────────────────────────────────────────────────────────┐
│ STEP 10: USER GENERATES IMAGE & MINTS                         │
└────────────────────────────────────────────────────────────────┘
User clicks "Generate Artwork"
    ↓
Generate geometric image from Warplet data
    ↓
Button changes to "Mint NFT"
    ↓
User clicks "Mint NFT"
    ↓
Call Geoplet.mintGeoplet(voucher, imageData, signature)
    ↓
Contract verifies EIP-712 signature
    ↓
NFT minted! ✅
```

### Timing

| Step | Average Time |
|------|-------------|
| Initial 402 response | ~100ms |
| User wallet signature | 5-30 seconds (user dependent) |
| Onchain.fi verify | ~500ms |
| Onchain.fi settle | 2-5 seconds (blockchain confirmation) |
| Backend signature generation | ~100ms |
| Total | ~10-40 seconds |

---

## API Endpoints

### Onchain.fi Aggregator Endpoints

**Base URL:** `https://x402-aggregator-api-production.up.railway.app/v1`

#### 1. POST /verify

**Purpose:** Verify payment signature

**Request:**
```typescript
POST /v1/verify
Headers:
  Authorization: Bearer {ONCHAIN_FI_API_KEY}
  Content-Type: application/json

Body:
{
  paymentHeader: string;      // Base64-encoded payment authorization
  network: string;            // 'base'
  expectedAmount: string;     // '2.00'
  expectedToken: string;      // 'USDC'
  recipientAddress: string;   // Treasury address
  priority?: 'low' | 'medium' | 'high';
}
```

**Response:**
```typescript
{
  valid: boolean;
  facilitator: string;    // e.g., 'coinbase-cdp'
  from: string;           // Payer address
  to: string;             // Recipient address
  amount: string;         // Amount verified
  token: string;          // Token type
  reason?: string;        // Error reason if invalid
}
```

---

#### 2. POST /settle

**Purpose:** Settle payment on-chain (transfer USDC)

**Request:**
```typescript
POST /v1/settle
Headers:
  Authorization: Bearer {ONCHAIN_FI_API_KEY}
  Content-Type: application/json

Body:
{
  paymentHeader: string;  // Base64-encoded payment authorization
  network: string;        // 'base'
  priority?: 'low' | 'medium' | 'high';
}
```

**Response:**
```typescript
{
  settled: boolean;
  facilitator: string;    // e.g., 'coinbase-cdp'
  txHash: string;         // Transaction hash
  reason?: string;        // Error reason if failed
}
```

---

#### 3. GET /supported

**Purpose:** Get supported networks and features

**Request:**
```typescript
GET /v1/supported
Headers:
  Authorization: Bearer {ONCHAIN_FI_API_KEY}
```

**Response:**
```typescript
{
  networks: string[];     // ['base', 'ethereum', ...]
  tokens: {
    [network: string]: string[];  // { base: ['USDC', 'USDT', ...] }
  };
  facilitators: string[]; // ['coinbase-cdp', 'x402.rs', ...]
}
```

---

### Your Backend Endpoint

#### POST /api/get-mint-signature

**Purpose:** Handle payment and generate mint signature

**Initial Request (No Payment):**
```typescript
POST /api/get-mint-signature
Headers:
  Content-Type: application/json

Body:
{
  userAddress: string;  // User's wallet address
  fid: string;          // Farcaster ID
}

Response (402):
{
  x402Version: 1,
  accepts: [{
    scheme: 'exact',
    network: 'base',
    maxAmountRequired: '2000000',
    asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
    description: 'Mint your unique Geoplet NFT...'
  }],
  error: 'Payment Required'
}
```

**Retry with Payment:**
```typescript
POST /api/get-mint-signature
Headers:
  Content-Type: application/json
  X-Payment: <base64-encoded-payment-authorization>

Body:
{
  userAddress: string;
  fid: string;
}

Response (200):
{
  success: true,
  voucher: {
    to: string;
    fid: string;
    nonce: string;
    deadline: string;
  },
  signature: string;
  message: 'Mint signature generated successfully'
}
```

---

## Security Considerations

### 1. Private Key Management

**Current Implementation:**
- Private key stored in `.env.local` (gitignored)
- Used to sign EIP-712 mint vouchers
- Never exposed to frontend

**Production Recommendations:**
- Use separate development and production keys
- Store production key in hosting platform secrets (Vercel, Railway, etc.)
- Consider hardware wallet for production signer
- Implement key rotation process
- Monitor signer wallet for unauthorized signatures

**Why Backend Signing is Necessary:**
- Prevents users from minting without payment
- Controls who can mint (payment gating)
- Signatures are single-use (nonce-based)
- Signatures expire (5-minute deadline)

---

### 2. Payment Security

**EIP-3009 (transferWithAuthorization):**
- Gasless USDC transfers
- Signed authorization, not actual transaction
- Requires settlement by facilitator
- Replay protection via nonce
- Time-bounded via validAfter/validBefore

**Onchain.fi Verification:**
- Validates signature cryptographically
- Checks amount, token, recipient
- Ensures network matches
- Prevents replay attacks

**Backend Validation:**
- Checks both `result.verified` AND `result.settled`
- Only generates mint signature after payment settles
- Logs transaction hash for audit trail

---

### 3. Signature Expiration

**Mint Voucher Deadline:**
```typescript
const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
```

**Why 5 Minutes:**
- Prevents signature hoarding
- Reduces replay attack window
- Forces fresh payment for each mint
- Balances security and user experience

**Contract Validation:**
```solidity
require(block.timestamp <= voucher.deadline, "Signature expired");
```

---

### 4. Replay Protection

**Frontend (EIP-3009):**
- Each payment uses random nonce
- Nonce tracked by USDC contract
- Cannot reuse same authorization

**Backend (EIP-712):**
- Uses timestamp-based nonce
- Contract tracks used signatures via digest
- Prevents signature replay

**Contract Implementation:**
```solidity
// Calculate EIP-712 digest
bytes32 digest = _hashTypedDataV4(
    keccak256(abi.encode(
        MINT_VOUCHER_TYPEHASH,
        voucher.to,
        voucher.fid,
        voucher.nonce,
        voucher.deadline
    ))
);

// Check digest not already used
require(!usedSignatures[digest], "Signature already used");

// Mark digest as used
usedSignatures[digest] = true;
```

---

### 5. CORS Protection

**CORS Headers:**
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment',
};
```

**Recommendations for Production:**
- Set specific `NEXT_PUBLIC_APP_URL` (not `*`)
- Implement rate limiting
- Add request signing
- Monitor for suspicious patterns

---

## Troubleshooting

### Common Issues

#### 1. Payment Fails with "User Rejected"

**Symptom:** User sees wallet prompt but cancels

**Solution:**
- Expected behavior
- User can retry by clicking button again
- No funds are charged for rejected signatures

---

#### 2. Payment Verification Error (HTTP 502)

**Symptom:** `[ONCHAIN.FI] Payment verification error: HTTP 502`

**Causes:**
- Onchain.fi service temporarily down
- Network connectivity issues
- Timeout during settlement

**Solutions:**
- Retry payment
- Check Onchain.fi status
- Increase timeout in X402Client config
- Check network connectivity

---

#### 3. "Signature Already Used"

**Symptom:** Mint fails with signature already used error

**Cause:** User trying to reuse same mint signature

**Solution:**
- Request new payment and signature
- Each mint requires fresh payment

---

#### 4. "Signature Expired"

**Symptom:** Mint fails with signature expired error

**Cause:** More than 5 minutes passed since payment

**Solution:**
- Request new payment and signature
- Generate image faster
- Consider extending deadline if needed

---

#### 5. "Insufficient USDC"

**Symptom:** Payment fails with insufficient balance

**Cause:** User has less than 2.00 USDC

**Solution:**
- App shows "Get USDC" button
- Opens Uniswap to buy USDC on Base
- User needs to acquire USDC first

---

### Debugging Tools

#### Console Logs

**Frontend:**
```typescript
console.log('Requesting mint signature with x402 payment...');
console.log('Payment verified and signature received!');
```

**Backend:**
```typescript
console.log('[ONCHAIN.FI] Payment Details:', {...});
console.log('[ONCHAIN.FI] Verifying and settling x402 payment...');
console.log('[ONCHAIN.FI] Payment result:', {...});
console.log('[ONCHAIN.FI] ✅ Payment successful! USDC transferred to treasury');
console.log('[ONCHAIN.FI] Transaction hash:', result.txHash);
```

#### Check USDC Transfer

**Verify payment on BaseScan:**
```
https://basescan.org/tx/{txHash}
```

**Check treasury balance:**
```
https://basescan.org/address/0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0
```

**Check USDC contract:**
```
https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```

---

## Summary

### Architecture Benefits

✅ **Decentralized Payments** - No centralized payment processor
✅ **Optimal Routing** - Onchain.fi routes to best facilitator
✅ **Gasless for User** - EIP-3009 requires no gas for payment signature
✅ **On-Chain Settlement** - Real USDC transfers verified on-chain
✅ **Secure** - Multiple layers of signature verification
✅ **Payment Gating** - Users must pay before minting
✅ **Professional** - Production-ready implementation

### Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `components/GenerateMintButton.tsx` | 328 | UI component managing payment flow |
| `hooks/usePayment.ts` | 147 | React hook for payment logic |
| `app/api/get-mint-signature/route.ts` | ~300 | Backend payment verification |
| `x402-fetch` (NPM) | - | Frontend payment interceptor |
| `@onchainfi/x402-aggregator-client` (NPM) | - | Backend Onchain.fi SDK |

### Payment Flow Summary

1. User clicks "Pay $2 USDC"
2. Wallet prompts for signature (EIP-3009)
3. User signs authorization (gasless)
4. Onchain.fi verifies signature
5. Facilitator settles payment on Base
6. USDC transfers to treasury
7. Backend generates mint signature
8. User generates image
9. User mints NFT
10. Success! ✅

---

## References

- **x402 Protocol:** https://github.com/x402protocol/x402
- **Onchain.fi:** https://onchain.fi
- **EIP-3009:** https://eips.ethereum.org/EIPS/eip-3009
- **EIP-712:** https://eips.ethereum.org/EIPS/eip-712
- **Base Mainnet:** https://base.org
- **USDC on Base:** https://basescan.org/token/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

---

**Last Updated:** 2025-01-03
**Version:** 1.0
**Network:** Base Mainnet (Chain ID: 8453)
**Mint Price:** 2.00 USDC
