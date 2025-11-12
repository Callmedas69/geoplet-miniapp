# Payment Tracker System Design

**Author:** Claude (AI Advisor)
**Date:** 2025-01-12
**Status:** Proposal
**Principle:** KISS (Keep It Simple, Stupid)

---

## Executive Summary

A minimal payment tracking system to handle failures in the "payment first, then regenerate/mint" flow. Uses Supabase with composite key (FID + payment type) to enable payment recovery after network errors, page navigation, or transaction rejection.

**Key Decision:** Use FID + payment type as natural composite key (not UUID, not OnchainFi tx hash).

---

## Problem Statement

### Current Flow
```
Payment → Verification → [DEFER Settlement] → Simulation → Settlement → Mint
```

### Critical Gaps
1. **No persistence**: Payment data lives in component state only (lost on refresh)
2. **No recovery**: User pays $1 but closes page → payment lost
3. **No audit trail**: Settlement tx hash logged but not stored
4. **No retry logic**: Network error during settlement → user must re-pay

### User-Reported Failures
- Settlement succeeded but user navigated away → cannot resume mint
- Mint transaction rejected by user → cannot retry without re-payment
- Signature expired (>5min) → unclear error, forces re-payment
- **💰 CRITICAL: Payment settled but OpenAI credit limit reached** → User paid $0.90 but no image generated
- **💰 CRITICAL: Payment settled but wallet simulation fails** → User paid $1.00 but cannot mint

---

## Solution Architecture

### Design Principles
1. **KISS**: One table, natural key, minimal API surface
2. **Security**: Not negotiable - RLS policies, validated transitions
3. **Professional**: Audit trail, error tracking, automatic cleanup
4. **Not Over-Engineering**: No microservices, no event sourcing, no blockchain queries

### Key Decisions

#### Tracking ID: FID + Payment Type (Composite Key)

**Options Considered:**
| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **OnchainFi TX Hash** | Simple, one source of truth | ❌ Only available AFTER settlement | ❌ Cannot track verify→settle lifecycle |
| **UUID per payment** | Unique, supports multiple pending | Requires ID propagation through all APIs | ❌ Over-engineering |
| **Payment header hash** | Deterministic, no generation | Less readable for debugging | ❌ Complexity without benefit |
| **FID + Payment Type** | Natural key, matches business logic | One payment per user per type | ✅ **CHOSEN** |

**Rationale:**
- Matches existing `unminted_geoplets` table (UPSERT on FID conflict)
- One user = one pending mint + one pending regenerate (business constraint)
- Easy queries: "Show payment status for FID 12345's mint"
- No UUID generation or propagation needed

---

## Database Schema

### Table: `payment_tracking`

```sql
CREATE TABLE payment_tracking (
  -- Composite Primary Key
  fid BIGINT NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('mint', 'regenerate')),

  -- Payment Data
  user_address TEXT NOT NULL,
  payment_header TEXT,  -- Base64 x402 authorization (for settlement retry)

  -- Mint-specific data (NULL for regenerate)
  mint_voucher JSONB,  -- { to, fid, nonce, deadline }
  mint_signature TEXT,  -- EIP-712 signature

  -- Settlement Data
  settlement_tx_hash TEXT,  -- OnchainFi tx hash (NULL until settled)

  -- Status Tracking
  status TEXT NOT NULL CHECK (status IN (
    'verified',      -- Payment verified, not yet settled
    'settling',      -- Settlement in progress
    'settled',       -- USDC transferred onchain (for mint) OR Image generation pending (for regenerate)
    'minting',       -- Mint transaction submitted
    'minted',        -- NFT minted successfully
    'completed',     -- Regenerate: Image generated successfully
    'failed'         -- Unrecoverable error
  )),

  -- Error Tracking
  error_code TEXT,
  error_message TEXT,
  retry_count INT DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  minted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,  -- Signature expiration (created_at + 5 min)

  -- Constraints
  PRIMARY KEY (fid, payment_type),
  CONSTRAINT settlement_tx_unique UNIQUE (settlement_tx_hash)
    WHERE settlement_tx_hash IS NOT NULL
);

-- Indexes
CREATE INDEX idx_payment_tracking_status ON payment_tracking(status);
CREATE INDEX idx_payment_tracking_expires ON payment_tracking(expires_at);
```

### Status Lifecycle

**Mint Flow:**
```
verified → settling → settled → minting → minted
    ↓          ↓          ↓         ↓        ↓
                  failed (at any point)
```

**Regenerate Flow:**
```
verified → settling → settled → completed
    ↓          ↓          ↓         ↓
                  failed (at any point)
```

**Note:** `settled` means different things:
- **Mint:** Payment settled, ready to mint (signature valid for 15-30 min)
- **Regenerate:** Payment settled, image generation pending or failed (can retry within 24 hours)

### Data Flow Examples

**Mint Flow:**
```sql
-- 1. After verification (get-mint-signature)
INSERT INTO payment_tracking (
  fid, payment_type, user_address, payment_header,
  mint_voucher, mint_signature, status, expires_at
) VALUES (
  12345, 'mint', '0xABC...', 'base64...',
  '{"to":"0x...","fid":12345,...}', '0xSIG...',
  'verified', NOW() + INTERVAL '5 minutes'
);

-- 2. After settlement (settle-payment)
UPDATE payment_tracking
SET status = 'settled',
    settlement_tx_hash = '0xTXHASH...',
    settled_at = NOW()
WHERE fid = 12345 AND payment_type = 'mint';

-- 3. After mint success (GenerateMintButton)
UPDATE payment_tracking
SET status = 'minted', minted_at = NOW()
WHERE fid = 12345 AND payment_type = 'mint';
```

**Regenerate Flow:**
```sql
-- 1. After verification + immediate settlement (generate-image)
INSERT INTO payment_tracking (
  fid, payment_type, user_address, payment_header,
  settlement_tx_hash, status, settled_at
) VALUES (
  12345, 'regenerate', '0xABC...', 'base64...',
  '0xTXHASH...', 'settled', NOW()
);
```

---

## API Endpoints

### 1. Create/Update Payment Record

**Endpoint:** `POST /api/payment-tracking`

**Purpose:** Track payment after OnchainFi verification succeeds

**Request:**
```typescript
{
  fid: number,
  paymentType: 'mint' | 'regenerate',
  userAddress: string,
  paymentHeader: string,
  voucher?: {  // Mint only
    to: string,
    fid: bigint,
    nonce: bigint,
    deadline: bigint
  },
  signature?: string,  // Mint only
  settlementTxHash?: string  // Regenerate only (immediate settlement)
}
```

**Response:**
```typescript
{
  status: 'verified' | 'settled',
  expiresAt: string  // ISO 8601 timestamp
}
```

**Implementation:**
```typescript
// UPSERT logic
const expiresAt = new Date(Date.now() + 5 * 60 * 1000);  // 5 minutes

await supabaseAdmin
  .from('payment_tracking')
  .upsert({
    fid,
    payment_type: paymentType,
    user_address: userAddress,
    payment_header: paymentHeader,
    mint_voucher: voucher,
    mint_signature: signature,
    settlement_tx_hash: settlementTxHash,
    status: settlementTxHash ? 'settled' : 'verified',
    verified_at: new Date(),
    settled_at: settlementTxHash ? new Date() : null,
    expires_at: expiresAt,
    retry_count: 0,
    error_code: null
  }, {
    onConflict: 'fid,payment_type'
  });
```

