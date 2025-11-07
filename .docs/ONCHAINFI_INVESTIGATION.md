### 1. Exact Code Where `verifyAndSettle()` is Called

**Location**: `app/api/get-mint-signature/route.ts:88-96`

```typescript
const result = await client.verifyAndSettle(
  paymentHeader,
  {
    network: 'base',
    expectedAmount: MINT_PRICE,  // '2.00'
    expectedToken: 'USDC',
    recipientAddress: RECIPIENT_ADDRESS,
  }
);
```

### 2. Network Parameter

**Network**: `'base'` (Base Mainnet - Chain ID 8453)

**Full Verification Config**:
- `network`: `'base'`
- `expectedAmount`: `'2.00'` (defined at line 33 as `MINT_PRICE`)
- `expectedToken`: `'USDC'`
- `recipientAddress`: Value from `process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS`

### 3. Server-Side vs Client-Side

**TYPE**: Server-Side (API Route)

**Location**: Backend API route - `app/api/get-mint-signature/route.ts`

This is a Next.js API route that runs on the server, NOT in the browser.

### 4. Expected Payment Header Format

According to Onchain.fi documentation, the X-Payment header must be a **base64-encoded JSON** with this structure:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0x1234567890abcdef...",
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

**Important**: The decoded header from our current logs shows a DIFFERENT structure:
```json
{
  "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
  "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
  "value": "2000000",
  "scheme": "exact",
  "network": "base"
}
```

**Issue**: Missing `x402Version` and `payload` wrapper with `signature` and `authorization`.

This suggests `x402-fetch` library may be generating an incompatible format for Onchain.fi.

### 5. Error Messages

2025-11-03 14:35:09.332 [info] Verifying x402 payment...
2025-11-03 14:35:09.341 [info] 🔒 [PRODUCTION] Using Onchain.fi payment verification
2025-11-03 14:35:09.341 [info] [TEST] Payment Details: {
  from: '0x678170B0f3ad9aa98b000494Af32e4115a0f0f62',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '2000000',
  scheme: 'exact',
  network: 'base'
}
2025-11-03 14:35:09.341 [info] [ONCHAIN.FI] Verifying and settling x402 payment...
2025-11-03 14:35:24.427 [warning] Request failed (attempt 1/4): HTTP 502: Bad Gateway
2025-11-03 14:35:40.436 [warning] Request failed (attempt 2/4): HTTP 502: Bad Gateway
2025-11-03 14:35:57.442 [warning] Request failed (attempt 3/4): HTTP 502: Bad Gateway
2025-11-03 14:36:16.450 [warning] Request failed (attempt 4/4): HTTP 502: Bad Gateway
2025-11-03 14:36:16.450 [error] All retry attempts exhausted { error: 'HTTP 502: Bad Gateway' }
2025-11-03 14:36:16.451 [info] [ONCHAIN.FI] Payment result: {
  verified: false,
  settled: false,
  txHash: undefined,
  facilitator: 'none'
}
2025-11-03 14:36:16.451 [error] [ONCHAIN.FI] ❌ Payment failed: {
  verified: false,
  settled: false,
  reason: 'Payment not fully settled on-chain'
}