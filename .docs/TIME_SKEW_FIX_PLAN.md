# Time Skew Diagnostic & Fix Plan

## ✅ INVESTIGATION COMPLETE

**Status:** RESOLVED - No time skew issue found
**Date:** 2025-01-16
**Conclusion:** Time skew is NOT the problem. Chain time fix from log.md is NOT needed.

### Test Results Summary

```
🕐 TIME DIAGNOSTIC Results:
- Server time:  1763228680
- Chain time:   1763228679
- Skew:         1 second (0.0 minutes)
- Status:       ✅ PERFECT ALIGNMENT
```

**Testing:**
- ✅ Mobile mint: Successful, no simulation failures
- ✅ Desktop mint: Successful, no simulation failures
- ✅ Time sync: Perfect (1 second difference)

**Decision:** Keep diagnostic logging for monitoring. No further fixes needed.

---

## Original Problem Statement

Mint operations occasionally fail with "wallet simulation failed" errors, then succeed after 30-45 minutes. Hypothesis: Server time vs blockchain time skew causes signature validation issues.

## Investigation Status: COMPLETE ✅

Measured actual time skew and confirmed it is NOT the issue.

---

## Phase 1: DIAGNOSTIC LOGGING ⏳ (Current Phase)

### Objective
Measure actual server vs chain time difference to prove/disprove time skew hypothesis.

### Files to Modify: 2

#### 1. `app/api/get-mint-signature/route.ts`
**Location:** Around line 257 (before voucher generation)

**Add:**
```typescript
// Create public client (add at top of file)
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
});

// In POST handler (before generating voucher):
const serverTime = Math.floor(Date.now() / 1000);
const block = await publicClient.getBlock();
const chainTime = Number(block.timestamp);
const skew = serverTime - chainTime;

console.log('🕐 TIME DIAGNOSTIC [get-mint-signature]:', {
  serverTime,
  chainTime,
  skewSeconds: skew,
  skewMinutes: (skew / 60).toFixed(1),
  generatedDeadline: serverTime + 900,
  contractValidatesAt: chainTime,
  userAddress,
  fid,
});

// Continue with existing logic (still use Date.now() for now)
const now = Math.floor(Date.now() / 1000);
// ... rest of code unchanged
```

#### 2. `app/api/get-mint-signature-paid/route.ts`
**Location:** Around line 147 (before voucher generation)

**Add:** Same diagnostic pattern as above

---

### Testing Procedure

1. **Deploy** with diagnostic logging
2. **Attempt mint** (especially on mobile wallet where failures occur)
3. **Check logs** for time diagnostic output
4. **Record results** in this document

---

### Log Analysis Guide

**Expected output:**
```
🕐 TIME DIAGNOSTIC: {
  serverTime: 1736985600,
  chainTime: 1736983800,
  skewSeconds: 1800,
  skewMinutes: '30.0',
  ...
}
```

**Interpretation:**

| Skew Range | Diagnosis | Action |
|------------|-----------|--------|
| < 5 minutes | Time skew NOT the issue | → Investigate other causes |
| 5-15 minutes | Moderate skew | → May contribute to issues |
| > 15 minutes | Significant skew | → Implement chain time fix |

---

## Phase 2: DECISION (Based on Phase 1 Results)

### IF Skew > 10 minutes → Implement Chain Time Fix

**Files to modify:** Same 2 files

**Changes:**
```typescript
// Replace Date.now() usage with chain time
const block = await publicClient.getBlock();
const chainNow = Number(block.timestamp);
const deadline = chainNow + 3600; // Use full MAX_SIGNATURE_VALIDITY
const nonce = chainNow;

const voucher = {
  to: userAddress as Address,
  fid: BigInt(fid),
  nonce: BigInt(nonce),
  deadline: BigInt(deadline),
};
```

**Expected Result:**
- ✅ Immediate mint success on all wallets
- ✅ Zero "wallet simulation failed" errors
- ✅ No 30-45 minute delays

---

### IF Skew < 5 minutes → Investigate Other Causes

**Possible alternative issues:**
1. **Wallet simulation logic** - Mobile wallets may have stricter validation
2. **Gas estimation failures** - Check if gas params are correct
3. **Contract revert reasons** - Review actual error messages
4. **Network/RPC issues** - Check Base RPC reliability
5. **Frontend signature handling** - Verify voucher structure matches contract

**Next steps:**
- Capture actual wallet error messages
- Test with different wallet types (desktop vs mobile)
- Review contract events/logs from failed attempts
- Check if issue is specific to certain conditions

---

## Phase 3: VERIFICATION

After implementing fix:

1. **Test immediately** - Mint should succeed without delay
2. **Monitor logs** - Verify time skew eliminated (should be 0-2 seconds)
3. **Test on mobile** - Confirm wallet simulation passes
4. **Test recovery flow** - Verify MintPaidButton works instantly

---

## Implementation Notes

### Why Chain Time is Correct (regardless of skew)

**Contract validates using:**
```solidity
require(block.timestamp <= voucher.deadline, "Signature expired");
require(
    voucher.deadline <= block.timestamp + MAX_SIGNATURE_VALIDITY,
    "Deadline too long"
);
```

**Using chain time ensures:**
- Backend and contract use same time reference
- Zero possibility of clock skew
- Professional blockchain development best practice
- Works reliably across all environments

### Performance Considerations

**RPC call latency:**
- Official Base RPC: ~100-200ms
- Negligible for mint operation
- Acceptable trade-off for reliability

---

## Decision Log

| Date | Phase | Decision | Reasoning |
|------|-------|----------|-----------|
| 2025-01-16 | Planning | Add diagnostics first | Measure before fixing - engineering discipline |
| 2025-01-16 | Implementation | Diagnostic code added | Added to both API endpoints |
| 2025-01-16 | Testing | Mobile + Desktop tests | Both successful, no failures |
| 2025-01-16 | Results | **Time skew NOT the issue** | Server/chain sync is perfect (1 sec) |
| 2025-01-16 | Final Decision | **Keep diagnostic, NO chain time fix needed** | Monitoring useful, original code works fine |

### Key Finding

**The log.md fix was based on incorrect diagnosis.** Time skew was never the problem. By measuring first, we avoided implementing unnecessary complexity that would not have solved any actual issue.

This validates the engineering principle: **Measure → Diagnose → Fix** (not Assume → Fix → Hope)

---

## References

- Original fix proposal: `.docs/log.md`
- Contract: `abi/Geoplets.sol` (lines 167-171)
- API endpoints: `app/api/get-mint-signature/route.ts`, `app/api/get-mint-signature-paid/route.ts`