**Called By:**
- `app/api/get-mint-signature/route.ts` (after verification)
- `app/api/generate-image/route.ts` (after verification + settlement)

---

### 2. Get Payment Status

**Endpoint:** `GET /api/payment-tracking/:fid/:paymentType`

**Purpose:** Check for resumable payments on page load

**Response (if found):**
```typescript
{
  status: 'verified' | 'settling' | 'settled' | 'minting',
  mintVoucher?: {
    to: string,
    fid: string,
    nonce: string,
    deadline: string
  },
  mintSignature?: string,
  paymentHeader?: string,
  settlementTxHash?: string,
  expiresAt: string,
  canResume: boolean,  // Computed: status='settled' AND not expired
  isExpired: boolean   // Computed: NOW() > expiresAt
}
```

**Response (if not found):**
```typescript
{
  status: null,
  canResume: false
}
```

**Implementation:**
```typescript
const payment = await supabaseAdmin
  .from('payment_tracking')
  .select('*')
  .eq('fid', fid)
  .eq('payment_type', paymentType)
  .in('status', ['verified', 'settling', 'settled', 'minting'])
  .single();

if (!payment) {
  return { status: null, canResume: false };
}

const now = new Date();
const expiresAt = new Date(payment.expires_at);
const isExpired = now > expiresAt;

return {
  ...payment,
  canResume: payment.status === 'settled' && !isExpired,
  isExpired
};
```

**Called By:**
- `components/GenerateMintButton.tsx` (on mount)
- `components/MintButton.tsx` (on mount)

---

### 3. Update Settlement Status

**Endpoint:** `PATCH /api/payment-tracking/:fid/:paymentType/settle`

**Purpose:** Update payment record after OnchainFi settlement succeeds

**Request:**
```typescript
{
  settlementTxHash: string
}
```

**Response:**
```typescript
{
  success: true,
  status: 'settled',
  settlementTxHash: string
}
```

**Implementation:**
```typescript
await supabaseAdmin
  .from('payment_tracking')
  .update({
    status: 'settled',
    settlement_tx_hash: settlementTxHash,
    settled_at: new Date()
  })
  .eq('fid', fid)
  .eq('payment_type', paymentType);
```

**Called By:**
- `app/api/settle-payment/route.ts` (after OnchainFi settlement succeeds)

---

### 4. Mark as Minted

**Endpoint:** `PATCH /api/payment-tracking/:fid/:paymentType/mint`

**Purpose:** Mark payment as completed after successful mint transaction

**Request:**
```typescript
{
  mintTxHash: string  // Blockchain transaction hash
}
```

**Response:**
```typescript
{
  success: true,
  status: 'minted'
}
```

**Implementation:**
```typescript
await supabaseAdmin
  .from('payment_tracking')
  .update({
    status: 'minted',
    minted_at: new Date()
  })
  .eq('fid', fid)
  .eq('payment_type', paymentType);
```

**Called By:**
- `components/GenerateMintButton.tsx` (after mint success)
- `components/MintButton.tsx` (after mint success)

---

### 5. Delete Payment (Cleanup)

**Endpoint:** `DELETE /api/payment-tracking/:fid/:paymentType`

**Purpose:** Remove expired or invalid payment records

**Response:**
```typescript
{
  success: true
}
```

**Implementation:**
```typescript
await supabaseAdmin
  .from('payment_tracking')
  .delete()
  .eq('fid', fid)
  .eq('payment_type', paymentType);
```

**Called By:**
- Frontend when signature expired
- Cron job for automatic cleanup

---

## Integration Points

### 1. `app/api/get-mint-signature/route.ts`

**Location:** After payment verification succeeds (~line 237)

**Changes:**
```typescript
// EXISTING: Verify payment
const paymentValid = await verifyX402Payment(
  paymentHeader,
  PAYMENT_CONFIG.MINT.priceAtomic,
  USDC_BASE_ADDRESS,
  RECIPIENT_ADDRESS
);

if (!paymentValid) {
  return NextResponse.json(
    { error: { code: 'PAYMENT_VERIFICATION_FAILED', ... } },
    { status: 402 }
  );
}

// NEW: Track payment in database
try {
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payment-tracking`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fid: voucherParams.fid,
      paymentType: 'mint',
      userAddress: voucherParams.to,
      paymentHeader,
      voucher: voucher,
      signature: signature,
    })
  });
} catch (error) {
  console.error('[TRACKING] Failed to track payment:', error);
  // Continue anyway - tracking failure should not block mint
}

// EXISTING: Return signature response
return NextResponse.json({
  voucher,
  signature,
  paymentHeader
}, { status: 200 });
```

**Error Handling:**
- Tracking failure should NOT block signature generation
- Log error but continue with mint flow
- User can still mint (tracking is for recovery only)

---

### 2. `app/api/settle-payment/route.ts`

**Changes Required:**

#### A. Accept FID and Payment Type in Request

**Current:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentHeader } = body;
  // ...
}
```

**New:**
```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { paymentHeader, fid, paymentType } = body;

  // Validate required fields
  if (!paymentHeader || !fid || !paymentType) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400, headers: corsHeaders }
    );
  }
  // ...
}
```

#### B. Update Tracking After Settlement

**Location:** After OnchainFi settlement succeeds (~line 116)

**Changes:**
```typescript
// EXISTING: Settlement succeeded
console.log('[SETTLE] ✅ Payment settled successfully!');
console.log('[SETTLE] Transaction hash:', settleData.data.txHash);

// NEW: Update payment tracking
try {
  await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/payment-tracking/${fid}/${paymentType}/settle`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settlementTxHash: settleData.data.txHash,
      })
    }
  );
} catch (error) {
  console.error('[TRACKING] Failed to update settlement:', error);
  // Continue anyway - settlement succeeded, tracking is secondary
}

// EXISTING: Return success
return NextResponse.json({
  success: true,
  settled: true,
  txHash: settleData.data.txHash,
  facilitator: settleData.data.facilitator,
}, { status: 200, headers: corsHeaders });
```

#### C. Frontend Changes (Callers)

**GenerateMintButton.tsx (~line 195):**
```typescript
// EXISTING
const settleResponse = await fetch('/api/settle-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ paymentHeader }),
});

// NEW: Add fid and paymentType
const settleResponse = await fetch('/api/settle-payment', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentHeader,
    fid: fid,  // From props/state
    paymentType: 'mint'
  }),
});
```

**MintButton.tsx (~line similar):**
```typescript
// Same changes as GenerateMintButton
```

---

### 3. `app/api/generate-image/route.ts`

**Changes Required:**

#### A. Return Settlement TX Hash in Response

**Location:** After settlement succeeds (~line 163)

**Current:**
```typescript
const settled = await verifyX402Payment(paymentHeader);

if (!settled) {
  return NextResponse.json(
    { success: false, error: 'Payment settlement failed' },
    { status: 402 }
  );
}

// Generate image...
```

**New:**
```typescript
// Modify verifyX402Payment to return tx hash
const settlementResult = await verifyX402Payment(paymentHeader);

if (!settlementResult.success) {
  return NextResponse.json(
    { success: false, error: 'Payment settlement failed' },
    { status: 402 }
  );
}

// Store tx hash
const settlementTxHash = settlementResult.txHash;

