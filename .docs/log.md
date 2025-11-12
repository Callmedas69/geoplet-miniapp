2025-11-12 16:31:36.615 [info] [ENV] ✅ All required environment variables present
2025-11-12 16:31:36.616 [info] [VALIDATION] Starting payment header validation...
2025-11-12 16:31:36.616 [info] [DEBUG] Raw X-Payment header (base64): eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHgwMDRlOGM4NTVmNTBkYWYyZDNlZTAxZmFhNWVkYjlmMjZiMWIxNmI1ZmI4YTg5YTU4OTVmNTFkYWRlYjFhNmVkMTZkMDc0MTk3OTNiMWZiNWZlODEyNzZiNzA0YjdmMjAzYTg2YjJhOTlkNjNhZDFlYzBlY2UzNDc4YjEzZjk3MTFjIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjE5OTAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc2Mjk2NTk5MSIsIm5vbmNlIjoiMHhlODQxMmVkYWY5YjkwZjJhMjU5YzlmNDVkYjBkMjA0ZmZlMDA4ZTE5YmIyYzA5ZTI5ZTk1OGQ0ZmY0YWQzNTdkIn19fQ==
2025-11-12 16:31:36.617 [info] [DEBUG] X-Payment header length: 628 characters
2025-11-12 16:31:36.617 [info] [DEBUG] Full decoded payment header: {
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0x004e8c855f50daf2d3ee01faa5edb9f26b1b16b5fb8a89a5895f51dadeb1a6ed16d07419793b1fb5fe81276b704b7f203a86b2a99d63ad1ec0ece3478b13f9711c",
    "authorization": {
      "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
      "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
      "value": "1990000",
      "validAfter": "0",
      "validBefore": "1762965991",
      "nonce": "0xe8412edaf9b90f2a259c9f45db0d204ffe008e19bb2c09e29e958d4ff4ad357d"
    }
  }
}
2025-11-12 16:31:36.617 [info] [VALIDATION] Authorization details: {
  from: '0x678170B0f3ad9aa98b000494Af32e4115a0f0f62',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '1990000',
  validAfter: '0',
  validBefore: '1762965991',
  nonce: '0xe8412edaf9b90f2a259c9f45db0d204ffe008e19bb2c09e29e958d4ff4ad357d'
}
2025-11-12 16:31:36.617 [info] [VALIDATION PASSED] Payment header structure is correct
2025-11-12 16:31:36.617 [info] [ONCHAIN.FI] Verifying payment (settlement deferred)...
2025-11-12 16:31:36.618 [info] [PAYMENT-CHECK] Signature validity check: {
  validBefore: 1762965991,
  currentTime: 1762965096,
  expiresIn: '895s',
  isExpired: false,
  validBeforeISO: '2025-11-12T16:46:31.000Z',
  currentTimeISO: '2025-11-12T16:31:36.000Z'
}
2025-11-12 16:31:36.618 [info] [ONCHAIN.FI] Payment Details: {
  from: '0x678170B0f3ad9aa98b000494Af32e4115a0f0f62',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '1990000',
  scheme: 'exact',
  network: 'base'
}
2025-11-12 16:31:36.618 [info] [ONCHAIN.FI] Step 1: Verifying payment...
2025-11-12 16:31:36.618 [info] [ONCHAIN.FI] Request body: {
  "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHgwMDRlOGM4NTVmNTBkYWYyZDNlZTAxZmFhNWVkYjlmMjZiMWIxNmI1ZmI4YTg5YTU4OTVmNTFkYWRlYjFhNmVkMTZkMDc0MTk3OTNiMWZiNWZlODEyNzZiNzA0YjdmMjAzYTg2YjJhOTlkNjNhZDFlYzBlY2UzNDc4YjEzZjk3MTFjIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjE5OTAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc2Mjk2NTk5MSIsIm5vbmNlIjoiMHhlODQxMmVkYWY5YjkwZjJhMjU5YzlmNDVkYjBkMjA0ZmZlMDA4ZTE5YmIyYzA5ZTI5ZTk1OGQ0ZmY0YWQzNTdkIn19fQ==",
  "sourceNetwork": "base",
  "destinationNetwork": "base",
  "expectedAmount": "1.99",
  "expectedToken": "USDC",
  "recipientAddress": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
  "priority": "balanced"
}
2025-11-12 16:31:37.391 [info] [ONCHAIN.FI] Full verify response: {
  "status": "success",
  "data": {
    "valid": true,
    "facilitator": "PayAI",
    "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62"
  }
}
2025-11-12 16:31:37.391 [info] [ONCHAIN.FI] Response status: 200
2025-11-12 16:31:37.391 [info] [ONCHAIN.FI] Response statusText: OK
2025-11-12 16:31:37.391 [info] [ONCHAIN.FI] Verify response summary: { status: 200, valid: true, facilitator: 'PayAI' }
2025-11-12 16:31:37.391 [info] [ONCHAIN.FI] ✅ Payment verified (settlement deferred until simulation passes)
2025-11-12 16:31:37.391 [info] [ONCHAIN.FI] Payment verified successfully (will settle after simulation)
2025-11-12 16:31:37.391 [info] Generating mint signature for: {
  userAddress: '0x678170B0f3ad9aa98b000494Af32e4115a0f0f62',
  fid: '1419696'
}
2025-11-12 16:31:37.463 [info] [VOUCHER TIMING] {
  now: 1762965097,
  deadline: 1762965997,
  secondsUntilExpiry: 900,
  nowISO: '2025-11-12T16:31:37.000Z',
  deadlineISO: '2025-11-12T16:46:37.000Z'
}
2025-11-12 16:31:37.506 [info] [✓ Signature verified] { signer: '0x57cb3F28be790c36C794CA76EA33C9baa207c360' }