# Signature Clarification - Two Different Signatures

**Date:** 2025-11-04
**Purpose:** Clarify the TWO different signatures in the system

---

## 🔴 CRITICAL: There Are TWO DIFFERENT Signatures

### Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENT FLOW                              │
│                                                              │
│  User → Pay $2 USDC → Get Mint Permission → Mint NFT       │
│         (Signature 1)     (Signature 2)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Signature 1: x402 Payment Authorization (EIP-3009)

### Purpose
**Authorize USDC transfer from user to treasury**

### What It Signs
```typescript
// EIP-3009: transferWithAuthorization
{
  from: "0x..." (user wallet),
  to: "0x..." (treasury),
  value: "2000000" (2 USDC),
  validAfter: "0",
  validBefore: "1730736609",
  nonce: "0xabc..."
}
```

### Who Signs It
**👤 USER signs** with their wallet

### Domain
```typescript
{
  name: "USD Coin",
  version: "2",
  chainId: 8453,
  verifyingContract: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" // USDC Contract
}
```

### Where It's Generated
**Frontend:** `lib/payment-header.ts:94-100`
```typescript
const signature = await walletClient.signTypedData({
  account: from,  // ← USER's account
  domain: { name: 'USD Coin', ... },
  types: { TransferWithAuthorization: [...] },
  primaryType: 'TransferWithAuthorization',
  message: { from, to, value, validAfter, validBefore, nonce }
});
```

### Where It's Used
1. Included in X-Payment header
2. Sent to backend
3. Backend passes to onchain.fi
4. Onchain.fi verifies with USDC contract
5. USDC transfers from user to treasury

### Verification
**On-Chain:** USDC contract verifies user authorized the transfer

---

## Signature 2: Mint Voucher (EIP-721 / Custom)

### Purpose
**Authorize NFT minting for specific user and FID**

### What It Signs
```typescript
// MintVoucher (defined in Geoplet contract)
{
  to: "0x..." (user wallet),
  fid: "123456" (Farcaster ID),
  nonce: "1730736609000",
  deadline: "1730737000"
}
```

### Who Signs It
**🔐 BACKEND signs** with private key (server-side)

### Domain
```typescript
{
  name: "Geoplet",
  version: "1",
  chainId: 8453,
  verifyingContract: "0x..." // Geoplet NFT Contract
}
```

### Where It's Generated
**Backend:** `app/api/get-mint-signature/route.ts:130-206`
```typescript
const signature = await walletClient.signTypedData({
  account,  // ← BACKEND's account (from PRIVATE_KEY)
  domain: { name: 'Geoplet', ... },
  types: { MintVoucher: [...] },
  primaryType: 'MintVoucher',
  message: { to, fid, nonce, deadline }
});
```

### Where It's Used
1. Returned to frontend after payment verified
2. Frontend uses it to call contract's `mint()` function
3. Contract verifies backend authorized this mint
4. NFT minted to user

### Verification
**On-Chain:** Geoplet contract verifies backend authorized the mint

---

## Complete Flow Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                         COMPLETE FLOW                             │
└──────────────────────────────────────────────────────────────────┘

Step 1: User Wants to Mint
┌─────────────┐
│    USER     │
│ (Frontend)  │
└──────┬──────┘
       │ "I want to mint for $2 USDC"
       ↓

Step 2: Generate x402 Payment Authorization
┌─────────────┐
│  SIGNATURE  │ ← USER SIGNS THIS (with wallet)
│     #1      │
│  (EIP-3009) │   Domain: USDC Contract
│             │   Message: { from, to, value: "2000000", nonce, ... }
│  Purpose:   │
│  Authorize  │
│  USDC       │
│  Transfer   │
└──────┬──────┘
       │ Signature: "0xabc..."
       │ Encoded in X-Payment header (base64)
       ↓

Step 3: Send Payment to Backend
┌─────────────┐
│   BACKEND   │
│   API       │
└──────┬──────┘
       │ 1. Decode X-Payment header
       │ 2. Validate structure
       │ 3. Call onchain.fi SDK
       ↓

