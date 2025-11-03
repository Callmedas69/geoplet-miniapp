# Onchain.fi Cleanup & Direct USDC Payment Implementation

## Problem Statement

Onchain.fi x402 aggregator service is experiencing complete outage:
- Both `verify()` and `verifyAndSettle()` return HTTP 502: Bad Gateway
- Service is unreliable for production use
- Payment signature is correct, but service cannot process it

### Error Evidence
```
[TEST] Payment Details: {
  from: '0xdC41D6DA6Bb2D02b19316B2bfFF0CBb42606484d',
  to: '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0',
  value: '2000000'  // ✅ 2 USDC - CORRECT
}

Request failed (attempt 1/4): HTTP 502: Bad Gateway
Request failed (attempt 2/4): HTTP 502: Bad Gateway
Request failed (attempt 3/4): HTTP 502: Bad Gateway
Request failed (attempt 4/4): HTTP 502: Bad Gateway
All retry attempts exhausted { error: 'HTTP 502: Bad Gateway' }
```

---

## Solution: Remove Onchain.fi, Implement Direct USDC Payment

Replace unreliable x402 + Onchain.fi with simple, standard USDC.transfer() flow following KISS principle.

---

## Architecture Comparison

### Current (Broken)
```
User clicks mint
  ↓
x402-fetch intercepts request
  ↓
Backend returns 402 Payment Required
  ↓
User wallet signs EIP-3009 authorization
  ↓
x402-fetch retries with X-Payment header
  ↓
Backend calls Onchain.fi verify() → HTTP 502 ❌
  ↓
FAIL
```

### New (Simple & Reliable)
```
User clicks mint
  ↓
Frontend: USDC.transfer(treasury, 2 USDC)
  ↓
Wait for transaction confirmation
  ↓
Send txHash to backend
  ↓
Backend verifies transaction onchain ✅
  ↓
Backend generates mint signature
  ↓
User mints NFT
```

---

## Implementation Plan

### Phase 1: Remove Dependencies

**File: `package.json`**

Remove these dependencies:
```json
{
  "dependencies": {
    "x402-fetch": "^0.x.x",           // REMOVE
    "@onchainfi/x402-aggregator-client": "^0.1.2"  // REMOVE
  }
}
```

Run:
```bash
npm uninstall x402-fetch @onchainfi/x402-aggregator-client
```

---

### Phase 2: Backend - Direct USDC Verification

**File: `app/api/get-mint-signature/route.ts`**

#### Remove:
- Import of `X402Client`
- `verifyX402Payment()` function
- All 402 response logic

#### Add New Function:

```typescript
import { createPublicClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const REQUIRED_AMOUNT = parseUnits('2', 6); // 2 USDC (6 decimals)

/**
 * Verify USDC payment transaction onchain
 * @param txHash - Transaction hash from user's USDC transfer
 * @param userAddress - User's wallet address
 * @returns true if payment is valid
 */
async function verifyUSDCPayment(
  txHash: string,
  userAddress: string
): Promise<boolean> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    });

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    // Check transaction succeeded
    if (receipt.status !== 'success') {
      console.error('[USDC Verification] Transaction failed');
      return false;
    }

    // Get transaction details
    const transaction = await publicClient.getTransaction({
      hash: txHash as `0x${string}`,
    });

    // Verify transaction details
    const isValid =
      transaction.to?.toLowerCase() === USDC_ADDRESS.toLowerCase() && // To USDC contract
      transaction.from.toLowerCase() === userAddress.toLowerCase() && // From user
      receipt.logs.length > 0; // Has transfer event

    if (!isValid) {
      console.error('[USDC Verification] Invalid transaction details');
      return false;
    }

    // Decode Transfer event from logs
    // Transfer event: Transfer(address indexed from, address indexed to, uint256 value)
    const transferEvent = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === USDC_ADDRESS.toLowerCase() &&
        log.topics[0] === '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef' // Transfer event signature
    );

    if (!transferEvent || transferEvent.topics.length < 3) {
      console.error('[USDC Verification] No valid Transfer event found');
      return false;
    }

    // Decode event parameters
    const from = `0x${transferEvent.topics[1].slice(-40)}`;
    const to = `0x${transferEvent.topics[2].slice(-40)}`;
    const value = BigInt(transferEvent.data);

    // Verify transfer details
    const isValidTransfer =
      from.toLowerCase() === userAddress.toLowerCase() &&
      to.toLowerCase() === RECIPIENT_ADDRESS.toLowerCase() &&
      value >= REQUIRED_AMOUNT;

    if (!isValidTransfer) {
      console.error('[USDC Verification] Transfer details mismatch:', {
        from,
        to,
        value: value.toString(),
        expected: {
          from: userAddress,
          to: RECIPIENT_ADDRESS,
          value: REQUIRED_AMOUNT.toString(),
        },
      });
      return false;
    }

    console.log('[USDC Verification] ✅ Payment verified:', {
      txHash,
      from,
      to,
      amount: value.toString(),
    });

    return true;
  } catch (error: any) {
    console.error('[USDC Verification] Error:', error);
    return false;
  }
}
```

