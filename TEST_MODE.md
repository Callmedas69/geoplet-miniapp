# Test Mode Documentation

## Overview

TEST_MODE allows you to test the Geoplet minting flow without relying on Onchain.fi's x402 payment verification service. This is essential for development and testing when external services are unavailable.

## Environment Variables

Add these variables to your `.env.local`:

```bash
# TEST MODE (set to 'true' to bypass Onchain.fi and use mock payment verification)
TEST_MODE=true
TEST_MODE_AUTO_APPROVE=true
```

### Configuration Options

- **`TEST_MODE`**: Enable/disable test mode
  - `true`: Use mock payment verification (bypasses Onchain.fi)
  - `false`: Use real Onchain.fi verification (production mode)
  - Default: `false`

- **`TEST_MODE_AUTO_APPROVE`**: Auto-approve payments in test mode
  - `true`: Automatically approve all payments (skip validation checks)
  - `false`: Perform validation checks (network, scheme, amount, recipient)
  - Default: `false`

## How It Works

### Production Mode (`TEST_MODE=false`)

```
User Request → Frontend x402-fetch → Onchain.fi Verification → Backend Signature → Mint NFT
```

The payment flow:
1. Frontend uses x402-fetch to handle 402 payment required response
2. User's wallet signs EIP-3009 authorization (gasless USDC transfer)
3. x402-fetch sends signed authorization in X-Payment header
4. Backend calls Onchain.fi to verify payment signature
5. Onchain.fi returns verification result
6. Backend generates EIP-712 mint signature
7. Frontend calls smart contract to mint NFT

### Test Mode (`TEST_MODE=true`)

```
User Request → Frontend x402-fetch → Mock Verification → Backend Signature → Mint NFT
```

The payment flow:
1. Frontend uses x402-fetch (same as production)
2. User's wallet signs EIP-3009 authorization
3. x402-fetch sends signed authorization in X-Payment header
4. **Backend uses mock verifier instead of Onchain.fi**
5. Mock verifier decodes and validates payment header
6. Backend generates EIP-712 mint signature
7. Frontend calls smart contract to mint NFT

## Mock Verification Logic

The mock verifier (`verifyX402PaymentMock`) performs these checks:

### Auto-Approve Mode (`TEST_MODE_AUTO_APPROVE=true`)
- ✅ All payments automatically approved
- 🔍 Still logs payment details for debugging
- 🎯 Use this for quick testing

### Validation Mode (`TEST_MODE_AUTO_APPROVE=false`)
Checks performed:
- ✅ Has payload
- ✅ Has authorization object
- ✅ Has signature
- ✅ Network is 'base'
- ✅ Scheme is 'exact'
- ✅ Amount is 2000000 (2.00 USDC in atomic units)
- ✅ Recipient matches `RECIPIENT_ADDRESS`

All checks must pass for approval.

## Console Output

### Test Mode Indicators

When TEST_MODE is enabled, you'll see these console logs:

```
🧪 [TEST MODE] Using mock payment verification
🧪 [TEST MODE] Mock payment verification (Onchain.fi bypassed)
🧪 [TEST MODE] Mock Payment Details: { from, to, value, scheme, network }
🧪 [TEST MODE] Mock Verification Checks: { hasPayload, hasAuthorization, ... }
🧪 [TEST MODE] ✅ Payment AUTO-APPROVED (TEST_MODE_AUTO_APPROVE=true)
```

or

```
🧪 [TEST MODE] ✅ Payment APPROVED (all checks passed)
🧪 [TEST MODE] ❌ Payment REJECTED (checks failed)
```

### Production Mode Indicators

```
🔒 [PRODUCTION] Using Onchain.fi payment verification
[TEST] Payment Details: { from, to, value, scheme, network }
[TEST] Verify result: { valid, facilitator, from, to, amount, token, txHash }
```

## Testing Workflow

### 1. Enable Test Mode

