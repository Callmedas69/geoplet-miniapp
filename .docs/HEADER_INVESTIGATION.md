# Payment Header Format Investigation

This document investigates the payment header format mismatch between `x402-fetch` (Coinbase) and Onchain.fi's x402 aggregator.

## Problem Summary

We're using two different x402 implementations that generate/expect incompatible payment header formats:

1. **Frontend**: `x402-fetch` v0.7.0 (by Coinbase) - generates payment headers
2. **Backend**: `@onchainfi/x402-aggregator-client` - expects different format

This incompatibility is likely causing the payment verification failures.

---

## Required Format (Onchain.fi Specification)

According to Onchain.fi documentation, the X-Payment header must be a **base64-encoded JSON** with this exact structure:

### JSON Structure (Before Base64 Encoding)

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    "authorization": {
      "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
      "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
      "value": "2000000",
      "validAfter": "0",
      "validBefore": "1730736609",
      "nonce": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
    }
  }
}
```

### Field Definitions

| Field | Type | Description |
|-------|------|-------------|
| `x402Version` | number | Protocol version (always `1`) |
| `scheme` | string | Payment scheme (`"exact"` for USDC) |
| `network` | string | Blockchain network (`"base"` for Base Mainnet) |
| `payload.signature` | hex string | EIP-712 signature of the authorization |
| `payload.authorization.from` | address | Payer's Ethereum address |
| `payload.authorization.to` | address | Recipient's Ethereum address |
| `payload.authorization.value` | string | Amount in atomic units (`"2000000"` = 2.00 USDC) |
| `payload.authorization.validAfter` | string | Unix timestamp - valid after (typically `"0"`) |
| `payload.authorization.validBefore` | string | Unix timestamp - expiration time |
| `payload.authorization.nonce` | hex string | 32-byte random nonce (prevents replay) |

### Base64 Encoding

After constructing the JSON, it must be base64-encoded:

```javascript
const paymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: "base",
  payload: {
    signature: "0x...",  // EIP-712 signature
    authorization: {
      from: "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
      to: "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
      value: "2000000",  // 2 USDC in atomic units (6 decimals)
      validAfter: "0",
      validBefore: "1730736609",  // Unix timestamp
      nonce: "0xabc..."  // 32-byte random nonce
    }
  }
};