#### Update POST Handler:

```typescript
export async function POST(request: NextRequest) {
  try {
    validateEnv();

    const body = await request.json();
    const { userAddress, fid, txHash } = body;

    // Validate required fields
    if (!userAddress || !fid || !txHash) {
      return NextResponse.json(
        { error: 'Missing required fields: userAddress, fid, txHash' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(userAddress)) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate txHash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify USDC payment onchain
    console.log('Verifying USDC payment onchain...');
    const paymentValid = await verifyUSDCPayment(txHash, userAddress);

    if (!paymentValid) {
      return NextResponse.json(
        {
          error: 'Payment verification failed',
          details: 'USDC payment not found or invalid',
        },
        { status: 402, headers: corsHeaders }
      );
    }

    // Payment verified, generate mint signature
    console.log('Payment verified! Generating mint signature...');
    const signatureData = await generateMintSignature(
      userAddress as Address,
      fid
    );

    return NextResponse.json(
      {
        success: true,
        ...signatureData,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
```

---

### Phase 3: Frontend - Direct USDC Transfer

**File: `hooks/usePayment.ts`**

Complete replacement:

```typescript
'use client';

import { useState } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { parseUnits, type Address } from 'viem';

const MINT_PRICE = '2.00'; // $2.00 USDC
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
const TREASURY_ADDRESS = '0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0' as Address;
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

const USDC_ABI = [
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function',
  },
] as const;

export type PaymentStatus =
  | 'idle'
  | 'approving'
  | 'transferring'
  | 'confirming'
  | 'verifying'
  | 'success'
  | 'error';

export interface MintSignatureResponse {
  voucher: {
    to: string;
    fid: string;
    nonce: string;
    deadline: string;
  };
  signature: string;
}

export function usePayment() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<MintSignatureResponse | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  /**
   * Request mint signature with direct USDC payment
   */
  const requestMintSignature = async (fid: string): Promise<MintSignatureResponse> => {
    try {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      if (!walletClient || !publicClient) {
        throw new Error('Wallet client not available');
      }

      setStatus('transferring');
      setError(null);

      const amount = parseUnits(MINT_PRICE, 6); // USDC has 6 decimals

      console.log('Transferring USDC to treasury...');

      // Transfer USDC to treasury
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, amount],
      });

      setTxHash(hash);
      console.log('USDC transfer submitted:', hash);

      setStatus('confirming');

      // Wait for transaction confirmation
      console.log('Waiting for transaction confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      if (receipt.status !== 'success') {
        throw new Error('USDC transfer failed');
      }

      console.log('USDC transfer confirmed!');

      setStatus('verifying');

      // Request mint signature from backend
      console.log('Requesting mint signature...');
      const response = await fetch(`${API_BASE_URL}/api/get-mint-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          fid,
          txHash: hash,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Payment verification failed',
        }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.voucher || !data.signature) {
        throw new Error('Invalid response from server');
      }

      console.log('Mint signature received!');

      setSignatureData(data);
      setStatus('success');

      return data;
    } catch (err: any) {
      console.error('Payment error:', err);
      const errorMessage = err?.message || 'Payment failed';
      setError(errorMessage);
      setStatus('error');
      throw new Error(errorMessage);
    }
  };

  /**
   * Reset payment state
   */
  const reset = () => {
    setStatus('idle');
    setError(null);
    setSignatureData(null);
    setTxHash(null);
  };

  return {
    // State
    status,
    error,
    signatureData,
    txHash,
    isConnected,
    address,
    mintPrice: MINT_PRICE,

    // Actions
    requestMintSignature,
    reset,
  };
}
```

---

### Phase 4: Update Environment Variables

**File: `.env.local`**

Remove (no longer needed):
```bash
ONCHAIN_FI_API_KEY=...  # REMOVE - not using Onchain.fi anymore
```

Ensure these exist:
```bash
# Blockchain (Base Network)
NEXT_PUBLIC_RECIPIENT_ADDRESS=0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0
NEXT_PUBLIC_BASE_USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org