// Generate image...
```

**Function Signature Change (~line 37):**
```typescript
// BEFORE
async function verifyX402Payment(paymentHeader: string): Promise<boolean>

// AFTER
async function verifyX402Payment(
  paymentHeader: string
): Promise<{ success: boolean; txHash?: string }>
```

**Return Value Change (~line 163):**
```typescript
// BEFORE
return true;

// AFTER
return {
  success: true,
  txHash: settleData.data.txHash
};
```

#### B. Return TX Hash to Frontend

**Location:** Response (~line 450)

**Current:**
```typescript
return NextResponse.json({
  success: true,
  data: base64String,
}, { status: 200, headers: corsHeaders });
```

**New:**
```typescript
return NextResponse.json({
  success: true,
  data: base64String,
  settlementTxHash: settlementTxHash || null,  // Include tx hash
}, { status: 200, headers: corsHeaders });
```

#### C. Track Payment (Optional for Regenerate)

**Note:** Regenerate flow immediately settles, so tracking is less critical (no deferred settlement). Include if audit trail is desired.

**Location:** After settlement succeeds (~line 170)

**Optional Addition:**
```typescript
// Track regeneration payment (for audit)
if (settlementTxHash && fid) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payment-tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: parseInt(fid),
        paymentType: 'regenerate',
        userAddress: '0x...',  // Extract from payment header if needed
        paymentHeader,
        settlementTxHash,
      })
    });
  } catch (error) {
    console.error('[TRACKING] Failed to track regeneration:', error);
  }
}
```

---

### 4. `components/GenerateMintButton.tsx`

**Changes Required:**

#### A. Check for Resumable Payment on Mount

**Location:** Add new useEffect (~line 90)

```typescript
useEffect(() => {
  const checkResumablePayment = async () => {
    if (!fid) return;

    try {
      const response = await fetch(`/api/payment-tracking/${fid}/mint`);

      if (!response.ok) return;

      const data = await response.json();

      // Handle resumable payment
      if (data.canResume && data.status === 'settled') {
        // Restore state from database
        setSignatureData({
          voucher: data.mintVoucher,
          signature: data.mintSignature,
          paymentHeader: data.paymentHeader,
        });

        // Load generated image from unminted_geoplets or regenerate
        if (generatedImage) {
          setGeneratedImage(generatedImage);
        }

        setState('ready_to_mint');

        toast.info('You have a pending mint. Click to continue!', {
          duration: 5000,
        });

        return;
      }

      // Handle expired signature
      if (data.isExpired && data.status === 'verified') {
        console.log('[RECOVERY] Signature expired, cleaning up...');

        // Delete expired payment
        await fetch(`/api/payment-tracking/${fid}/mint`, {
          method: 'DELETE'
        });

        toast.warning('Your previous payment signature expired. Please pay again.');
      }
    } catch (error) {
      console.error('[RECOVERY] Failed to check resumable payment:', error);
    }
  };

  checkResumablePayment();
}, [fid]);
```

#### B. Mark as Minted After Success

**Location:** After successful mint (~line 215)

**Current:**
```typescript
setState("success");
toast.success("Successfully minted!");
```

**New:**
```typescript
setState("success");
toast.success("Successfully minted!");

// Mark as minted in tracking
try {
  await fetch(`/api/payment-tracking/${fid}/mint/mint`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mintTxHash: writeData,  // Blockchain tx hash
    })
  });
} catch (error) {
  console.error('[TRACKING] Failed to mark as minted:', error);
  // Not critical - mint succeeded
}
```

#### C. Handle Signature Expiration on Retry

**Location:** Before settlement (~line 185)

**New Validation:**
```typescript
// Before settling, check if signature expired
if (signatureData?.voucher?.deadline) {
  const now = Math.floor(Date.now() / 1000);
  const deadline = Number(signatureData.voucher.deadline);

  if (now > deadline) {
    setState('idle');
    setSignatureData(null);

    // Delete expired payment
    await fetch(`/api/payment-tracking/${fid}/mint`, {
      method: 'DELETE'
    });

    throw new AppError(
      PaymentErrorCode.SIGNATURE_EXPIRED,
      'Mint signature expired. Please pay again.',
    );
  }
}

// Proceed with settlement...
```

---

### 5. `components/MintButton.tsx`

**Changes Required:**

**Same modifications as GenerateMintButton:**
1. Check for resumable payment on mount
2. Mark as minted after success
3. Handle signature expiration on retry

**Location:** Same relative locations as GenerateMintButton

---

## Recovery Scenarios

### Scenario 1: Settlement Succeeded but User Closed Page

**Flow:**
1. User pays $1 → Settlement succeeds → Status = `settled`
2. User closes browser tab
3. User returns to app
4. `useEffect` checks `/api/payment-tracking/${fid}/mint`
5. Finds status=`settled`, canResume=true
6. Restores `signatureData` and `generatedImage` from database
7. Sets state to `ready_to_mint`
8. Shows toast: "You have a pending mint. Click to continue!"
9. User clicks mint → Simulation → Mint → Success

**Implementation:** ✅ Covered in Integration Point #4A

**Database State:**
```sql
-- Before user returns
SELECT status, mint_voucher, mint_signature FROM payment_tracking
WHERE fid = 12345 AND payment_type = 'mint';

-- Result:
status: 'settled'
mint_voucher: { "to": "0x...", "fid": 12345, ... }
mint_signature: '0xSIG...'
```

---

### Scenario 2: Mint Transaction Rejected by User

**Flow:**
1. User pays $1 → Settlement succeeds → Status = `settled`
2. User clicks mint → Wallet prompts transaction
3. User clicks "Reject" in wallet
4. Transaction fails, status stays `settled`
5. User clicks mint again → Check signature expiration
6. If valid, retry mint without re-payment
7. If expired, force new payment

**Implementation:** ✅ Covered in Integration Point #4C

**Database State:**
```sql
-- After rejection (status unchanged)
SELECT status FROM payment_tracking
WHERE fid = 12345 AND payment_type = 'mint';

-- Result:
status: 'settled'  -- NOT changed to 'minting' until tx confirmed
```

**Code:**
```typescript
// Before retry, check expiration
const now = Math.floor(Date.now() / 1000);
const deadline = Number(signatureData.voucher.deadline);