const paymentHeader = btoa(JSON.stringify(paymentPayload));
```

### Example Base64-Encoded Header

```
eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHgxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjIwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTczMDczNjYwOSIsIm5vbmNlIjoiMHhhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwIn19fQ==
```

---

## Current Implementation Format

### What `x402-fetch` Generates

Based on our previous error logs, `x402-fetch` (Coinbase's library) generates payment headers with this structure:

```json
{
  "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
  "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
  "value": "2000000",
  "scheme": "exact",
  "network": "base"
}
```

### Format Comparison

| Field | Onchain.fi Format | x402-fetch Format | Status |
|-------|------------------|-------------------|--------|
| `x402Version` | ✅ Required | ❌ Missing | **MISSING** |
| `scheme` | ✅ Top-level | ✅ Top-level | ✅ Match |
| `network` | ✅ Top-level | ✅ Top-level | ✅ Match |
| `payload` wrapper | ✅ Required | ❌ Missing | **MISSING** |
| `signature` | ✅ In payload | ❌ Missing | **MISSING** |
| `authorization` wrapper | ✅ In payload | ❌ Missing | **MISSING** |
| `from` | ✅ In authorization | ✅ Top-level | ⚠️ Wrong location |
| `to` | ✅ In authorization | ✅ Top-level | ⚠️ Wrong location |
| `value` | ✅ In authorization | ✅ Top-level | ⚠️ Wrong location |
| `validAfter` | ✅ Required | ❌ Missing | **MISSING** |
| `validBefore` | ✅ Required | ❌ Missing | **MISSING** |
| `nonce` | ✅ Required | ❌ Missing | **MISSING** |

### Missing Components

The `x402-fetch` generated header is missing:

1. ❌ `x402Version` field
2. ❌ `payload` wrapper object
3. ❌ `signature` field (EIP-712 signature)
4. ❌ `authorization` wrapper object
5. ❌ `validAfter` timestamp
6. ❌ `validBefore` timestamp
7. ❌ `nonce` field

---

## Common Mistakes (From Onchain.fi)

According to Onchain.fi documentation, common payment header mistakes include:

1. **Sending the signature directly** instead of the full JSON structure
2. **Forgetting to base64 encode** the JSON
3. **Double encoding** (encoding twice)
4. **Missing required fields** like `x402Version`, `scheme`, or `network`
5. **Wrong value format** - must be atomic units (USDC has 6 decimals, so $2.00 = `"2000000"`)

**Our Issue**: #4 - Missing multiple required fields

---

## Debugging Tools

### Decode Payment Header

To inspect what's being sent, use this code (already implemented in route.ts:281-293):

```javascript
try {
  const decoded = Buffer.from(paymentHeader, 'base64').toString();
  console.log('📋 Decoded payload:', JSON.parse(decoded));
} catch (error) {
  console.error('❌ Invalid payment header:', error.message);
}
```

### Validate Structure

```javascript
function validatePaymentHeader(decoded: any): boolean {
  const required = [
    'x402Version',
    'scheme',
    'network',
    'payload',
    'payload.signature',
    'payload.authorization',
    'payload.authorization.from',
    'payload.authorization.to',
    'payload.authorization.value',
    'payload.authorization.validAfter',
    'payload.authorization.validBefore',
    'payload.authorization.nonce',
  ];

  for (const field of required) {
    const parts = field.split('.');
    let obj = decoded;
    for (const part of parts) {
      if (!obj || !(part in obj)) {
        console.error(`Missing required field: ${field}`);
        return false;
      }
      obj = obj[part];
    }
  }
  return true;
}
```

---

## Root Cause Analysis

### Why the Incompatibility Exists

**Coinbase's x402-fetch** implements the x402 payment protocol according to Coinbase's specification:
- Repository: https://github.com/coinbase/x402
- Version: 0.7.0
- Focus: EVM chains (Ethereum, Base, etc.)

**Onchain.fi's x402-aggregator** implements their own interpretation/extension of x402:
- Requires additional metadata (`x402Version`)
- Requires nested structure (`payload` wrapper)
- Requires signature to be included in header

**These are NOT compatible implementations** of the x402 protocol.

---

## Solution Options

### Option 1: Replace x402-fetch with Onchain.fi Frontend SDK

**Action**: Ask Onchain.fi if they have a frontend library for generating payment headers.

**Pros**:
- Guaranteed compatibility
- Official support

**Cons**:
- May not exist
- Would require refactoring frontend payment logic

### Option 2: Manually Construct Payment Headers

**Action**: Build payment headers manually to match Onchain.fi's format.

**Implementation**:

```typescript
// In hooks/usePayment.ts

import { createWalletClient, custom } from 'viem';
import { base } from 'viem/chains';

async function createOnchainFiPaymentHeader(
  walletClient: any,
  userAddress: string,
  recipientAddress: string,
  amount: string
): Promise<string> {
  // 1. Generate nonce
  const nonce = `0x${crypto.randomBytes(32).toString('hex')}`;

  // 2. Set validity period (5 minutes from now)
  const validBefore = Math.floor(Date.now() / 1000) + 300;

  // 3. Create authorization object (EIP-3009 format)
  const authorization = {
    from: userAddress,
    to: recipientAddress,
    value: amount, // "2000000" for 2.00 USDC
    validAfter: "0",
    validBefore: validBefore.toString(),
    nonce: nonce,
  };

  // 4. Create EIP-712 typed data for signature
  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId: 8453, // Base Mainnet
    verifyingContract: process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS as `0x${string}`,
  };

  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  // 5. Sign authorization with EIP-712
  const signature = await walletClient.signTypedData({
    account: userAddress as `0x${string}`,
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: userAddress as `0x${string}`,
      to: recipientAddress as `0x${string}`,
      value: BigInt(amount),
      validAfter: BigInt(0),
      validBefore: BigInt(validBefore),
      nonce: nonce as `0x${string}`,
    },
  });

  // 6. Construct Onchain.fi payment header format
  const paymentPayload = {
    x402Version: 1,
    scheme: "exact",
    network: "base",
    payload: {
      signature: signature,
      authorization: authorization,
    },
  };

  // 7. Base64 encode
  const paymentHeader = btoa(JSON.stringify(paymentPayload));

  return paymentHeader;
}
```

**Pros**:
- Full control over format
- No dependency on incompatible library

**Cons**:
- More complex code
- Need to implement EIP-3009 signing manually
- Maintenance burden

### Option 3: Use Different x402 Aggregator

**Action**: Find an x402 aggregator compatible with Coinbase's x402-fetch.

**Examples**:
- Coinbase's own facilitator (if available)
- Other x402 aggregators that follow Coinbase's spec

**Pros**:
- Keep using x402-fetch
- Simpler implementation

**Cons**:
- May not exist
- Loses Onchain.fi features (facilitator routing, etc.)

### Option 4: Create Translation Layer

**Action**: Intercept payment headers from x402-fetch and transform them to Onchain.fi format.

**Implementation**:

```typescript
// In app/api/get-mint-signature/route.ts

