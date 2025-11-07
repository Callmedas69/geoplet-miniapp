# Settlement Tracking & Payment Recovery System

**Purpose:** Allow users to retry mint after payment succeeds but mint fails (without paying again)

**Date:** 2025-01-06
**Status:** Recommended Implementation
**Priority:** CRITICAL (prevents double-payment + enables recovery)

---

## The Problem We're Solving

### User Story: "I Paid But Mint Failed"

```
Current Flow (BAD):
1. User pays $2 USDC ✅
2. Settlement succeeds ✅
3. Mint transaction fails ❌ (network error, rejected tx, gas spike, etc.)
4. User closes app in frustration
5. User returns next day
6. Clicks "Mint" again
7. System asks for ANOTHER $2 payment ❌

Result: User pays $4 total for 1 NFT! Very bad UX.
```

```
With Settlement Tracking (GOOD):
1. User pays $2 USDC ✅
2. Settlement succeeds ✅ (saved to database)
3. Mint transaction fails ❌
4. User closes app
5. User returns next day
6. Clicks "Mint" again
7. System checks: "Already paid for this FID" ✅
8. Skip payment, go directly to mint ✅

Result: User pays $2 once, can retry mint freely!
```

---

## What is Idempotency?

**Idempotency** = Same request multiple times = Same result (safe to retry)

### Real-World Examples

**Light Switch (Idempotent):**
- Press once → ON
- Press again → Still ON (not double-bright)
- Press 100 times → Still just ON

**Adding to Cart (Non-Idempotent):**
- Click "Add" once → 1 item
- Click "Add" again → 2 items
- Click 100 times → 100 items (dangerous!)

### Why It Matters for Payments

**Without Idempotency:**
```typescript
POST /api/settle-payment { paymentHeader: "xyz" }
→ Transfers $2 USDC
→ Returns txHash

// User retries (network timeout, impatient click, etc.)
POST /api/settle-payment { paymentHeader: "xyz" }
→ Transfers ANOTHER $2 USDC
→ User charged $4 total ❌
```

**With Idempotency:**
```typescript
POST /api/settle-payment { paymentHeader: "xyz" }
→ Check: Already settled? NO
→ Transfer $2 USDC
→ Save to DB: "xyz" → settled
→ Return txHash

// User retries
POST /api/settle-payment { paymentHeader: "xyz" }
→ Check: Already settled? YES
→ Don't transfer again
→ Return cached txHash ✅
→ User charged $2 total ✅
```

---

## Solution Architecture

### 1. Database Schema

```sql
-- Create settlement tracking table
CREATE TABLE settled_payments (
  id SERIAL PRIMARY KEY,

  -- Payment identification
  fid INTEGER NOT NULL,
  payment_header TEXT UNIQUE NOT NULL,
  tx_hash TEXT NOT NULL,
  settled_at TIMESTAMP DEFAULT NOW(),

  -- Mint tracking
  mint_tx_hash TEXT,           -- NULL until minted
  minted_at TIMESTAMP,          -- NULL until minted
  token_id INTEGER,             -- NULL until minted

  -- Status tracking
  status TEXT DEFAULT 'pending',  -- 'pending', 'minted', 'failed'

  -- Error tracking (optional)
  error_message TEXT,           -- If mint failed
  retry_count INTEGER DEFAULT 0,

  -- Indexes for fast lookups
  INDEX idx_fid (fid),
  INDEX idx_payment_header (payment_header),
  INDEX idx_status (status),
  INDEX idx_settled_at (settled_at)
);

-- Comments
COMMENT ON TABLE settled_payments IS 'Tracks USDC settlements to enable payment recovery';
COMMENT ON COLUMN settled_payments.status IS 'pending=paid but not minted, minted=successfully minted, failed=mint failed permanently';
```

### Why These Columns?

| Column | Purpose | Example |
|--------|---------|---------|
| `fid` | User identification | 12345 |
| `payment_header` | Unique payment ID (idempotency key) | "x402:signature:..." |
| `tx_hash` | USDC transfer proof | "0xABC123..." |
| `settled_at` | Payment timestamp | "2025-01-06 10:30:00" |
| `mint_tx_hash` | NFT mint proof | "0xDEF456..." or NULL |
| `token_id` | Minted NFT ID | 42 or NULL |
| `status` | Current state | "pending" / "minted" / "failed" |

---

## Implementation Steps

### Step 1: Create Supabase Table

**In Supabase SQL Editor:**