if (now > deadline) {
  // Force new payment
  setState('idle');
  setSignatureData(null);
  await fetch(`/api/payment-tracking/${fid}/mint`, { method: 'DELETE' });
  throw new AppError(PaymentErrorCode.SIGNATURE_EXPIRED, 'Signature expired');
} else {
  // Retry mint
  await mintNFT(signatureData, generatedImage);
}
```

---

### Scenario 3: Signature Expired Before Settlement

**Flow:**
1. User pays $1 → Verification succeeds → Status = `verified`
2. User waits 6+ minutes (signature expires at 5 minutes)
3. User clicks mint → Simulation → Settlement attempt
4. Backend checks `expires_at` column
5. If expired, return 402 error with code `SIGNATURE_EXPIRED`
6. Frontend deletes expired payment from tracking
7. Force new payment flow

**Implementation:**

**Backend Validation (`app/api/settle-payment/route.ts`):**
```typescript
export async function POST(req: NextRequest) {
  const { paymentHeader, fid, paymentType } = await req.json();

  // Check payment tracking for expiration
  const payment = await supabaseAdmin
    .from('payment_tracking')
    .select('expires_at')
    .eq('fid', fid)
    .eq('payment_type', paymentType)
    .single();

  if (payment && new Date(payment.expires_at) < new Date()) {
    // Delete expired payment
    await supabaseAdmin
      .from('payment_tracking')
      .delete()
      .eq('fid', fid)
      .eq('payment_type', paymentType);

    return NextResponse.json({
      success: false,
      error: {
        code: 'SIGNATURE_EXPIRED',
        message: 'Payment signature expired. Please pay again.',
      }
    }, { status: 402, headers: corsHeaders });
  }

  // Proceed with settlement...
}
```

**Frontend Handling (`components/GenerateMintButton.tsx`):**
```typescript
try {
  const settleResponse = await fetch('/api/settle-payment', {
    method: 'POST',
    body: JSON.stringify({ paymentHeader, fid, paymentType: 'mint' }),
  });

  if (!settleResponse.ok) {
    const errorData = await settleResponse.json();

    if (errorData.error?.code === 'SIGNATURE_EXPIRED') {
      // Reset to initial state
      setState('idle');
      setSignatureData(null);

      toast.error('Payment signature expired. Please pay again.');
      return;
    }
  }
} catch (error) {
  // Handle error...
}
```

**Database State:**
```sql
-- Before expiration check
SELECT status, created_at, expires_at FROM payment_tracking
WHERE fid = 12345 AND payment_type = 'mint';

-- Result:
status: 'verified'
created_at: '2025-01-12 10:00:00'
expires_at: '2025-01-12 10:05:00'  -- 5 minutes later

-- Current time: 2025-01-12 10:06:00 (EXPIRED)

-- After expiration handling (deleted)
SELECT * FROM payment_tracking WHERE fid = 12345 AND payment_type = 'mint';
-- Result: (empty)
```

---

### Scenario 4: 💰 CRITICAL - Payment Settled but OpenAI Credit Limit Reached (Regenerate)

**Problem:** User paid $0.90, USDC transferred, but OpenAI API fails → No image generated → User lost money

**Current Flow:**
```
User pays $0.90 → Verify → Pre-flight check (API key exists) ✅ → Settle ✅ → OpenAI generate → FAIL ❌
```

**Current Implementation:**
✅ **Pre-flight check ALREADY exists** (`lib/openai-health.ts`, line 394-412 in generate-image/route.ts)
- Checks if `OPENAI_API_KEY` configured (prevents 401 errors)
- Runs BEFORE payment settlement (correct order!)

**NEW FINDING:** ✅ **We CAN detect credit limit errors!**

OpenAI SDK provides specific error detection:
```typescript
import OpenAI from 'openai';

try {
  const response = await openai.images.generate({...});
} catch (error: unknown) {
  if (error instanceof OpenAI.RateLimitError) {
    const apiError = error as OpenAI.APIError;

    // Detect credit/quota exhaustion specifically
    if (apiError.code === 'insufficient_quota' ||
        apiError.type === 'insufficient_quota') {
      // This is a CREDIT LIMIT error, not a rate limit!
      console.error('❌ CREDIT LIMIT: OpenAI quota exceeded');
      throw new Error('OPENAI_CREDIT_LIMIT');
    }

    // Other rate limits (requests/min, tokens/min)
    console.error('❌ RATE LIMIT: Temporary throttling');
    throw new Error('OPENAI_RATE_LIMIT');
  }
}
```

**Error Response Structure:**
```json
{
  "error": {
    "message": "You exceeded your current quota, please check your plan and billing details",
    "type": "insufficient_quota",
    "code": "insufficient_quota",
    "param": null
  }
}
```

**HTTP Status:** 429 (RateLimitError class in SDK)

**Limitation:**
⚠️ **Cannot PREVENT the error** (no pre-check endpoint for credits), but we **CAN DETECT IT** when it occurs!

**Two-Pronged Solution Required:**
1. **Detection:** Catch `insufficient_quota` errors and return structured error code
2. **Recovery:** Retry without re-payment (payment tracker)

### Enhanced Backend Implementation

**Step 1: Add OpenAI Error Detection in `app/api/generate-image/route.ts`:**

```typescript
import OpenAI from 'openai';

// In generateGeometricArt function (line ~278-282):
try {
  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: await toFile(buffer, "image.png", { type: "image/png" }),
    prompt: generationPrompt,
    n: 1,
  });

  // ... existing logic
} catch (error: unknown) {
  console.error('❌ Generation failed:', error);

  // NEW: Detect OpenAI-specific errors
  if (error instanceof OpenAI.RateLimitError) {
    const apiError = error as OpenAI.APIError;

    // Check for credit/quota exhaustion
    if (apiError.code === 'insufficient_quota' ||
        apiError.type === 'insufficient_quota') {
      console.error('❌ CRITICAL: OpenAI credit limit exceeded');
      throw new Error('OPENAI_CREDIT_LIMIT');
    }

    // Other rate limits (transient, will clear)
    console.error('❌ OpenAI rate limit (transient)');
    throw new Error('OPENAI_RATE_LIMIT');
  }

  // Other OpenAI API errors
  if (error instanceof OpenAI.APIError) {
    const apiError = error as OpenAI.APIError;
    console.error(`❌ OpenAI API Error: ${apiError.status} - ${apiError.message}`);
    throw new Error(`OPENAI_API_ERROR: ${apiError.message}`);
  }

  // Generic errors
  const errorMessage = error instanceof Error ? error.message : 'Image generation failed';
  throw new Error(errorMessage);
}
```

**Step 2: Return Structured Error in Route Handler (line ~400+):**

```typescript
// After settlement succeeds
const settlementResult = await verifyX402Payment(paymentHeader);

try {
  const base64String = await generateGeometricArt(imageUrl, tokenId, name);

  // Track as completed
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payment-tracking`, {
    method: 'POST',
    body: JSON.stringify({
      fid,
      paymentType: 'regenerate',
      userAddress,
      paymentHeader,
      settlementTxHash: settlementResult.txHash,
      status: 'completed',
    })
  });

  return NextResponse.json({
    success: true,
    data: base64String,
    settlementTxHash: settlementResult.txHash,
  });

} catch (error: any) {
  console.error('[OPENAI] Generation failed after settlement:', error);

  // Detect credit limit error
  const errorMessage = error.message || 'Unknown error';
  const isCreditsError = errorMessage === 'OPENAI_CREDIT_LIMIT';

  // Track payment as settled but not completed
  await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/payment-tracking`, {
    method: 'POST',
    body: JSON.stringify({
      fid,
      paymentType: 'regenerate',
      userAddress,
      paymentHeader,
      settlementTxHash: settlementResult.txHash,
      status: 'settled',  // NOT completed
      errorCode: isCreditsError ? 'OPENAI_CREDIT_LIMIT' : 'GENERATION_FAILED',
      errorMessage: errorMessage,
    })
  });

  // Return structured error
  return NextResponse.json({
    error: isCreditsError
      ? 'OpenAI credit limit reached. Your payment was processed. Please contact support to retry.'
      : 'Image generation failed but your payment was processed. You can retry without re-payment.',
    success: false,
    code: isCreditsError ? 'OPENAI_CREDIT_LIMIT' : 'GENERATION_FAILED_RETRY',
    canRetry: true,
    settlementTxHash: settlementResult.txHash,
  }, {
    status: 503,
    headers: corsHeaders,
  });
}
```

**Step 3: Add Error Code to Types (`types/errors.ts`):**

```typescript
export enum GenerationErrorCode {
  // OpenAI API errors
  OPENAI_API_ERROR = 'OPENAI_API_ERROR',
  OPENAI_RATE_LIMIT = 'OPENAI_RATE_LIMIT',
  OPENAI_CREDIT_LIMIT = 'OPENAI_CREDIT_LIMIT',  // NEW
  OPENAI_TIMEOUT = 'OPENAI_TIMEOUT',
  GENERATION_FAILED = 'GENERATION_FAILED',
  // ... rest
}

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  // ...
  [GenerationErrorCode.OPENAI_CREDIT_LIMIT]:
    'OpenAI service temporarily unavailable. Please contact support.',
  [GenerationErrorCode.OPENAI_RATE_LIMIT]:
    'Rate limit reached. Please wait a moment and try again.',
  // ...
};
```

### Enhanced Frontend Implementation

**Frontend (`components/RegenerateButton.tsx`):**
```typescript
// On mount, check for settled but incomplete regeneration
useEffect(() => {
  const checkPendingRegeneration = async () => {
    if (!fid) return;

    const response = await fetch(`/api/payment-tracking/${fid}/regenerate`);
    if (!response.ok) return;

    const data = await response.json();

    if (data.status === 'settled' && !data.status === 'completed') {
      // Payment settled but generation failed
      setHasPaidButFailed(true);
      toast.info(
        'Your previous regeneration payment succeeded but image generation failed. Click to retry without re-payment.',
        { duration: 10000 }
      );
    }
  };

  checkPendingRegeneration();
}, [fid]);

