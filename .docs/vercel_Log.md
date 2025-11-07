2025-11-04 07:25:12.974 [info] [VALIDATION] Starting payment header validation...
2025-11-04 07:25:12.974 [info] [DEBUG] Raw X-Payment header (base64): eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHhlM2UzYjY0YjE5NDEyMGNhY2M4ZTcxZWEyNzFkN2E4NDVmOWM0NjY0YzFiMDMzZGM2ZTVkZmI2NGYwMWNlZjQyMjY3YmQzYmZhNThiNGMyNzNlNGQwYmYzZmYyMTRjZjJjMDNiNThjN2EwMDM3ZDVjNDE1Y2Y2ZGUyNTY1NzM3YjFiIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjIwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc2MjI0MTQwNyIsIm5vbmNlIjoiMHg5N2Y4YTdmOGVjMzFhMTk4ZDA0NDI3ZWE2NTg5MzIxNGI4YTcxNzgwYTZkOGMxMWExNTYwYTYwNDllMzI2Y2NkIn19fQ==
2025-11-04 07:25:12.974 [info] [DEBUG] X-Payment header length: 628 characters
2025-11-04 07:25:12.974 [info] [DEBUG] Full decoded payment header: {
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0xe3e3b64b194120cacc8e71ea271d7a845f9c4664c1b033dc6e5dfb64f01cef42267bd3bfa58b4c273e4d0bf3ff214cf2c03b58c7a0037d5c415cf6de2565737b1b",
    "authorization": {
      "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",
      "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
      "value": "2000000",
      "validAfter": "0",
      "validBefore": "1762241407",
      "nonce": "0x97f8a7f8ec31a198d04427ea65893214b8a71780a6d8c11a1560a6049e326ccd"
    }
  }
}
2025-11-04 07:25:12.982 [info] [VALIDATION] Authorization details: {
  from: '0x678170B0f3ad9aa98b000494Af32e4115a0f0f62',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '2000000',
  validAfter: '0',
  validBefore: '1762241407',
  nonce: '0x97f8a7f8ec31a198d04427ea65893214b8a71780a6d8c11a1560a6049e326ccd'
}
2025-11-04 07:25:12.982 [info] [VALIDATION PASSED] Payment header structure is correct
2025-11-04 07:25:12.982 [info] [ONCHAIN.FI] Verifying and settling x402 payment...
2025-11-04 07:25:12.982 [info] [ONCHAIN.FI] Payment Details: {
  from: '0x678170B0f3ad9aa98b000494Af32e4115a0f0f62',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '2000000',
  scheme: 'exact',
  network: 'base'
}
2025-11-04 07:25:12.982 [info] [ONCHAIN.FI] Verifying and settling x402 payment...