```sql
CREATE TABLE settled_payments (
  id SERIAL PRIMARY KEY,
  fid INTEGER NOT NULL,
  payment_header TEXT UNIQUE NOT NULL,
  tx_hash TEXT NOT NULL,
  settled_at TIMESTAMP DEFAULT NOW(),
  mint_tx_hash TEXT,
  minted_at TIMESTAMP,
  token_id INTEGER,
  status TEXT DEFAULT 'pending',
  INDEX idx_fid (fid),
  INDEX idx_payment_header (payment_header),
  INDEX idx_status (status)
);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE settled_payments ENABLE ROW LEVEL SECURITY;

-- Policy: Service role only (backend access)
CREATE POLICY "Service role only"
ON settled_payments
FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');
```

**Verify:**
```sql
SELECT * FROM settled_payments LIMIT 1;
-- Should return empty result (no error)
```

---

### Step 2: Create Check Payment Status Endpoint

**File:** `app/api/check-payment-status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'FID required' },
        { status: 400 }
      );
    }

    // Check if FID has settled payment that hasn't been minted yet
    const { data: payment, error } = await supabaseAdmin
      .from('settled_payments')
      .select('*')
      .eq('fid', parseInt(fid))
      .eq('status', 'pending')  // Only pending (not minted yet)
      .order('settled_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !payment) {
      return NextResponse.json({
        paid: false,
        canMint: false,
        message: 'No pending payment found'
      });
    }

    // Check if payment is still valid (within 24 hours)
    const paymentAge = Date.now() - new Date(payment.settled_at).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (paymentAge > maxAge) {
      return NextResponse.json({
        paid: true,
        canMint: false,
        expired: true,
        message: 'Payment expired (>24 hours). Please pay again.',
        settledAt: payment.settled_at
      });
    }

    // Payment found and still valid!
    return NextResponse.json({
      paid: true,
      canMint: true,
      paymentHeader: payment.payment_header,
      txHash: payment.tx_hash,
      settledAt: payment.settled_at,
      message: 'Previous payment found. You can mint without paying again!'
    });
  } catch (error) {
    console.error('Check payment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

### Step 3: Update Settlement Endpoint (Idempotency)

**File:** `app/api/settle-payment/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const ONCHAIN_API_URL = 'https://api.onchain.fi';

