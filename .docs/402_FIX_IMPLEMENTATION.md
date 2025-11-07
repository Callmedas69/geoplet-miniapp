# 402 Payment & EIP-712 Signature Fix Implementation

## Overview

Implementation plan for fixing contract-level and backend-level signature handling based on GPT.md best practices, following KISS principle.

---

## Critical Review Against CLAUDE.md Principles

### What NOT to do:
- ❌ Over-complicated solutions with many changes at once
- ❌ Make assumptions without verifying actual issues
- ❌ Add unnecessary logging, custom errors, complex validation
- ❌ Over-engineer the solution

### What TO do:
- ✅ Identify the ONE critical issue
- ✅ Fix it simply and cleanly
- ✅ Follow GPT.md recommendations exactly
- ✅ Pure KISS principle

---

## The Actual Issue (From GPT.md Section 5)

### Current Implementation Problem

**Location:** `abi/Geoplet.sol` lines 127-147

**Current Code (SUBOPTIMAL):**
```solidity
// Line 127-128: Replay protection using signature bytes
bytes32 signatureHash = keccak256(signature);
require(!usedSignatures[signatureHash], "Signature already used");

// Line 131-141: Calculate digest
bytes32 digest = _hashTypedDataV4(
    keccak256(
        abi.encode(
            MINT_VOUCHER_TYPEHASH,
            voucher.to,
            voucher.fid,
            voucher.nonce,
            voucher.deadline
        )
    )
);

// Line 143-144: Verify signature
address recoveredSigner = ECDSA.recover(digest, signature);
require(recoveredSigner == signerWallet, "Invalid signature");

// Line 147: Mark signature as used
usedSignatures[signatureHash] = true;
```

**Problem:**
- Tracks replay by `keccak256(signature)` (signature bytes)
- Same voucher could potentially be used with different signature encodings
- Not following GPT.md recommended best practice

---

## Solution (KISS Approach)

### Contract Fix: Digest-Based Replay Protection

**One simple change:** Use digest instead of signature bytes for replay protection

**Updated Code:**
```solidity
// 1. Calculate digest FIRST
bytes32 digest = _hashTypedDataV4(
    keccak256(
        abi.encode(
            MINT_VOUCHER_TYPEHASH,
            voucher.to,
            voucher.fid,
            voucher.nonce,
            voucher.deadline
        )
    )
);

// 2. Check digest not used (MOVED HERE - use digest not signature)
require(!usedSignatures[digest], "Voucher used");

// 3. Verify signature
address recoveredSigner = ECDSA.recover(digest, signature);
require(recoveredSigner == signerWallet, "Invalid signature");

// 4. Mark digest as used (CHANGED from signatureHash to digest)
usedSignatures[digest] = true;
```

**Changes Summary:**
1. Move digest calculation before replay check
2. Change `bytes32 signatureHash = keccak256(signature)` → check `digest` directly
3. Remove signatureHash variable (no longer needed)
4. Change `usedSignatures[signatureHash]` → `usedSignatures[digest]`

**Security Benefit:**
- ✅ Stronger replay protection
- ✅ Prevents same voucher being reused regardless of signature format
- ✅ Follows GPT.md Section 5 recommendation exactly

---

### Backend Fix: Signature Doctor (Verification)

**Location:** `app/api/get-mint-signature/route.ts`

**Add After Signature Generation:**

```typescript
import { recoverTypedDataAddress, isAddressEqual } from 'viem';

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

  // ✅ NEW: Signature Doctor - Verify locally before sending to frontend
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
```

**Changes Summary:**
1. Import `recoverTypedDataAddress` and `isAddressEqual` from viem
2. Add signature verification after generation
3. Throw error if recovered signer doesn't match expected
4. Log success when verification passes

**Benefit:**
- ✅ Catch signature issues before sending to frontend
- ✅ Prevent failed transactions due to signing errors
- ✅ Early detection of domain/chainId/verifyingContract mismatches
- ✅ Follows GPT.md Section 4 "Signature Doctor" recommendation

---

## Implementation Steps

### Step 1: Update Smart Contract

**File:** `abi/Geoplet.sol`

**Lines to modify:** 127-147 in `mintGeoplet()` function