// In handleRegenerate catch block - Enhanced error handling:
catch (error) {
  console.error("Regenerate error:", error);

  if (abortControllerRef.current?.signal.aborted) return;

  // Parse structured error from API
  let errorCode: string | undefined;
  let errorMessage = "Failed to regenerate";

  try {
    if (paymentResponse && !paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      errorCode = errorData.code;
      errorMessage = errorData.error || errorMessage;
    }
  } catch {
    // Fallback to error instance
    if (error instanceof Error) {
      errorMessage = error.message;
    }
  }

  // Handle OpenAI credit limit error
  if (errorCode === 'OPENAI_CREDIT_LIMIT') {
    toast.error(
      'OpenAI service temporarily unavailable due to credit limits. ' +
      'Your payment was processed. Please contact support at support@geoplet.geoart.studio.',
      { duration: 15000 }
    );
    haptics.error();
    setState("idle");
    return;
  }

  // Handle transient rate limit
  if (errorCode === 'OPENAI_RATE_LIMIT') {
    toast.error(
      'Rate limit reached. Please wait a moment and try again.',
      { duration: 8000 }
    );
    haptics.error();
    setState("idle");
    return;
  }

  // Handle generation failed but payment succeeded
  if (errorCode === 'GENERATION_FAILED_RETRY') {
    toast.error(
      'Image generation failed but your payment was processed. ' +
      'Click regenerate again to retry without re-payment.',
      { duration: 10000 }
    );
    haptics.error();
    setState("idle");
    return;
  }

  // Existing user rejection handling
  if (
    errorMessage.toLowerCase().includes("user rejected") ||
    errorMessage.toLowerCase().includes("user denied") ||
    errorMessage.toLowerCase().includes("user cancelled")
  ) {
    toast.error("Payment cancelled");
    haptics.error();
    setState("idle");
    return;
  }

  // Generic error
  toast.error(errorMessage);
  haptics.error();
  setState("idle");
}
```

**Backend (`app/api/generate-image/route.ts`):**
```typescript
const { fid, skipPayment } = await req.json();

if (skipPayment) {
  // Verify payment already settled in database
  const payment = await supabaseAdmin
    .from('payment_tracking')
    .select('*')
    .eq('fid', fid)
    .eq('payment_type', 'regenerate')
    .eq('status', 'settled')
    .single();

  if (!payment) {
    return NextResponse.json({
      error: 'No settled payment found. Please pay first.'
    }, { status: 402 });
  }

  // Check if payment is recent (within 24 hours)
  const paymentAge = Date.now() - new Date(payment.settled_at).getTime();
  if (paymentAge > 24 * 60 * 60 * 1000) {
    return NextResponse.json({
      error: 'Payment expired. Please pay again.'
    }, { status: 402 });
  }

  // Proceed with generation (no payment needed)
  const image = await generateGeometricArt(...);

  // Mark as completed
  await supabaseAdmin
    .from('payment_tracking')
    .update({ status: 'completed' })
    .eq('fid', fid)
    .eq('payment_type', 'regenerate');

  return NextResponse.json({ success: true, data: image });
}

// Normal flow...
```

**Database Schema Addition:**
```sql
-- Add new status for regenerate
ALTER TABLE payment_tracking
  DROP CONSTRAINT payment_tracking_status_check;

ALTER TABLE payment_tracking
  ADD CONSTRAINT payment_tracking_status_check
  CHECK (status IN (
    'verified',
    'settling',
    'settled',
    'minting',
    'minted',
    'completed',  -- NEW: For regenerate (image generated successfully)
    'failed'
  ));
```

**Why Enhanced Detection + Retry is the Complete Solution:**
- ✅ **Pre-flight check** (already implemented) prevents API key issues (401 errors)
- ✅ **NEW: Credit limit detection** via `error.code === 'insufficient_quota'`
- ✅ **Payment tracking** stores `settled` vs `completed` status
- ✅ **Retry without re-payment** handles credit limit exhaustion gracefully
- ✅ **User protected:** Clear error messages + support contact info

**User Experience:**
1. **Best case:** Pre-flight passes → Settlement → Generation → Success → Mark `completed`
2. **API key missing:** Pre-flight fails → User NOT charged → Clear error (already working!)
3. **Credit limit reached:** Settlement succeeds → Generation fails → **Detect `insufficient_quota`** → Store as `settled` (not `completed`) → Return `OPENAI_CREDIT_LIMIT` error code
4. **User sees:** "OpenAI service temporarily unavailable due to credit limits. Your payment was processed. Please contact support at support@geoplet.geoart.studio."
5. **Admin action:** Top up OpenAI credits
6. **User retry:** Clicks regenerate → Detects `settled` payment → Skips payment → Generates → Success → Mark `completed`
7. **Multiple retries:** Unlimited retries within 24 hours without re-payment

---

### Scenario 5: 💰 CRITICAL - Payment Settled but Wallet Simulation Fails (Mint)

**Problem:** User paid $1, USDC transferred, but wallet simulation fails → Cannot mint → User lost money

**Current Flow:**
```
Verify payment ✅
  ↓
Code simulation (publicClient.simulateContract) ✅
  ↓
Settlement (USDC transferred) ✅
  ↓