export async function POST(request: NextRequest) {
  try {
    const { paymentHeader, fid } = await request.json();

    if (!paymentHeader || !fid) {
      return NextResponse.json(
        { error: 'Missing paymentHeader or fid' },
        { status: 400 }
      );
    }

    // ✅ IDEMPOTENCY CHECK: Already settled?
    const { data: existing } = await supabaseAdmin
      .from('settled_payments')
      .select('*')
      .eq('payment_header', paymentHeader)
      .single();

    if (existing) {
      console.log('[SETTLE] Payment already settled (idempotent response)');
      return NextResponse.json({
        success: true,
        settled: true,
        txHash: existing.tx_hash,
        message: 'Already settled (safe to retry)',
      });
    }

    // ✅ NOT SETTLED YET: Settle with onchain.fi
    const settleResponse = await fetch(`${ONCHAIN_API_URL}/settle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.ONCHAIN_FI_API_KEY || '',
      },
      body: JSON.stringify({
        paymentHeader,
        network: 'base',
        priority: 'balanced',
      }),
    });

    if (!settleResponse.ok) {
      throw new Error('Settlement failed');
    }

    const settleData = await settleResponse.json();

    if (!settleData.data?.settled) {
      throw new Error('Payment not settled');
    }

    // ✅ SAVE TO DATABASE (enables recovery)
    const { error: insertError } = await supabaseAdmin
      .from('settled_payments')
      .insert({
        fid: parseInt(fid),
        payment_header: paymentHeader,
        tx_hash: settleData.data.txHash,
        status: 'pending',  // Not minted yet
      });

    if (insertError) {
      console.error('[SETTLE] Failed to save settlement:', insertError);
      // Settlement succeeded but DB save failed
      // Log this for manual investigation
      throw new Error('Settlement succeeded but failed to save to database');
    }

    console.log('[SETTLE] ✅ Payment settled and saved:', {
      fid,
      txHash: settleData.data.txHash,
    });

    return NextResponse.json({
      success: true,
      settled: true,
      txHash: settleData.data.txHash,
    });
  } catch (error) {
    console.error('[SETTLE] Error:', error);
    return NextResponse.json(
      { error: 'Settlement failed' },
      { status: 500 }
    );
  }
}
```

---

### Step 4: Update MintButton (Check Before Payment)

**File:** `components/MintButton.tsx`

**Add new function:**
```typescript
// Add after imports
interface PaymentStatus {
  paid: boolean;
  canMint: boolean;
  paymentHeader?: string;
  txHash?: string;
  settledAt?: string;
  message?: string;
  expired?: boolean;
}

// Add in component
const checkExistingPayment = useCallback(async (fid: string): Promise<PaymentStatus> => {
  try {
    const response = await fetch(`/api/check-payment-status?fid=${fid}`);
    if (!response.ok) {
      return { paid: false, canMint: false };
    }
    return await response.json();
  } catch (error) {
    console.error('[PAYMENT-CHECK] Error:', error);
    return { paid: false, canMint: false };
  }
}, []);
```

**Update handleMint function:**
```typescript
const handleMint = useCallback(async () => {
  if (!fid || !generatedImage) {
    toast.error("No image to mint");
    return;
  }

  abortControllerRef.current = new AbortController();

  try {
    // Validate image size
    const validation = validateImageSize(generatedImage);
    if (!validation.valid) {
      haptics.error();
      toast.error(validation.error || "Image validation failed");
      return;
    }

    // ✅ NEW: Step 0: Check if user already paid
    console.log("[MINT] Step 0: Checking for existing payment...");
    const paymentStatus = await checkExistingPayment(fid.toString());

    if (paymentStatus.paid && paymentStatus.canMint && paymentStatus.paymentHeader) {
      // User already paid! Resume from previous payment
      console.log("[MINT] ✅ Previous payment found, resuming...");
      haptics.notification();
      toast.success("Resuming from previous payment...", {
        description: "You won't be charged again"
      });

      // Skip to Step 1 with existing payment
      setState("paying");
      const signature = await requestMintSignature(
        fid.toString(),
        paymentStatus.paymentHeader
      );

      if (abortControllerRef.current.signal.aborted) {
        setSignatureData(null);
        setState("idle");
        return;
      }

      // Continue with simulation and mint...
      setState("simulating");
      // ... rest of flow
      return;
    }

    if (paymentStatus.paid && paymentStatus.expired) {
      toast.error("Previous payment expired (>24 hours). Please pay again.");
    }

    // No existing payment, continue with normal flow
    console.log("[MINT] No previous payment, starting new flow...");

    // Step 1: Pre-flight eligibility check (BEFORE payment)
    console.log("[MINT] Step 1: Checking eligibility before payment", { fid });
    setState("checking_eligibility");

    const eligibilityResult = await checkEligibility(fid.toString(), generatedImage);

    if (!eligibilityResult.success) {
      throw new Error(eligibilityResult.error || "Eligibility check failed");
    }

    console.log("[MINT] ✅ Eligibility check passed");

    // ... rest of existing flow
  } catch (error) {
    // ... existing error handling
  }
}, [fid, generatedImage, checkExistingPayment, checkEligibility, requestMintSignature, simulateMint, mintNFT, address]);
```

---

### Step 5: Update After Successful Mint

**Create new endpoint:** `app/api/update-mint-status/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { fid, mintTxHash, tokenId } = await request.json();

    if (!fid || !mintTxHash || !tokenId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update most recent pending payment for this FID
    const { error } = await supabaseAdmin
      .from('settled_payments')
      .update({
        mint_tx_hash: mintTxHash,
        minted_at: new Date().toISOString(),
        token_id: parseInt(tokenId),
        status: 'minted',
      })
      .eq('fid', parseInt(fid))
      .eq('status', 'pending')
      .order('settled_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[UPDATE-MINT] Failed to update:', error);
      return NextResponse.json(
        { error: 'Failed to update mint status' },
        { status: 500 }
      );
    }

    console.log('[UPDATE-MINT] ✅ Updated mint status:', { fid, tokenId });

    return NextResponse.json({
      success: true,
      message: 'Mint status updated'
    });
  } catch (error) {
    console.error('[UPDATE-MINT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Call it from MintButton after successful mint:**

```typescript
// In handleMint, after mint succeeds:
const handleMint = useCallback(async () => {
  // ... all the previous steps ...

  // Step 4: Mint NFT
  await mintNFT(signature, generatedImage);

  // ✅ NEW: Update settlement record
  await fetch('/api/update-mint-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fid: fid.toString(),
      mintTxHash: txHash,
      tokenId: nft.tokenId,
    }),
  });

  // Success!
  setState("success");
}, [...]);
```

---

## Benefits

### 1. Payment Recovery (Primary Goal)

**Scenario:** User pays but mint fails
**Result:** User can retry without paying again (within 24 hours)

### 2. Idempotency (Security)

**Scenario:** User accidentally clicks "Mint" twice or network timeout causes retry
**Result:** Only charged once, even with multiple requests

### 3. Admin Dashboard (Future)

```sql
-- View all pending payments (paid but not minted)
SELECT
  fid,
  tx_hash,
  settled_at,
  EXTRACT(EPOCH FROM (NOW() - settled_at))/3600 as hours_ago
