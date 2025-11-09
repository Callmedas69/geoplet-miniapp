2025-11-09 02:13:33.917 [info] [ENV] ✅ All required environment variables present
2025-11-09 02:13:33.917 [info] [VALIDATION] Starting payment header validation...
2025-11-09 02:13:33.917 [info] [DEBUG] Raw X-Payment header (base64): eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHhkNGY1NTFhZGJmOWIzZmZkNjU0OWI5MmIwM2ZjOGJjYjhjYjA5ZTY5MDlmNDI2NTU5MGIyNDZmNGE2NDQxZWM2NTAwZGY1YmI1YmUzYWFiNDMzMmIxNjk1ZTY1YjE2ZjBiYzEzZjMzYjdkYjkwYTVjYTk1NmJlNWZjYjU4YmEyODFjIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHhkYzQxZDZEQTZCYjJEMDJiMTkzMTZCMmJmRkYwQ0JiNDI2MDY0ODRkIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjEwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTc2MjY1NTAwOSIsIm5vbmNlIjoiMHgwYjg3YTg3NTE0YzYwYzIzMzJkMDgxMjJiZTFiZTkwMzM5NzAwZmE4NjRlMjRiMDI4NjVlMTU1MGNjZDAwMjM5In19fQ==
2025-11-09 02:13:33.917 [info] [DEBUG] X-Payment header length: 628 characters
2025-11-09 02:13:33.917 [info] [DEBUG] Full decoded payment header: {
  "x402Version": 1,
  "scheme": "exact",
  "network": "base",
  "payload": {
    "signature": "0xd4f551adbf9b3ffd6549b92b03fc8bcb8cb09e6909f4265590b246f4a6441ec6500df5bb5be3aab4332b1695e65b16f0bc13f33b7db90a5ca956be5fcb58ba281c",
    "authorization": {
      "from": "0xdc41d6DA6Bb2D02b19316B2bfFF0CBb42606484d",
      "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",
      "value": "1000000",
      "validAfter": "0",
      "validBefore": "1762655009",
      "nonce": "0x0b87a87514c60c2332d08122be1be90339700fa864e24b02865e1550ccd00239"
    }
  }
}
2025-11-09 02:13:33.917 [info] [VALIDATION] Authorization details: {
  from: '0xdc41d6DA6Bb2D02b19316B2bfFF0CBb42606484d',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '1000000',
  validAfter: '0',
  validBefore: '1762655009',
  nonce: '0x0b87a87514c60c2332d08122be1be90339700fa864e24b02865e1550ccd00239'
}
2025-11-09 02:13:33.917 [error] [VALIDATION FAILED] Payment header errors: [ 'Invalid payment value (expected 2000000, got 1000000)' ]