Wallet simulation (user's wallet tests transaction) ❌ FAILS HERE
  ↓
Mint (never reached)
```

**Root Cause:**
Two-layer simulation system:
1. **Code simulation** (line 225 in MintButton.tsx) - Uses publicClient, tests contract logic
2. **Wallet simulation** (during mint) - User's wallet (Rainbow/Coinbase) runs own simulation

Wallet simulation happens AFTER settlement and can fail even though code simulation passed due to:
- Different RPC endpoint (wallet uses different node)
- Wallet checks user's actual gas balance
- Network state changed between simulations
- Wallet has stricter validation rules

**Solution: Store Settlement, Allow Retry (Already Covered)**

Good news: This is **already handled** by the payment tracker design!

**How It Works:**

1. **Payment settled:**
```sql
INSERT INTO payment_tracking (fid, payment_type, status, ...)
VALUES (12345, 'mint', 'settled', ...);
```

2. **Wallet simulation fails:**
```typescript
// In components/MintButton.tsx
try {
  await mintNFT(signature, generatedImage);  // Wallet prompts, simulation fails
} catch (error) {
  // Error thrown, status stays 'settled'
  toast.error('Mint simulation failed. Please check your wallet and try again.');
  setState('ready_to_mint');  // Allow retry
}
```

3. **User can retry:**
- Status stays `settled` (not changed to `minting` until tx confirmed)
- Signature and voucher still valid (for 15 minutes)
- User clicks mint again → Wallet simulation runs again
- If simulation passes, mint succeeds

4. **If signature expires:**
```typescript
// Before retry, check expiration
if (now > deadline) {
  await fetch(`/api/payment-tracking/${fid}/mint`, { method: 'DELETE' });
  throw new AppError(
    PaymentErrorCode.SIGNATURE_EXPIRED,
    'Mint signature expired. Please contact support for refund.'
  );
}
```

**Additional Protection: Better Error Messaging**

```typescript
// In components/MintButton.tsx catch block
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Failed to mint';

  // Detect wallet simulation failure
  if (
    errorMessage.includes('simulation') ||
    errorMessage.includes('gas') ||
    errorMessage.includes('revert')
  ) {
    setState('ready_to_mint');  // Allow retry WITHOUT resetting payment
    toast.error(
      'Wallet simulation failed. Common causes:\n' +
      '• Insufficient gas in your wallet\n' +
      '• Network congestion\n' +
      '• RPC endpoint issues\n\n' +
      'Your payment is safe. Try again in a moment.',
      { duration: 10000 }
    );
    return;
  }

  // Other errors (signature expired, user rejection, etc.)
  if (errorMessage.includes('signature expired')) {
    setState('idle');
    setSignatureData(null);
    toast.error(
      'Mint signature expired. Your payment was processed. ' +
      'Please contact support at support@geoplet.geoart.studio for assistance.',
      { duration: 15000 }
    );
    return;
  }

  // Generic error
  setState('idle');
  toast.error(errorMessage);
}
```

**Database State During Retry:**
```sql
-- After settlement but before mint
SELECT status, settlement_tx_hash, expires_at FROM payment_tracking
WHERE fid = 12345 AND payment_type = 'mint';

-- Result:
status: 'settled'  -- Stays 'settled' even if wallet simulation fails
settlement_tx_hash: '0xTXHASH...'
expires_at: '2025-01-12 10:15:00'  -- 15 minutes from signature creation

-- User can retry mint as many times as needed within 15-minute window
```

**Recovery on Page Refresh:**
If user closes page after wallet simulation failure:

```typescript
// On mount (GenerateMintButton.tsx / MintButton.tsx)
useEffect(() => {
  const checkResumablePayment = async () => {
    const response = await fetch(`/api/payment-tracking/${fid}/mint`);
    const data = await response.json();

    if (data.status === 'settled' && !data.isExpired) {
      // Restore state
      setSignatureData({
        voucher: data.mintVoucher,
        signature: data.mintSignature,
        paymentHeader: data.paymentHeader,
      });
      setState('ready_to_mint');

      toast.info(
        'You have a pending mint (payment already settled). ' +
        'Click to try again. If wallet simulation fails, check your gas balance.',
        { duration: 8000 }
      );
    }
  };

  checkResumablePayment();
}, [fid]);
```

**Why This Solution Works:**

1. ✅ **User doesn't lose money:** Payment tracked, can retry
2. ✅ **Clear error messages:** User knows it's a wallet issue, not payment issue
3. ✅ **Multiple retry attempts:** User can try different wallets, add gas, wait for network
4. ✅ **Time window:** 15 minutes to resolve (current implementation, working well)
5. ✅ **Recovery after refresh:** State restored from database
6. ✅ **Expiration handling:** If signature expires, user directed to support

**Note on Signature Deadline:**
Current implementation uses 15 minutes (`deadline: BigInt(Math.floor(Date.now() / 1000) + 900)`). This has been tested and works well in production. No changes needed.

---

## Maintenance & Cleanup

### Automatic Cleanup Cron Job

**Endpoint:** `app/api/cleanup-payments/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/cleanup-payments
 *
 * Cron job to clean up completed and expired payments
 * Prevents database bloat
 *
 * Called by: Vercel Cron (hourly)
 */
export async function POST(req: NextRequest) {
  // Verify cron secret (security)
  const authHeader = req.headers.get('authorization');

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[CLEANUP] Unauthorized cron attempt');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    console.log('[CLEANUP] Starting payment cleanup...');

    // Delete minted payments older than 7 days
    const { data: mintedDeleted, error: mintedError } = await supabaseAdmin
      .from('payment_tracking')
      .delete()
      .eq('status', 'minted')
      .lt('minted_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      .select('fid, payment_type');

    if (mintedError) {
      console.error('[CLEANUP] Error deleting minted payments:', mintedError);
    } else {
      console.log(`[CLEANUP] Deleted ${mintedDeleted?.length || 0} minted payments`);
    }

    // Delete expired payments older than 1 hour
    const { data: expiredDeleted, error: expiredError } = await supabaseAdmin
      .from('payment_tracking')
      .delete()
      .lt('expires_at', new Date(Date.now() - 60 * 60 * 1000))
      .in('status', ['verified', 'settling'])
      .select('fid, payment_type');

    if (expiredError) {
      console.error('[CLEANUP] Error deleting expired payments:', expiredError);
    } else {
      console.log(`[CLEANUP] Deleted ${expiredDeleted?.length || 0} expired payments`);
    }

    // Delete failed payments older than 24 hours
    const { data: failedDeleted, error: failedError } = await supabaseAdmin
      .from('payment_tracking')
      .delete()
      .eq('status', 'failed')
      .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000))
      .select('fid, payment_type');

    if (failedError) {
      console.error('[CLEANUP] Error deleting failed payments:', failedError);
    } else {
      console.log(`[CLEANUP] Deleted ${failedDeleted?.length || 0} failed payments`);
    }

    console.log('[CLEANUP] ✅ Cleanup completed successfully');

    return NextResponse.json({
      success: true,
      deleted: {
        minted: mintedDeleted?.length || 0,
        expired: expiredDeleted?.length || 0,
        failed: failedDeleted?.length || 0,
      }
    });
  } catch (error) {
    console.error('[CLEANUP] Unexpected error:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed'
    }, { status: 500 });
  }
}
```

**Vercel Cron Configuration (`vercel.json`):**
```json
{
  "crons": [{
    "path": "/api/cleanup-payments",
    "schedule": "0 * * * *"
  }]
}
```

**Environment Variable:**
```env
CRON_SECRET=random_secure_string_here
```

**Cleanup Rules:**
| Status | Retention | Reason |
|--------|-----------|--------|
| `minted` | 7 days | Keep for recent audit trail |
| `verified`, `settling` (expired) | 1 hour after expiration | Grace period for late settlement |
| `failed` | 24 hours | Debugging window |
| `settled`, `minting` | Never auto-delete | User may return to mint |

---

## Security Considerations

### Row Level Security (RLS)

**Supabase RLS Policies:**

```sql
-- Enable RLS
ALTER TABLE payment_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own payments (if authenticated by FID)
-- Note: Geoplet uses FID-based auth, not Supabase auth
-- For now, rely on API-level security (service role key)