FROM settled_payments
WHERE status = 'pending'
ORDER BY settled_at DESC;

-- Identify problem payments (>1 hour old)
SELECT * FROM settled_payments
WHERE status = 'pending'
AND settled_at < NOW() - INTERVAL '1 hour';
```

### 4. Refund System (Future)

```typescript
// Manual refund for expired payments
async function refundExpiredPayments() {
  const expiredPayments = await supabaseAdmin
    .from('settled_payments')
    .select('*')
    .eq('status', 'pending')
    .lt('settled_at', new Date(Date.now() - 24 * 60 * 60 * 1000));

  for (const payment of expiredPayments.data) {
    // Call onchain.fi refund API
    await refundPayment(payment.payment_header);

    // Update status
    await supabaseAdmin
      .from('settled_payments')
      .update({ status: 'refunded' })
      .eq('id', payment.id);
  }
}
```

### 5. Analytics

```sql
-- Mint success rate
SELECT
  COUNT(CASE WHEN status = 'minted' THEN 1 END) as minted,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
  COUNT(*) as total,
  ROUND(100.0 * COUNT(CASE WHEN status = 'minted' THEN 1 END) / COUNT(*), 2) as success_rate
FROM settled_payments;

-- Average time from payment to mint
SELECT AVG(EXTRACT(EPOCH FROM (minted_at - settled_at))) as avg_seconds
FROM settled_payments
WHERE status = 'minted';
```

---

## Testing

### Test Case 1: Normal Flow (No Prior Payment)

```
1. User clicks "Mint" (first time)
2. System checks payment status → none found
3. User pays $2
4. Settlement saved to DB (status='pending')
5. Mint succeeds
6. Status updated to 'minted'
7. ✅ PASS: User charged once, got NFT
```

### Test Case 2: Retry After Failed Mint

```
1. User clicks "Mint"
2. User pays $2
3. Settlement saved to DB (status='pending')
4. Mint fails (network error)
5. User closes app
6. [Next day] User opens app, clicks "Mint"
7. System checks payment status → found!
8. System skips payment, goes directly to mint
9. Mint succeeds
10. Status updated to 'minted'
11. ✅ PASS: User charged once, got NFT on retry
```

### Test Case 3: Idempotency (Double Click)

```
1. User clicks "Mint"
2. User pays $2
3. Settlement API called with paymentHeader="xyz"
4. Saved to DB
5. User impatient, clicks "Mint" again
6. Settlement API called again with same paymentHeader="xyz"
7. System checks DB → already exists
8. Returns cached txHash (no new charge)
9. ✅ PASS: User charged once, even with double click
```

### Test Case 4: Expired Payment

```
1. User pays $2
2. Settlement saved (status='pending')
3. User doesn't mint
4. [25 hours later] User clicks "Mint"
5. System checks payment status → expired
6. System asks for new payment
7. ✅ PASS: Old payment expired, new payment required
```

---

## Migration (If Already in Production)

If you already have users in production, you need to handle existing data:

### Option 1: Start Fresh (Simple)

```sql
-- Create table (it's empty, no migration needed)
CREATE TABLE settled_payments (...);

-- New payments will be tracked
-- Old payments won't have recovery (acceptable if just launched)
```

### Option 2: Backfill (If Many Users)

```sql
-- If you have payment logs elsewhere, backfill:
INSERT INTO settled_payments (fid, payment_header, tx_hash, settled_at, status)
SELECT
  fid,
  payment_header,
  tx_hash,
  created_at as settled_at,
  'pending' as status
FROM old_payment_logs
WHERE mint_tx_hash IS NULL;  -- Only payments without successful mint
```

---

## Monitoring & Alerts

### Daily Cron Job (Recommended)

```typescript
// Check for stale pending payments
const stalePendingPayments = await supabaseAdmin
  .from('settled_payments')
  .select('*')
  .eq('status', 'pending')
  .lt('settled_at', new Date(Date.now() - 6 * 60 * 60 * 1000));  // >6 hours

if (stalePendingPayments.data.length > 0) {
  // Alert admin via email/Discord/Slack
  await sendAlert({
    type: 'stale_payments',
    count: stalePendingPayments.data.length,
    payments: stalePendingPayments.data,
  });
}
```

### Metrics to Track

- **Success Rate:** `minted / total`
- **Average Time to Mint:** `minted_at - settled_at`
- **Pending Payment Count:** How many users paid but haven't minted
- **Recovery Rate:** How many pending payments eventually become minted

---

## Security Considerations

### 1. Validate FID Ownership

**Problem:** Malicious user checks another user's FID payment status

**Solution:** Already handled by EIP-712 signature
- Backend generates signature tied to `userAddress`
- Contract validates `msg.sender == voucher.to`
- Even if attacker knows payment exists, they can't use it

### 2. Payment Expiration

**Why 24 hours?**
- Gives user plenty of time to retry
- Prevents indefinite payment liability
- After 24h, payment can be refunded or expired

**Configurable:**
```typescript
const PAYMENT_VALIDITY_HOURS = 24;  // Adjust as needed
```

### 3. Rate Limiting

**Prevent abuse of check-payment-status:**
```typescript
// Simple in-memory rate limit
const checkRateLimit = new Map<string, number>();

// In /api/check-payment-status:
const checks = checkRateLimit.get(fid) || 0;
if (checks > 10) {  // Max 10 checks per minute
  return NextResponse.json(
    { error: 'Rate limit exceeded' },
    { status: 429 }
  );
}
checkRateLimit.set(fid, checks + 1);
```

---

## Cost Analysis

### Database Storage

**Per payment record:** ~200 bytes

**10,000 users:** 10,000 × 200 bytes = 2 MB

**Supabase free tier:** 500 MB

**Conclusion:** Negligible storage cost

### API Calls

**Per mint attempt:**
- 1 check-payment-status call (if retry)
- 1 settle-payment call
- 1 update-mint-status call (after success)

**Additional cost:** ~$0.0001 per mint (negligible)

---

## Rollout Plan

### Week 1: Implementation
- [ ] Create Supabase table (5 min)
- [ ] Create check-payment-status endpoint (30 min)
- [ ] Update settle-payment with idempotency (30 min)
- [ ] Update MintButton with payment check (1 hour)
- [ ] Create update-mint-status endpoint (30 min)
- [ ] Testing (2 hours)

**Total:** ~4-5 hours

### Week 2: Monitoring
- [ ] Add dashboard to view pending payments
- [ ] Set up alerts for stale payments
- [ ] Monitor success rate

### Week 3: Polish
- [ ] Auto-refund expired payments (optional)
- [ ] Analytics dashboard
- [ ] User notification: "You have a pending payment"

---

## FAQ

### Q: What if onchain.fi already handles idempotency?

**A:** Great! Our tracking still provides value:
- Payment recovery (main benefit)
- Analytics
- Admin dashboard
- Defense-in-depth

### Q: What if user's wallet changes?

**A:** Payment tied to FID + userAddress in EIP-712 signature. If user changes wallet:
- Old payment can't be used (signature invalid for new wallet)
- User must pay again with new wallet
- This is expected behavior

### Q: Should we auto-retry failed mints?

**A:** No (KISS principle)
- Let user manually retry (they're in control)
- Auto-retry could waste gas if persistent error
- Better UX: Show clear message "Mint failed, click to retry (free)"

### Q: What about refunds?

**A:** Phase 2 feature:
- After 24 hours, admin can manually refund
- Future: Auto-refund cron job
- For now: Manual process is acceptable

---

## Conclusion

Settlement tracking solves THREE problems:

1. ✅ **Payment Recovery:** User pays once, can retry mint freely
2. ✅ **Idempotency:** Prevent double-charging on retry
3. ✅ **Analytics:** Track success rate, identify issues

**Implementation time:** 4-5 hours

**User impact:** HUGE (no more "I paid but mint failed" complaints)

**KISS compliant:** Simple solution, multiple benefits

---

**Document Version:** 1.0
**Last Updated:** 2025-01-06
**Related:** `SIGNATURE_FINDING_EXECUTIVE.md` (Critical Fix #2)
**Next Steps:** Implement Week 1 tasks