**Action:**
1. Remove `bytes32 signatureHash = keccak256(signature);` (line 127)
2. Move digest calculation before replay check
3. Change `require(!usedSignatures[signatureHash]` to `require(!usedSignatures[digest]`
4. Change `usedSignatures[signatureHash] = true` to `usedSignatures[digest] = true`

**Test Locally:**
```bash
# Using Foundry
forge test --match-contract GeopletTest -vvv
```

**Deploy to Base Mainnet:**
```bash
forge script script/Deploy.s.sol:DeployGeoplet --rpc-url base --broadcast --verify
```

**Update Contract Address:**
After deployment, update contract address in:
- `abi/GeopletABI.ts` - Update `TESTPLET_ADDRESSES.baseMainnet`
- `lib/contracts.ts` - Will auto-update via `getGeopletAddress()`

---

### Step 2: Update Backend Signature Generation

**File:** `app/api/get-mint-signature/route.ts`

**Action:**
1. Add imports: `recoverTypedDataAddress`, `isAddressEqual`
2. Add signature verification after `walletClient.signTypedData()`
3. Add error handling for verification failure

**Test:**
```bash
npm run dev
# Test payment flow in browser
```

---

### Step 3: Update Frontend Config (if needed)

**File:** `lib/contracts.ts`

**Action:**
- Verify `GEOPLET_CONFIG.address` points to new contract
- Should auto-update via `getGeopletAddress(CHAIN_ID)`

---

### Step 4: Integration Testing

**Test Complete Flow:**
1. User initiates mint
2. x402-fetch prompts for payment
3. User signs USDC transfer
4. Backend verifies payment via Onchain.fi
5. Backend generates mint signature with local verification ✅ NEW
6. Frontend receives signature
7. User mints NFT with signature
8. Contract verifies signature with digest-based replay protection ✅ NEW

**Verify:**
- ✅ Payment successful
- ✅ USDC transferred to treasury
- ✅ Backend signature verification passes
- ✅ Contract mint succeeds
- ✅ NFT appears in user wallet
- ✅ Replay attack prevented (try using same voucher twice)

---

## Files Modified

### Contract Files:
- `abi/Geoplet.sol` - Digest-based replay protection
- `abi/GeopletABI.ts` - Updated contract address after deployment

### Backend Files:
- `app/api/get-mint-signature/route.ts` - Signature doctor verification

### Config Files:
- `lib/contracts.ts` - Contract address (auto-updates)

---

## Security Improvements

### Contract Level:
✅ **Stronger Replay Protection**
- Old: Tracked by `keccak256(signature)` - signature bytes
- New: Tracked by `digest` - voucher content hash
- Prevents same voucher being reused with different signature encodings

### Backend Level:
✅ **Early Error Detection**
- Verifies signature locally before sending to user
- Catches domain/chainId/verifyingContract mismatches
- Prevents failed transactions due to signing errors

---

## Timeline Estimate

1. **Contract modification:** 15 minutes
2. **Contract testing:** 30 minutes
3. **Contract deployment:** 15 minutes
4. **Backend modification:** 15 minutes
5. **Integration testing:** 30 minutes

**Total:** ~1.5-2 hours

---

## Success Criteria

- ✅ Contract deployed with digest-based replay protection
- ✅ Backend signature verification added
- ✅ Full payment → mint flow works end-to-end
- ✅ Replay attacks prevented
- ✅ No signature verification failures
- ✅ USDC transfers to treasury correctly

---

## Rollback Plan

If issues occur:

1. **Contract Issues:**
   - Revert to previous contract address in `abi/GeopletABI.ts`
   - Previous contract still functional

2. **Backend Issues:**
   - Remove signature verification temporarily
   - Still secure (contract validates onchain)

---

## References

- **GPT.md Section 4:** Signature Doctor verification
- **GPT.md Section 5:** Digest-based replay protection
- **CLAUDE.md:** KISS Principle, no over-engineering
- **Current Implementation:** Working x402 + Onchain.fi flow

---

## Notes

**KISS Principle Applied:**
- Only 2 changes (contract replay + backend verification)
- No custom errors (unnecessary complexity)
- No extra logging (keep it simple)
- No environment validation (not needed)
- Pure security improvements, no fluff

**Gas Impact:**
- Minimal (digest already calculated for signature verification)
- No additional storage or computation
- Same gas cost as before

**Compatibility:**
- No breaking changes to frontend
- No changes to payment flow
- No changes to Onchain.fi integration
- Only internal security improvements