```bash
# .env.local
TEST_MODE=true
TEST_MODE_AUTO_APPROVE=true
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Test Minting Flow

1. Open the app in your browser
2. Connect your wallet
3. Enter your Farcaster ID (FID)
4. Click "Generate Image"
5. Click "Mint NFT"
6. Your wallet will prompt for EIP-3009 signature
7. Sign the authorization (no gas required)
8. Backend will use mock verification
9. Backend generates mint signature
10. Frontend calls smart contract to mint
11. NFT minted successfully!

### 4. Check Console Logs

Watch the server console for test mode indicators:

```
🧪 [TEST MODE] Using mock payment verification
🧪 [TEST MODE] Mock Payment Details: {
  from: '0x...',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '2000000',
  scheme: 'exact',
  network: 'base'
}
🧪 [TEST MODE] ✅ Payment AUTO-APPROVED
```

## Switching Between Modes

### Enable Test Mode
```bash
TEST_MODE=true
```

### Disable Test Mode (Production)
```bash
TEST_MODE=false
```

**Important**: Always verify `TEST_MODE=false` before deploying to production!

## Implementation Details

### Code Architecture

```typescript
// Payment verifier selector (route.ts:167)
async function getPaymentVerifier(paymentHeader: string): Promise<boolean> {
  const isTestMode = process.env.TEST_MODE === 'true';

  if (isTestMode) {
    return verifyX402PaymentMock(paymentHeader);
  } else {
    return verifyX402Payment(paymentHeader);
  }
}
```

### Mock Verifier (route.ts:48)
```typescript
async function verifyX402PaymentMock(paymentHeader: string): Promise<boolean> {
  // Decode payment header
  const decoded = JSON.parse(Buffer.from(paymentHeader, 'base64').toString());

  // Perform validation checks
  const checks = {
    hasPayload: !!decoded.payload,
    hasAuthorization: !!decoded.payload?.authorization,
    hasSignature: !!decoded.payload?.signature,
    isBaseNetwork: decoded.network === 'base',
    isCorrectScheme: decoded.scheme === 'exact',
    hasValidAmount: decoded.payload?.authorization?.value === '2000000',
    hasValidRecipient: decoded.payload?.authorization?.to?.toLowerCase() === RECIPIENT_ADDRESS.toLowerCase(),
  };

  // Auto-approve or validate
  if (TEST_MODE_AUTO_APPROVE) return true;
  return Object.values(checks).every(check => check === true);
}
```

### Real Verifier (route.ts:109)
```typescript
async function verifyX402Payment(paymentHeader: string): Promise<boolean> {
  const client = new X402Client({
    apiKey: process.env.ONCHAIN_FI_API_KEY!,
  });

  const result = await client.verify({
    paymentHeader,
    network: 'base',
    expectedAmount: MINT_PRICE,
    expectedToken: 'USDC',
    recipientAddress: RECIPIENT_ADDRESS,
  });

  return result.valid;
}
```

## Security Considerations

### Test Mode Safety

✅ **Safe to use**:
- Local development
- Testing frontend flow
- Debugging payment integration
- Onchain.fi service outages

❌ **Never use in production**:
- Deployed environments
- Public-facing apps
- Real money transfers
- Production minting

### Production Checklist

Before deploying to production:

- [ ] Verify `TEST_MODE=false` in production `.env`
- [ ] Verify `ONCHAIN_FI_API_KEY` is set
- [ ] Test real payment flow on testnet
- [ ] Confirm USDC transfers to treasury
- [ ] Review console logs (no 🧪 test mode indicators)

## Troubleshooting

### Issue: Payments auto-approve without validation

**Solution**: Set `TEST_MODE_AUTO_APPROVE=false`

### Issue: Payments rejected with valid data

**Solution**: Check console logs for which validation check failed:
```
🧪 [TEST MODE] Mock Verification Checks: {
  hasPayload: true,
  hasAuthorization: true,
  hasSignature: true,
  isBaseNetwork: true,
  isCorrectScheme: true,
  hasValidAmount: false,  // ❌ This check failed
  hasValidRecipient: true
}
```

### Issue: Still seeing Onchain.fi errors

**Solution**: Verify `TEST_MODE=true` is in `.env.local` and restart dev server

### Issue: Test mode not activating

**Solution**:
1. Check `.env.local` has `TEST_MODE=true`
2. Restart dev server (`npm run dev`)
3. Check console for mode indicator on first request

## Related Documentation

- [ONCHAINFI_CLEANUP.md](./ONCHAINFI_CLEANUP.md) - Plan for removing Onchain.fi completely
- [.docs/402_FIX_IMPLEMENTATION.md](./.docs/402_FIX_IMPLEMENTATION.md) - Original x402 implementation plan
- [.docs/GPT.md](./.docs/GPT.md) - Digest-based replay protection architecture

## Future Improvements

When Onchain.fi is removed completely (per ONCHAINFI_CLEANUP.md):

1. Remove x402-fetch dependency
2. Remove Onchain.fi SDK
3. Implement direct USDC.transfer() on frontend
4. Add onchain transaction verification in backend
5. Remove TEST_MODE (no longer needed)

This will simplify the architecture and eliminate external service dependencies.
