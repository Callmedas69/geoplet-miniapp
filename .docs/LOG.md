# onchain.fi API Test Results
# Test Run: 2025-11-08T11:47:17.566Z

## Summary
- Total Tests: 5
- Passed: 2 ✅
- Failed: 3 ❌
- Skipped: 0

## Critical Finding
**BOTH /verify AND /settle endpoints return the SAME error**: "Invalid request body" (400)

This indicates the issue is NOT with a specific endpoint but with how we're formatting the request body or payment header structure.

## Test Results

### ✅ Test 1: Supported Networks (PASSED)
- **Status**: 200 OK
- **Duration**: 91ms
- **Endpoint**: GET /v1/supported
- **Result**: Successfully retrieved list of 14 supported networks
- **Networks**: abstract, abstract-testnet, avalanche, avalanche-fuji, **base**, **base-mainnet**, base-sepolia, iotex, peaq, polygon, polygon-amoy, sei, sei-testnet, solana, solana-devnet
- **Conclusion**: API key is VALID ✅

### ✅ Test 2: Get Facilitators (PASSED)
- **Status**: 200 OK
- **Duration**: 267ms
- **Endpoint**: GET /v1/facilitators?network=base&token=USDC
- **Result**: Successfully retrieved 7 facilitators
- **Facilitators**:
  1. OctonetAI (0% fees, 622ms latency)
  2. Coinbase CDP (0.5% + $0.001)
  3. x402.rs (0.3%)
  4. Daydreams (0% fees, 260ms latency)
  5. Aurracloud (0% fees, 750ms latency)
  6. OpenX402 (0% fees, 388ms latency)
  7. PayAI (0% fees, 310ms latency)
- **Conclusion**: API key works, facilitators are available ✅

### ❌ Test 3: Verify Payment (FAILED)
- **Status**: 400 Bad Request
- **Duration**: 32ms
- **Endpoint**: POST /v1/verify
- **Request Body**:
```json
{
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHg1ZTBmZTRjMDZkOTQ3OGU2YzE3MzkyZDhhYjA2NmYzZWYyZmM4NDBjMGZhZjVhZWM4MDEwZDg1MTAxYzNkOTI1NjkxMmQ2MDE1MGVkMDg0MDJkZmVkNGQ0NGZlMTM1ZTc5NzBlYTUxNzNjNDQwZDA5ODU3ZTk1MGQxMDdmZWRlMzFjIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjMwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc2MjYwMjk0NSIsIm5vbmNlIjoiMHhkZDQzNTA5MjU2MzA0NDA0NzFkMTcyOGRjZjEyMTc0OGViOWMzODNiZTlhNmQ0MjkwM2ZkOTEzN2RkZThiNWRkIn19fQ==",
  "network": "base",
  "expectedAmount": "3.00",
  "expectedToken": "USDC",
  "recipientAddress": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
  "priority": "balanced"
}
```
- **Response**:
```json
{
  "status": "error",
  "message": "Invalid request body"
}
```
- **Conclusion**: Verify endpoint rejects our request ❌

### ❌ Test 4: Settle Payment (FAILED)
- **Status**: 400 Bad Request
- **Duration**: 52ms
- **Endpoint**: POST /v1/settle
- **Request Body**:
```json
{
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHg1ZTBmZTRjMDZkOTQ3OGU2YzE3MzkyZDhhYjA2NmYzZWYyZmM4NDBjMGZhZjVhZWM4MDEwZDg1MTAxYzNkOTI1NjkxMmQ2MDE1MGVkMDg0MDJkZmVkNGQ0NGZlMTM1ZTc5NzBlYTUxNzNjNDQwZDA5ODU3ZTk1MGQxMDdmZWRlMzFjIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjMwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc2MjYwMjk0NSIsIm5vbmNlIjoiMHhkZDQzNTA5MjU2MzA0NDA0NzFkMTcyOGRjZjEyMTc0OGViOWMzODNiZTlhNmQ0MjkwM2ZkOTEzN2RkZThiNWRkIn19fQ==",
  "network": "base",
  "priority": "balanced"
}
```
- **Response**:
```json
{
  "status": "error",
  "message": "Invalid request body"
}
```
- **Conclusion**: Settle endpoint also rejects our request ❌