-- Policy: Only service role can write (backend only)
CREATE POLICY "Service role full access"
ON payment_tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Anonymous users cannot access directly
CREATE POLICY "No anonymous access"
ON payment_tracking
FOR ALL
TO anon
USING (false);
```

**API Security:**
- All payment tracking endpoints use `supabaseAdmin` (service role key)
- No direct client access to payment_tracking table
- Frontend calls backend API routes (server-side validation)

### Sensitive Data Handling

**Stored in Database:**
- ✅ Payment header (needed for settlement retry)
- ✅ Mint voucher (needed for mint retry)
- ✅ Mint signature (needed for mint retry)
- ✅ Settlement tx hash (audit trail)

**NOT Stored:**
- ❌ Private keys (never touch these)
- ❌ User wallet seed phrases
- ❌ OnchainFi API keys (server env only)

**Data Encryption:**
- Supabase encrypts at rest by default
- TLS in transit
- Consider additional encryption for payment_header if needed

---

## Testing Strategy

### Unit Tests

**Database Operations:**
```typescript
describe('Payment Tracking Database', () => {
  test('UPSERT creates new payment', async () => {
    const result = await createPayment({
      fid: 12345,
      paymentType: 'mint',
      userAddress: '0xABC...',
      paymentHeader: 'base64...',
    });

    expect(result.status).toBe('verified');
    expect(result.expiresAt).toBeDefined();
  });

  test('UPSERT updates existing payment', async () => {
    // Create initial payment
    await createPayment({ fid: 12345, paymentType: 'mint', ... });

    // Update with new signature
    const result = await createPayment({
      fid: 12345,
      paymentType: 'mint',
      signature: '0xNEWSIG...'
    });

    expect(result.signature).toBe('0xNEWSIG...');
  });

  test('Composite key allows multiple payment types per FID', async () => {
    await createPayment({ fid: 12345, paymentType: 'mint' });
    await createPayment({ fid: 12345, paymentType: 'regenerate' });

    const mintPayment = await getPayment(12345, 'mint');
    const regenPayment = await getPayment(12345, 'regenerate');

    expect(mintPayment).toBeDefined();
    expect(regenPayment).toBeDefined();
  });
});
```

**API Endpoints:**
```typescript
describe('Payment Tracking API', () => {
  test('POST /api/payment-tracking creates payment', async () => {
    const response = await fetch('/api/payment-tracking', {
      method: 'POST',
      body: JSON.stringify({
        fid: 12345,
        paymentType: 'mint',
        userAddress: '0xABC...',
        paymentHeader: 'base64...',
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('verified');
  });

  test('GET /api/payment-tracking/:fid/:type returns payment', async () => {
    // Create payment first
    await createPayment({ fid: 12345, paymentType: 'mint' });

    const response = await fetch('/api/payment-tracking/12345/mint');
    const data = await response.json();

    expect(data.status).toBe('verified');
  });

  test('PATCH /api/payment-tracking/:fid/:type/settle updates status', async () => {
    await createPayment({ fid: 12345, paymentType: 'mint' });

    const response = await fetch('/api/payment-tracking/12345/mint/settle', {
      method: 'PATCH',
      body: JSON.stringify({ settlementTxHash: '0xTXHASH...' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('settled');
  });
});
```

### Integration Tests

**End-to-End Recovery Flow:**
```typescript
describe('Payment Recovery', () => {
  test('User can resume mint after page refresh', async () => {
    // 1. Pay and get signature
    const signature = await payForMint(fid);
    expect(signature).toBeDefined();

    // 2. Simulate page refresh (clear local state)
    clearComponentState();

    // 3. Check for resumable payment
    const resumable = await fetch(`/api/payment-tracking/${fid}/mint`);
    const data = await resumable.json();

    expect(data.canResume).toBe(true);
    expect(data.mintSignature).toBe(signature.signature);

    // 4. Resume mint
    await mintNFT(data.mintVoucher, data.mintSignature);

    // 5. Verify marked as minted
    const final = await fetch(`/api/payment-tracking/${fid}/mint`);
    const finalData = await final.json();
    expect(finalData.status).toBe('minted');
  });

  test('Expired signature forces new payment', async () => {
    // 1. Create payment
    await createPayment({ fid: 12345, paymentType: 'mint' });

    // 2. Simulate time passing (6 minutes)
    await setSystemTime(Date.now() + 6 * 60 * 1000);

    // 3. Attempt settlement
    const response = await fetch('/api/settle-payment', {
      method: 'POST',
      body: JSON.stringify({ fid: 12345, paymentType: 'mint' }),
    });

    expect(response.status).toBe(402);
    const error = await response.json();
    expect(error.error.code).toBe('SIGNATURE_EXPIRED');

    // 4. Verify payment deleted
    const payment = await getPayment(12345, 'mint');
    expect(payment).toBeNull();
  });
});
```

### Manual Testing Checklist

**Happy Path:**
- [ ] Pay $1 → Get signature → Simulate → Settle → Mint → Success
- [ ] Payment tracked at each step (verified → settled → minted)
- [ ] Settlement tx hash stored correctly
- [ ] Cleanup cron deletes minted payment after 7 days

**Recovery Scenarios:**
- [ ] Pay → Close page → Reopen → Resume mint
- [ ] Pay → Reject mint tx → Retry → Success
- [ ] Pay → Wait 6 min → Attempt settle → Error (signature expired)
- [ ] Pay → Network error during settle → Retry → Success

**Edge Cases:**
- [ ] User has both mint and regenerate pending (composite key works)
- [ ] Multiple browsers (last payment wins due to UPSERT)
- [ ] Rapid clicks (idempotency)

---

## Monitoring & Observability

### Metrics to Track

**Payment Success Rate:**
```sql
-- Percentage of verified payments that reach minted
SELECT
  COUNT(*) FILTER (WHERE status = 'minted') * 100.0 / COUNT(*) as success_rate
FROM payment_tracking
WHERE created_at > NOW() - INTERVAL '24 hours';
```

**Average Time to Mint:**
```sql
-- Time from verification to mint
SELECT
  AVG(EXTRACT(EPOCH FROM (minted_at - verified_at))) as avg_seconds
FROM payment_tracking
WHERE status = 'minted'
  AND created_at > NOW() - INTERVAL '24 hours';
```

**Error Rate by Code:**
```sql
-- Most common errors
SELECT
  error_code,
  COUNT(*) as occurrences
FROM payment_tracking
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY error_code
ORDER BY occurrences DESC;
```

**Settlement Success Rate:**
```sql
-- Payments that verified but failed to settle
SELECT
  COUNT(*) FILTER (WHERE settlement_tx_hash IS NOT NULL) * 100.0 / COUNT(*)
    as settlement_rate
FROM payment_tracking
WHERE status IN ('verified', 'settled', 'minted')
  AND created_at > NOW() - INTERVAL '24 hours';
```

### Logging Strategy

**Key Events to Log:**
1. Payment tracked (verified)
2. Settlement succeeded (tx hash)
3. Mint succeeded (blockchain tx hash)
4. Recovery triggered (resumable payment found)
5. Signature expired (forced re-payment)
6. Cleanup executed (records deleted)

**Log Format:**
```typescript
console.log('[PAYMENT_TRACKING]', {
  event: 'payment_verified',
  fid: 12345,
  paymentType: 'mint',
  expiresAt: '2025-01-12T10:05:00Z',
});

console.log('[PAYMENT_TRACKING]', {
  event: 'settlement_succeeded',
  fid: 12345,
  paymentType: 'mint',
  settlementTxHash: '0xTXHASH...',
});
```

---

## Rollout Plan

### Phase 1: Database Setup
1. Create `payment_tracking` table in Supabase
2. Configure RLS policies
3. Create indexes
4. Verify admin access

### Phase 2: API Endpoints
1. Implement `POST /api/payment-tracking`
2. Implement `GET /api/payment-tracking/:fid/:type`
3. Implement `PATCH /api/payment-tracking/:fid/:type/settle`
4. Implement `PATCH /api/payment-tracking/:fid/:type/mint`
5. Test endpoints with Postman/Insomnia

### Phase 3: Integration
1. Modify `get-mint-signature/route.ts` (track after verification)
2. Modify `settle-payment/route.ts` (add fid/type, update tracking)
3. Update frontend components (add fid/type to settle calls)
4. Test mint flow end-to-end

### Phase 4: Recovery Logic
1. Add resumable payment check in GenerateMintButton
2. Add resumable payment check in MintButton
3. Handle signature expiration in settle-payment
4. Test recovery scenarios

### Phase 5: Maintenance
1. Implement cleanup cron endpoint
2. Configure Vercel cron schedule
3. Set CRON_SECRET environment variable
4. Monitor cleanup logs

### Phase 6: Monitoring
1. Set up Supabase dashboard queries
2. Configure error alerts (if settlement rate drops)
3. Document customer support queries

---

## Cost Analysis

### Storage Costs (Supabase Free Tier: 500MB)

**Per Payment Record:**
- fid: 8 bytes
- payment_type: ~10 bytes
- user_address: 42 bytes
- payment_header: ~500 bytes (base64 encoded)
- mint_voucher: ~200 bytes (JSON)
- mint_signature: ~132 bytes
- settlement_tx_hash: 66 bytes
- status: ~10 bytes
- timestamps: 40 bytes (5 fields × 8 bytes)
- **Total: ~1,008 bytes per record**

**Capacity:**
- Free tier: 500MB = 500,000,000 bytes
- **~495,000 payment records** before hitting free tier limit

**With Cleanup (7-day retention for minted):**
- Assume 100 mints/day
- 100 × 7 days = 700 records max
- **0.7MB storage usage (well within free tier)**

### API Costs (Supabase Free Tier: Unlimited API calls)

**Per Mint Flow:**
1. POST /api/payment-tracking (track payment)
2. GET /api/payment-tracking (check resumable)
3. PATCH /api/payment-tracking/settle (update settlement)
4. PATCH /api/payment-tracking/mint (mark minted)

**Total: 4 API calls per mint** (negligible on free tier)

**Conclusion:** Payment tracking adds no additional cost on Supabase free tier.

---

## Future Enhancements (Out of Scope)

### 1. Refund Mechanism
**Problem:** User paid but cannot mint (contract error, FID already minted, etc.)

**Solution:**
- Admin panel to mark payment as `refund_eligible`
- Manual USDC transfer from treasury wallet
- Update status to `refunded`

**Complexity:** Medium (requires admin auth, onchain transaction)

### 2. Webhook Support
**Problem:** Polling for payment status is inefficient

**Solution:**
- OnchainFi webhook endpoint (if supported)
- Receive settlement notifications via POST
- Update payment_tracking automatically

**Complexity:** Low (if OnchainFi supports webhooks)

### 3. Cross-Chain Settlement
**Problem:** User on Ethereum, treasury on Base

**Solution:**
- Already supported in OnchainFi API (`sourceNetwork` / `destinationNetwork`)
- No changes needed to payment tracker

**Complexity:** None (already compatible)

### 4. Payment Batching
**Problem:** High gas costs for multiple settlements

**Solution:**
- Accumulate multiple payments
- Settle in single batch transaction
- Split settlement tx hash across records

**Complexity:** High (requires custom settlement logic)

**Note:** Not needed on Base (gas is cheap per user instructions)

---

## Conclusion

This payment tracker design follows KISS principles while providing robust recovery mechanisms for ALL identified failure scenarios:

### Recovery Scenarios Covered:

1. ✅ Settlement succeeded but user closed page → Auto-resume on return
2. ✅ Mint transaction rejected by user → Retry with signature check
3. ✅ Signature expired before settlement → Force new payment
4. ✅ 💰 **CRITICAL:** Payment settled but OpenAI credit limit reached → Detect `insufficient_quota` error + retry without re-payment
5. ✅ 💰 **CRITICAL:** Payment settled but wallet simulation fails → Store settlement + allow retry with clear error messages

### Key Strengths:

**Architecture:**
- Natural composite key (FID + payment type) - no UUID overhead
- Minimal API surface (4 endpoints) - no new availability check needed
- `completed` status for regenerate flow (distinguishes settled vs. image generated)
- Settlement tx hash stored for audit trail
- Leverages existing OpenAI health check (already implemented)

**User Protection:**
- Pre-flight check (already exists) prevents API key issues
- **NEW:** OpenAI error detection (`insufficient_quota` code)
- Retry without re-payment for credit limit failures
- Retry mechanisms for all failure scenarios
- Clear, actionable error messages with support contact
- 15-minute signature deadline (current, tested in production)
- 24-hour retry window for regenerate failures

**Professional:**
- Automatic cleanup (Vercel cron)
- Zero additional cost (Supabase free tier)
- Comprehensive error tracking
- Support-friendly (settlement tx hashes for verification)

**Security:**
- Not negotiable: RLS policies, server-side validation
- Payment data encrypted at rest (Supabase default)
- TLS in transit
- No private keys or sensitive data stored

### Implementation Effort:

**Phase 1 - Core Tracking:** ~2-3 hours
- Database schema + API endpoints
- Integration with existing mint/regenerate flows

**Phase 2 - Critical Protections:** ~1-2 hours
- **NEW:** OpenAI error detection in generate-image/route.ts (`insufficient_quota`)
- Add `OPENAI_CREDIT_LIMIT` error code to types/errors.ts
- Enhanced error handling in RegenerateButton (structured error codes)
- Enhanced error handling in MintButton/GenerateMintButton (wallet simulation detection)
- Skip-payment flow for regenerate retry

**Phase 3 - Polish:** ~1 hour
- Cleanup cron job
- User-facing error messages
- Testing and verification

**Total: ~4-6 hours**

### Decisions Made:

1. **Signature deadline:** ✅ Keep 15 minutes (current implementation working well)
2. **Regenerate retry window:** ✅ 24 hours (approved)
3. **Refund mechanism:** ❌ Out of scope (will be implemented later)

**Ready for implementation upon approval.**

---

**Document Version:** 1.2
**Last Updated:** 2025-01-12
**Changelog:**
- v1.0: Initial design with 3 recovery scenarios
- v1.1: Added Scenarios 4 & 5 (OpenAI credit limit, wallet simulation failure)
- v1.2: Enhanced with OpenAI error detection capability (`insufficient_quota` code)

**Next Review:** After Phase 6 rollout