async function transformPaymentHeader(
  x402FetchHeader: string,
  walletClient: any
): Promise<string> {
  // Decode x402-fetch format
  const decoded = JSON.parse(Buffer.from(x402FetchHeader, 'base64').toString());

  // Extract fields
  const { from, to, value, scheme, network } = decoded;

  // Generate missing fields
  const nonce = `0x${crypto.randomBytes(32).toString('hex')}`;
  const validBefore = Math.floor(Date.now() / 1000) + 300;

  // Get signature (need to re-sign with EIP-712)
  const signature = await createEIP3009Signature(
    walletClient,
    from,
    to,
    value,
    validBefore,
    nonce
  );

  // Transform to Onchain.fi format
  const onchainFiPayload = {
    x402Version: 1,
    scheme,
    network,
    payload: {
      signature,
      authorization: {
        from,
        to,
        value,
        validAfter: "0",
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  };

  return btoa(JSON.stringify(onchainFiPayload));
}
```

**Pros**:
- Keeps x402-fetch on frontend
- Backend handles transformation

**Cons**:
- Backend needs wallet client (security concern)
- Complex implementation
- Can't re-sign without user's wallet

---

## Recommended Solution

**Recommendation**: **Option 2 - Manually Construct Payment Headers**

### Why This Is Best

1. **Full Control**: We control the exact format sent to Onchain.fi
2. **No Dependencies**: Don't rely on incompatible libraries
3. **Security**: User signs in browser (not on server)
4. **Maintainability**: Clear, explicit code
5. **Compatibility**: Guaranteed to match Onchain.fi spec

### Implementation Steps

1. Remove `x402-fetch` dependency
2. Implement manual EIP-3009 signing in `hooks/usePayment.ts`
3. Construct payment header in Onchain.fi format
4. Send manual fetch request with X-Payment header
5. Backend verifies with Onchain.fi as-is

---

## Testing Your Implementation

### Valid Example Request (From Onchain.fi)

```bash
curl -X POST https://api.onchain.fi/v1/verify \
  -H 'X-API-Key: onchain_8545d9f230ea9b7a5e53c3f36b249d339d84e332012a16feae0bb8ce0c768f03' \
  -H 'Content-Type: application/json' \
  -d '{
    "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHgxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjIwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTczMDczNjYwOSIsIm5vbmNlIjoiMHhhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwIn19fQ==",
    "network": "base",
    "expectedAmount": "2.00",
    "expectedToken": "USDC",
    "recipientAddress": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0"
  }'
```

### Checklist Before Sending to Onchain.fi

- [ ] Payment header is base64-encoded
- [ ] Decoded JSON includes `x402Version: 1`
- [ ] Has `payload` wrapper object
- [ ] Has `payload.signature` (EIP-712 signature)
- [ ] Has `payload.authorization` object
- [ ] `authorization.from` is payer's address
- [ ] `authorization.to` is recipient's address
- [ ] `authorization.value` is in atomic units (`"2000000"` for 2.00 USDC)
- [ ] `authorization.validAfter` is set (typically `"0"`)
- [ ] `authorization.validBefore` is future timestamp
- [ ] `authorization.nonce` is 32-byte random hex string
- [ ] Signature matches authorization (verify locally before sending)

---

## Next Steps

1. **Decide on solution approach** (Recommendation: Option 2)
2. **Implement manual payment header construction**
3. **Test with Onchain.fi API** (use curl first)
4. **Verify signature validation** works
5. **Integrate into frontend payment flow**
6. **Update documentation** with final implementation

---

## References

- Onchain.fi API: `https://api.onchain.fi/v1`
- x402-fetch GitHub: https://github.com/coinbase/x402
- EIP-3009 (Transfer With Authorization): https://eips.ethereum.org/EIPS/eip-3009
- EIP-712 (Typed Structured Data): https://eips.ethereum.org/EIPS/eip-712
- Base USDC Address: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

---

## Version History

| Date | Changes |
|------|---------|
| 2025-11-03 | Initial investigation - identified x402-fetch incompatibility with Onchain.fi |