Step 4: Onchain.fi Verifies & Settles Payment
┌─────────────┐
│ ONCHAIN.FI  │
│   + USDC    │
│  CONTRACT   │
└──────┬──────┘
       │ 1. Verify Signature #1 against USDC contract
       │ 2. Transfer $2 USDC: User → Treasury
       │ 3. Return success
       ↓

Step 5: Generate Mint Authorization
┌─────────────┐
│  SIGNATURE  │ ← BACKEND SIGNS THIS (with private key)
│     #2      │
│(MintVoucher)│   Domain: Geoplet Contract
│             │   Message: { to, fid, nonce, deadline }
│  Purpose:   │
│  Authorize  │
│  NFT Mint   │
└──────┬──────┘
       │ Signature: "0xdef..."
       │ Returned to frontend
       ↓

Step 6: User Mints NFT
┌─────────────┐
│    USER     │
│ (Frontend)  │
└──────┬──────┘
       │ Calls: geopletContract.mint(voucher, signature #2)
       ↓

Step 7: Contract Verifies & Mints
┌─────────────┐
│  GEOPLET    │
│  CONTRACT   │
└──────┬──────┘
       │ 1. Verify Signature #2 against backend address
       │ 2. Check voucher not expired
       │ 3. Mint NFT to user
       │ 4. Mark voucher as used
       ↓

Step 8: Success!
┌─────────────┐
│    USER     │
│  Has NFT    │
│     🎉      │
└─────────────┘
```

---

## Side-by-Side Comparison

| Aspect | Signature #1 (Payment) | Signature #2 (Mint) |
|--------|------------------------|---------------------|
| **Name** | x402 Payment Authorization | Mint Voucher |
| **Standard** | EIP-3009 | Custom (EIP-712) |
| **Signer** | 👤 USER (wallet) | 🔐 BACKEND (server) |
| **Purpose** | Authorize USDC transfer | Authorize NFT mint |
| **Domain Name** | "USD Coin" | "Geoplet" |
| **Domain Version** | "2" | "1" |
| **Verifying Contract** | USDC (0x8335...) | Geoplet (from config) |
| **Message Type** | TransferWithAuthorization | MintVoucher |
| **Fields** | from, to, value, validAfter, validBefore, nonce | to, fid, nonce, deadline |
| **Generated** | Frontend (`lib/payment-header.ts`) | Backend (`app/api/get-mint-signature/route.ts`) |
| **Verified By** | USDC Contract (via onchain.fi) | Geoplet Contract |
| **When** | Before payment | After payment verified |
| **Nonce Type** | 32-byte hex random | Timestamp |

---

## Code Locations

### Signature #1 (Payment Authorization)

**Generation:**
- **File:** `lib/payment-header.ts`
- **Function:** `generateEIP3009Signature()`
- **Lines:** 51-113
- **Signer:** User's wallet (passed via `walletClient`)

**Usage:**
- Encoded in `X-Payment` header
- Sent to backend
- Validated by onchain.fi

### Signature #2 (Mint Voucher)

**Generation:**
- **File:** `app/api/get-mint-signature/route.ts`
- **Function:** `generateMintSignature()`
- **Lines:** 130-206
- **Signer:** Backend server (from `PRIVATE_KEY` env var)

**Usage:**
- Returned to frontend
- Used in contract `mint()` call
- Validated by Geoplet contract

---

## The Nonce Bug We Fixed

### Which Signature Had the Bug?

**Signature #1 (Payment Authorization)** - The EIP-3009 signature

### What Was Wrong

```typescript
// BEFORE FIX - In Signature #1
const signature = await generateEIP3009Signature({
  // This function generated its OWN nonce internally
  // But the authorization object used a DIFFERENT nonce
});

const authorization = {
  nonce: differentNonce  // ❌ MISMATCH
};
```

### What We Fixed

```typescript
// AFTER FIX - In Signature #1
const nonce = generateNonce();  // Generate ONCE

const signature = await generateEIP3009Signature({
  nonce: nonce  // ✅ Use same nonce
});

const authorization = {
  nonce: nonce  // ✅ Use same nonce
};
```

### Signature #2 Was Never Affected

The mint voucher signature (Signature #2) was always correct:
- It generates its own nonce (timestamp)
- No separate authorization object
- Nonce is part of the voucher message
- No mismatch possible

---

## Which Nonce Goes Where?

### Signature #1 (Payment) Nonce

```typescript
// Generated in: lib/payment-header.ts:140
const nonce = generateNonce();  // "0xabc123..."

// Used in TWO places:
// 1. In the EIP-3009 signature message
message: {
  from, to, value, validAfter, validBefore,
  nonce: "0xabc123..."  // ← Signed with this nonce
}

// 2. In the authorization object
authorization: {
  from, to, value, validAfter, validBefore,
  nonce: "0xabc123..."  // ← Must match signature nonce
}

// Why both?
// - Signature proves user authorized the transfer
// - Authorization tells USDC contract the transfer details
// - Nonce must match for verification to succeed
```

### Signature #2 (Mint) Nonce

```typescript
// Generated in: route.ts:145
const nonce = Date.now();  // 1730736609000

// Used in ONE place:
// In the MintVoucher message
voucher: {
  to, fid,
  nonce: 1730736609000,  // ← Part of voucher
  deadline
}

// Why only one?
// - This is a simple authorization voucher
// - Nonce is just for uniqueness
// - No separate authorization object needed
```

---

## Summary Table

| | Signature #1 (Payment) | Signature #2 (Mint) |
|-|------------------------|---------------------|
| **What** | USDC transfer authorization | NFT mint authorization |
| **Who Signs** | 👤 User | 🔐 Backend |
| **Contract** | USDC | Geoplet |
| **Nonce Type** | 32-byte random hex | Timestamp |
| **Nonce Count** | Used in 2 places | Used in 1 place |
| **Bug Fixed?** | ✅ Yes (nonce mismatch) | N/A (was always correct) |
| **Where Generated** | Frontend | Backend |
| **When** | During payment | After payment verified |

---

## Questions & Answers

### Q: Why do we need TWO signatures?

**A:** Different purposes on different contracts:
1. **Payment signature** → Proves user authorized USDC transfer (USDC contract)
2. **Mint signature** → Proves backend authorized NFT mint (Geoplet contract)

### Q: Why doesn't user sign the mint voucher?

**A:** Security & gas optimization:
- User already paid $2 USDC
- Backend verifies payment before signing voucher
- User can mint immediately without another signature prompt
- Backend controls who can mint (prevents abuse)

### Q: Could we use the same signature for both?

**A:** No, they're for different contracts:
- USDC contract needs EIP-3009 format
- Geoplet contract needs MintVoucher format
- Different domains, different purposes

### Q: Which nonce was buggy?

**A:** Only Signature #1 (payment) had the nonce mismatch bug. Signature #2 (mint) was always correct.

### Q: Are both signatures EIP-712?

**A:** Yes, both use EIP-712 typed data signing:
- Signature #1: EIP-712 with EIP-3009 format
- Signature #2: EIP-712 with custom MintVoucher format

---

## Verification Flow

### Signature #1 Verification (Payment)

```
User Wallet → Signs Payment
     ↓
X-Payment Header (base64)
     ↓
Backend Decodes
     ↓
Onchain.fi API
     ↓
USDC Contract
     ↓
✅ Verifies: ecrecover(signature) == user address
✅ Checks: nonce matches authorization
✅ Executes: Transfer USDC
```

### Signature #2 Verification (Mint)

```
Backend → Signs Voucher
     ↓
Returned to Frontend
     ↓
User Calls mint(voucher, signature)
     ↓
Geoplet Contract
     ↓
✅ Verifies: ecrecover(signature) == backend address
✅ Checks: deadline not expired
✅ Checks: voucher not used
✅ Executes: Mint NFT
```

---

## Conclusion

### Key Takeaways

1. **TWO separate signatures** for TWO different purposes
2. **User signs payment** authorization (Signature #1)
3. **Backend signs mint** authorization (Signature #2)
4. **Nonce bug was only in Signature #1** (now fixed)
5. **Both use EIP-712** but with different formats
6. **Both are necessary** for the complete flow

### Current Status

✅ Signature #1 (Payment): **FIXED** - Nonce mismatch resolved
✅ Signature #2 (Mint): **CORRECT** - Was always working
✅ Overall Flow: **READY** - Both signatures properly implemented

---

**Document Created:** 2025-11-04
**Purpose:** Clarify two-signature system
**Status:** Complete and accurate
