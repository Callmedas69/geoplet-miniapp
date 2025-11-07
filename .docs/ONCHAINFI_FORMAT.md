Payment Header Format - Example
Your payment header needs to be base64-encoded JSON in this exact structure:
1. The JSON Structure (before base64 encoding):
{  "x402Version": 1,  "scheme": "exact",  "network": "base",  "payload": {    "signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",    "authorization": {      "from": "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",      "to": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",      "value": "2000000",      "validAfter": "0",      "validBefore": "1730736609",      "nonce": "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"    }  }}
2. Then base64 encode it:
const paymentPayload = {  x402Version: 1,  scheme: "exact",  network: "base",  payload: {    signature: "0x...",  // EIP-712 signature    authorization: {      from: "0x678170B0f3ad9aa98b000494Af32e4115a0f0f62",      to: "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0",      value: "2000000",  // 2 USDC in atomic units (6 decimals)      validAfter: "0",      validBefore: "1730736609",  // Unix timestamp      nonce: "0xabc..."  // 32-byte random nonce    }  }};const paymentHeader = btoa(JSON.stringify(paymentPayload));
3. Example of final base64-encoded header:
eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHgxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjIwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTczMDczNjYwOSIsIm5vbmNlIjoiMHhhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwIn19fQ==
🔍 How to Check Their Payment Header
Ask them to run this in their code and send you the output:
// Decode to see what's insidetry {  const decoded = Buffer.from(paymentHeader, 'base64').toString();  console.log('📋 Decoded payload:', JSON.parse(decoded));} catch (error) {  console.error('❌ Invalid payment header:', error.message);}
⚠️ Common Mistakes
Sending the signature directly instead of the full JSON structure
Forgetting to base64 encode the JSON
Double encoding (encoding twice)
Missing required fields like x402Version, scheme, or network
Wrong value format - must be atomic units (USDC has 6 decimals, so $2.00 = "2000000")
✅ Valid Example Request
curl -X POST https://api.onchain.fi/v1/verify \  -H 'X-API-Key: onchain_8545d9f230ea9b7a5e53c3f36b249d339d84e332012a16feae0bb8ce0c768f03' \  -H 'Content-Type: application/json' \  -d '{    "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYmFzZSIsInBheWxvYWQiOnsic2lnbmF0dXJlIjoiMHgxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyIiwiYXV0aG9yaXphdGlvbiI6eyJmcm9tIjoiMHg2NzgxNzBCMGYzYWQ5YWE5OGIwMDA0OTRBZjMyZTQxMTVhMGYwZjYyIiwidG8iOiIweEZkRjUzRGUyMGY0NmJBRTJGYTY0MTRlNkYyNUVGMTY1NEU2OEFjZDAiLCJ2YWx1ZSI6IjIwMDAwMDAiLCJ2YWxpZEFmdGVyIjoiMCIsInZhbGlkQmVmb3JlIjoiMTczMDczNjYwOSIsIm5vbmNlIjoiMHhhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZjEyMzQ1Njc4OTBhYmNkZWYxMjM0NTY3ODkwIn19fQ==",    "network": "base",    "expectedAmount": "2.00",    "expectedToken": "USDC",    "recipientAddress": "0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0"  }'
Send this to your friend and ask them to:
Show you their actual payment header (the base64 string)
Show you the decoded version (so you can verify the structure)
Confirm they're using https://api.onchain.fi/v1 not staging