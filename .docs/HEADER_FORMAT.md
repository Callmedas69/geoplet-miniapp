# Payment Header & EIP-712 Signature Format

This document describes the exact format of the x402 Payment Header and EIP-712 Signature used in the Geoplet minting system.

## X-Payment Header Format (x402 Payment Authorization)

### Header Specification

- **Header Name:** `X-Payment`
- **Encoding:** Base64-encoded JSON string
- **Protocol:** x402 v1 (EIP-3009 compatible)
- **Network:** Base
- **Token:** USDC (6 decimals)
- **Amount:** 2.00 USDC (2000000 atomic units)

### Decoded Structure

```json
{
  "scheme": "exact",
  "network": "base",
  "payload": {
    "authorization": {
      "from": "0x...",
      "to": "0x...",
      "value": "2000000"
    }
  }
}
```

### 402 Payment Required Response

When the `X-Payment` header is missing, the API returns:

```json
{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "base",
      "maxAmountRequired": "2000000",
      "asset": "${BASE_USDC_ADDRESS}",
      "payTo": "${RECIPIENT_ADDRESS}",
      "resource": "${APP_URL}/api/get-mint-signature",
      "description": "Mint your unique Geoplet NFT for 2.00 USDC",
      "mimeType": "application/json",
      "maxTimeoutSeconds": 300,
      "extra": {
        "name": "USD Coin",
        "version": "2"
      }
    }
  ],
  "error": "Payment Required"
}
```

**HTTP Status:** `402 Payment Required`

---

## EIP-712 Signature Format (Mint Voucher)

### Domain Configuration

```typescript
{
  ...GEOPLET_CONFIG.eip712.domain,
  chainId: GEOPLET_CONFIG.chainId,
  verifyingContract: GEOPLET_CONFIG.address
}
```

### Type Definition

**Primary Type:** `MintVoucher`

**Types:**
```typescript
GEOPLET_CONFIG.eip712.types
```

### Message Structure (Internal)

```typescript
{
  to: Address,           // 0x... (user's wallet address)
  fid: bigint,          // Farcaster ID as BigInt
  nonce: bigint,        // Timestamp in milliseconds as BigInt
  deadline: bigint      // Unix timestamp in seconds as BigInt (5 min expiry)
}
```

### Voucher Response (JSON-serialized)

```typescript
{
  to: "0x...",
  fid: "123456",
  nonce: "1730678400000",
  deadline: "1730678700"
}
```

### Signature Verification

The API performs local signature verification before returning:

```typescript
const recovered = await recoverTypedDataAddress({
  domain: { ...domain },
  types: { ...types },
  primaryType: 'MintVoucher',
  message: voucher,
  signature
});

// Must match signer's address
isAddressEqual(recovered, signerAddress)
```

---

## Implementation Details

### Payment Flow

1. **Request without X-Payment** → 402 Response with payment terms
2. **Client generates EIP-3009 signature** → Encodes as base64
3. **Request with X-Payment header** → Payment verification via Onchain.fi
4. **Payment settles on-chain** → USDC transferred to treasury
5. **Mint signature generated** → EIP-712 signature returned

### Security Features

- **Payment verification & settlement** via x402 header
- **EIP-712 signature** with deadline (5 min expiry)
- **Nonce uniqueness** (timestamp-based)
- **Signature verification** before response
- **CORS protection** with origin validation

### Environment Variables

```bash
PRIVATE_KEY=0x...                    # Signer private key
NEXT_PUBLIC_RECIPIENT_ADDRESS=0x...  # Treasury address
ONCHAIN_FI_API_KEY=...              # Onchain.fi API key
BASE_USDC_ADDRESS=0x...             # Base USDC contract address
NEXT_PUBLIC_APP_URL=https://...     # Application URL
```

---

## References

- **Implementation:** `app/api/get-mint-signature/route.ts`
- **Contract Config:** `lib/contracts.ts` (GEOPLET_CONFIG)
- **x402 Protocol:** https://docs.onchain.fi
- **EIP-712:** https://eips.ethereum.org/EIPS/eip-712
- **EIP-3009:** https://eips.ethereum.org/EIPS/eip-3009