### ❌ Test 5: Verify + Settle (FAILED)
- **Duration**: 31ms
- **Error**: "Verify step failed: Invalid request body"
- **Conclusion**: Cannot proceed to settle because verify fails ❌

---

## Analysis

### What's Working ✅
1. API key authentication
2. GET endpoints (supported networks, facilitators)
3. Network connectivity to onchain.fi

### What's NOT Working ❌
1. POST /v1/verify returns "Invalid request body"
2. POST /v1/settle returns "Invalid request body"
3. SAME error for BOTH endpoints

### Key Observations

1. **Both POST endpoints fail with identical error**
   - This suggests a common issue with our request structure
   - Not endpoint-specific validation

2. **Payment Header Structure** (decoded):
```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0x5e0fe4c06d9478e6c17392d8ab066f3ef2fc840c0faf5aec8010d85101c3d925691 2d60150ed08402dfed4d44fe135e7970ea5173c440d09857e950d107fede31c",
    "authorization": {
      "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
      "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
      "value": "3000000",
      "validAfter": "0",
      "validBefore": "1762602945",
      "nonce": "0xdd43509256304404721d1728dcf121748eb9c383be9a6d42903fd9137dde8b5dd"
    }
  }
}
```

3. **Payment header was NOT expired at test time**
   - validBefore: 1762602945 (2025-11-08T11:55:45Z)
   - Test ran at: 2025-11-08T11:47:17Z
   - Time remaining: ~8 minutes ✅

4. **Request body fields match documented API spec**
   - paymentHeader: ✅ base64 string
   - network: ✅ "base" (confirmed supported)
   - expectedAmount: ✅ "3.00" (decimal format)
   - expectedToken: ✅ "USDC"
   - recipientAddress: ✅ valid address
   - priority: ✅ "balanced"

### Hypotheses

#### Hypothesis 1: Payment Header Signature Invalid
- onchain.fi might be validating the EIP-3009 signature cryptographically
- Signature might not match the authorization data
- **Test**: Verify signature locally using viem

#### Hypothesis 2: Request Body Schema Change
- onchain.fi API schema might have changed
- Field order might matter
- Field types might be strict
- **Test**: Contact onchain.fi support for current schema

#### Hypothesis 3: API Key Permissions
- API key works for GET endpoints but not POST
- Might need specific permissions for /verify and /settle
- **Test**: Check API key settings on onchain.fi dashboard

#### Hypothesis 4: Missing Required Field
- Documentation might be outdated
- New required field not documented
- **Test**: Try minimal request, add fields one by one

---

## Recommended Next Steps

1. **Contact onchain.fi Support** (HIGHEST PRIORITY)
   - Provide them the exact request body from Test 3
   - Ask for specific validation error details
   - Request current API schema documentation

2. **Verify Signature Locally**
   - Use viem to verify the EIP-3009 signature
   - Ensure signature matches authorization data
   - Check if signature is cryptographically valid

3. **Test with Different Payment Amounts**
   - Try $1.00, $2.00, $5.00
   - See if amount affects validation

4. **Check API Key Permissions**
   - Log into onchain.fi dashboard
   - Verify API key has /verify and /settle permissions
   - Generate new API key if needed

5. **Try Removing Optional Fields**
   - Remove `priority` field from verify request
   - Remove other optional fields one by one
   - Identify which field causes rejection

---

## Full Test Output

API URL: https://api.onchain.fi/v1
Test Timestamp: 2025-11-08T11:47:17.566Z
Payment Header Expiry: 2025-11-08T11:55:45.000Z (still valid ✅)