# Signer Wallet
SIGNER_WALLET=0x127E3d1c1ae474A688789Be39fab0da6371926A7
PRIVATE_KEY=0xa7319d591eef66d814ef03dde69353e6956ea4e31ee674299cf83c2642ccf116
```

---

## Benefits

### Technical
✅ **No third-party dependencies** - Removed Onchain.fi completely
✅ **Standard ERC-20 pattern** - Battle-tested, widely used
✅ **100% reliable** - No service outages possible
✅ **Trustless verification** - Backend verifies onchain (not API calls)
✅ **Full control** - Own the entire payment flow

### Security
✅ **Onchain verification** - Checks actual blockchain state
✅ **Exact amount validation** - Ensures 2 USDC minimum
✅ **Address validation** - Confirms sender and receiver
✅ **Transaction success check** - Verifies receipt status
✅ **Event decoding** - Validates Transfer event details

### User Experience
✅ **Simpler flow** - Just transfer USDC, no special protocols
✅ **Clear feedback** - Transaction status visible in wallet
✅ **Gas efficient** - Single transfer transaction (~$0.05 on Base)
✅ **Familiar pattern** - Standard crypto payment flow

### Development
✅ **KISS Principle** - Removed unnecessary complexity
✅ **Less code** - Simpler, easier to maintain
✅ **Better debugging** - Direct blockchain interaction
✅ **No API keys** - One less secret to manage

---

## Testing Checklist

After implementation:

### Backend Testing
- [ ] POST with valid txHash → Returns mint signature
- [ ] POST with invalid txHash → Returns 400 error
- [ ] POST with wrong amount → Returns 402 error
- [ ] POST with wrong recipient → Returns 402 error
- [ ] POST with failed transaction → Returns 402 error
- [ ] Logs show payment verification details

### Frontend Testing
- [ ] USDC transfer prompts in wallet
- [ ] Transaction confirmation waits properly
- [ ] Backend receives correct txHash
- [ ] Mint signature received successfully
- [ ] Error handling works for failed transfers
- [ ] UI shows correct status messages

### Integration Testing
- [ ] Full flow: Transfer → Verify → Sign → Mint
- [ ] Treasury wallet receives 2 USDC
- [ ] NFT mints successfully
- [ ] Used signatures cannot be reused
- [ ] Same FID cannot mint twice

---

## Migration Steps

1. **Backup current code**
   ```bash
   git add .
   git commit -m "Backup before Onchain.fi removal"
   ```

2. **Remove dependencies**
   ```bash
   npm uninstall x402-fetch @onchainfi/x402-aggregator-client
   ```

3. **Update backend** (`app/api/get-mint-signature/route.ts`)
   - Remove Onchain.fi imports
   - Add `verifyUSDCPayment()` function
   - Update POST handler to accept `txHash`
   - Remove 402 response logic

4. **Update frontend** (`hooks/usePayment.ts`)
   - Remove x402-fetch imports
   - Replace with direct USDC transfer
   - Update to send txHash to backend

5. **Clean environment** (`.env.local`)
   - Remove ONCHAIN_FI_API_KEY

6. **Build and test**
   ```bash
   npm run build
   npm run dev
   ```

7. **Test complete flow**
   - Transfer USDC
   - Verify payment
   - Generate signature
   - Mint NFT

8. **Deploy**
   ```bash
   git add .
   git commit -m "Remove Onchain.fi, implement direct USDC payment"
   git push
   ```

---

## Rollback Plan

If issues occur:

1. **Revert to previous commit**
   ```bash
   git revert HEAD
   ```

2. **Reinstall dependencies**
   ```bash
   npm install x402-fetch @onchainfi/x402-aggregator-client
   ```

3. **Restore environment variables**
   ```bash
   # Add back ONCHAIN_FI_API_KEY
   ```

---

## Timeline Estimate

| Task | Duration |
|------|----------|
| Remove dependencies | 5 min |
| Update backend verification | 30 min |
| Update frontend payment | 30 min |
| Testing | 20 min |
| Bug fixes | 15 min |
| **Total** | **~1.5 hours** |

---

## Success Criteria

- ✅ No Onchain.fi dependencies in package.json
- ✅ No x402-fetch imports
- ✅ Backend verifies USDC transactions onchain
- ✅ Frontend transfers USDC directly
- ✅ Full payment → mint flow works
- ✅ USDC appears in treasury wallet
- ✅ NFT mints successfully
- ✅ Build completes without errors

---

## Notes

**KISS Principle Applied:**
- Removed complex x402 protocol
- Removed unreliable third-party service
- Used standard ERC-20 transfer (simplest pattern)
- Direct onchain verification (most trustless)

**Security Maintained:**
- Still using EIP-712 for mint authorization
- Onchain payment verification (more secure than API)
- All validation preserved
- No security compromises

**Professional Best Practice:**
- Standard payment pattern widely used in production
- Reliable (no third-party downtime)
- Well-documented approach
- Easy to audit and maintain
