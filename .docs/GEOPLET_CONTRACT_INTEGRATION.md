# Geoplet Contract Frontend Integration Plan

## Analysis Summary

### Contract Deployed:
- **Address**: `0x88b7d5be70650dc0db9bbf7f69c06ecbd6cc5e0c` (Base Network)
- **ABI**: Available at `abi/GeopletABI.ts`
- **Environment**: Already configured in `.env.local`

### Key Contract Functions Identified:
1. **mintGeoplet(address to, uint256 warpletTokenId, string base64ImageData)** - Mint NFT
2. **withdraw(uint256 tokenId, address erc20Token)** - User claims ERC20
3. **getTokenBalance(uint256 tokenId, address erc20Token)** - Check claimable balance
4. **withdrawalsEnabled()** - Check if withdrawals are enabled
5. **batchDepositToTokens()** - Admin deposits (different amounts)
6. **batchDepositEqual()** - Admin deposits (equal amounts)
7. **setWithdrawalsEnabled(bool)** - Admin enables/disables withdrawals

---

## Integration Plan (3 Phases)

### **Phase 1: Core NFT Minting** (Priority 1)

#### Files to Create:

1. **`hooks/useGeoplet.ts`** - Contract interaction hook
   ```typescript
   - Function: mintNFT(warpletTokenId, base64Data)
   - Function: checkIfMinted(warpletTokenId)
   - Function: getUserGeoplets(address)
   - Uses: GeopletABI, wagmi hooks
   ```

2. **`app/api/mint-geoplet/route.ts`** - Backend mint endpoint
   ```typescript
   - Verify USDC payment (from usePayment)
   - Call contract.mintGeoplet()
   - Return transaction hash + success
   ```

#### Files to Modify:

3. **`components/ImageGenerator.tsx`**
   - Add "Mint Geoplet" button after image generation
   - Integrate payment flow: pay → mint → success
   - Show minting status (pending, success, error)
   - Display OpenSea link after mint

4. **`.env.local`**
   - Add: `NEXT_PUBLIC_GEOPLET_ADDRESS=0x88b7d5be70650dc0db9bbf7f69c06ecbd6cc5e0c`
   - Add: `MINT_PRICE=0.50`

---

### **Phase 2: User Withdrawal System** (Priority 2)

#### Files to Create:

5. **`hooks/useGeopletBalance.ts`** - Check ERC20 balances
   ```typescript
   - Function: getBalance(tokenId, erc20Address)
   - Function: withdraw(tokenId, erc20Address)
   - Function: checkIfClaimed(tokenId, erc20Address)
   - Function: isWithdrawalsEnabled()
   ```

6. **`components/WithdrawButton.tsx`** - Withdrawal UI component
   ```typescript
   - Display claimable balance
   - "Withdraw" button with haptic feedback
   - Loading states
   - Success/error toasts
   ```

7. **`app/withdraw/page.tsx`** - Dedicated withdrawal page (optional)
   ```typescript
   - List all user's Geoplet NFTs
   - Show claimable balances per NFT
   - Withdraw button for each
   ```

#### Files to Modify:

8. **`components/ImageGenerator.tsx`** OR **`app/page.tsx`**
   - Add `<WithdrawButton />` component
   - Show after NFT is minted
   - Display: "You have X USDC claimable"

---

### **Phase 3: Admin Panel** (Priority 3)

#### Files to Create:

9. **`app/admin/deposit/page.tsx`** - Admin deposit panel
   ```typescript
   - CSV upload component
   - Preview deposits before submitting
   - Approve USDC → Batch deposit
   - Enable/disable withdrawals toggle
   - Uses: papaparse for CSV, GeopletABI
   ```

10. **`hooks/useGeopletAdmin.ts`** - Admin operations hook
    ```typescript
    - Function: batchDeposit(tokenIds, amounts, tokenAddress)
    - Function: toggleWithdrawals(enabled)
    - Function: checkWithdrawalsStatus()
    ```

11. **`lib/csv-parser.ts`** - CSV parsing utility
    ```typescript
    - Parse CSV: tokenId, amount
    - Validate data format
    - Calculate totals
    ```

---

## Detailed Implementation Steps

### Step 1: Setup Environment
```bash
# .env.local (update with new variables)
NEXT_PUBLIC_GEOPLET_ADDRESS=0x88b7d5be70650dc0db9bbf7f69c06ecbd6cc5e0c
MINT_PRICE=0.50
```

### Step 2: Create Mint Hook
**`hooks/useGeoplet.ts`**
```typescript
'use client';

import { useState } from 'react';
import { useWriteContract, useReadContract, useAccount } from 'wagmi';
import { GeopletABI } from '@/abi/GeopletABI';
import { base } from 'wagmi/chains';

const GEOPLET_ADDRESS = process.env.NEXT_PUBLIC_GEOPLET_ADDRESS as `0x${string}`;

export function useGeoplet() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [isMinting, setIsMinting] = useState(false);

  /**
   * Mint Geoplet NFT
   */
  const mintNFT = async (
    to: `0x${string}`,
    warpletTokenId: number,
    base64ImageData: string
  ) => {
    try {
      setIsMinting(true);

      const hash = await writeContractAsync({
        address: GEOPLET_ADDRESS,
        abi: GeopletABI,
        functionName: 'mintGeoplet',
        args: [to, BigInt(warpletTokenId), base64ImageData],
        chainId: base.id,
      });

      return hash;
    } catch (error) {
      console.error('Mint error:', error);
      throw error;
    } finally {
      setIsMinting(false);
    }
  };

  /**
   * Check if Warplet has been minted as Geoplet
   */
  const { data: isMinted } = useReadContract({
    address: GEOPLET_ADDRESS,
    abi: GeopletABI,
    functionName: 'warpletMinted',
    args: address ? [BigInt(0)] : undefined, // Replace with actual warplet ID
    chainId: base.id,
  });

  /**
   * Get user's Geoplet balance
   */
  const { data: balance } = useReadContract({
    address: GEOPLET_ADDRESS,
    abi: GeopletABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: base.id,
  });

  return {
    mintNFT,
    isMinting,
    isMinted: !!isMinted,
    balance: balance ? Number(balance) : 0,
  };
}
```

### Step 3: Create Mint API Endpoint
**`app/api/mint-geoplet/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { GeopletABI } from '@/abi/GeopletABI';

const GEOPLET_ADDRESS = process.env.NEXT_PUBLIC_GEOPLET_ADDRESS as `0x${string}`;
const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}`;

export async function POST(request: NextRequest) {
  try {
    const { warpletTokenId, base64ImageData, userAddress, paymentHash } = await request.json();

    // Validation
    if (!warpletTokenId || !base64ImageData || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Verify payment was successful
    // Check that paymentHash is valid USDC transfer

    // Setup wallet client
    const account = privateKeyToAccount(PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    // Call contract to mint
    const hash = await walletClient.writeContract({
      address: GEOPLET_ADDRESS,
      abi: GeopletABI,
      functionName: 'mintGeoplet',
      args: [userAddress as `0x${string}`, BigInt(warpletTokenId), base64ImageData],
    });

    // Wait for transaction
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error: any) {
    console.error('Mint API error:', error);
    return NextResponse.json(
      { error: error.message || 'Minting failed' },
      { status: 500 }
    );
  }
}
```

### Step 4: Update ImageGenerator
**Modify `components/ImageGenerator.tsx`** (add after line 273):
```tsx
import { useGeoplet } from '@/hooks/useGeoplet';
import { usePayment } from '@/hooks/usePayment';

// Inside component:
const { mintNFT, isMinting } = useGeoplet();
const { pay, status: paymentStatus } = usePayment();
const [mintedTokenId, setMintedTokenId] = useState<number | null>(null);

const handleMint = async () => {
  if (!generatedImage || !nft) return;

  try {
    haptics.tap();

    // Step 1: Pay $0.50 USDC
    toast.info('Processing payment...');
    const paymentHash = await pay('0.50');

    // Step 2: Call backend to mint
    toast.info('Minting Geoplet NFT...');
    const response = await fetch('/api/mint-geoplet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        warpletTokenId: nft.tokenId,
        base64ImageData: generatedImage.imageData,
        userAddress: address,
        paymentHash,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    haptics.success();
    toast.success('Geoplet minted! 🎉');
    setMintedTokenId(result.tokenId);

    // Open OpenSea
    window.open(
      `https://opensea.io/assets/base/${GEOPLET_ADDRESS}/${result.tokenId}`,
      '_blank'
    );
  } catch (error: any) {
    haptics.error();
    toast.error(error.message || 'Minting failed');
  }
};

// Add mint button after download/share buttons:
{generatedImage && !mintedTokenId && (
  <Button
    onClick={handleMint}
    disabled={isMinting || paymentStatus !== 'idle'}
    className="w-full mt-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold touch-target"
    size="lg"
  >
    {isMinting ? 'Minting...' : '💎 Mint Geoplet NFT ($0.50)'}
  </Button>
)}

{mintedTokenId && (
  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
    <p className="text-green-400 font-semibold">✅ Minted as Geoplet #{mintedTokenId}</p>
  </div>
)}
```

### Step 5: Create Balance Hook
**`hooks/useGeopletBalance.ts`**
```typescript
'use client';

import { useReadContract, useWriteContract } from 'wagmi';
import { GeopletABI } from '@/abi/GeopletABI';
import { base } from 'wagmi/chains';
import { formatUnits } from 'viem';

const GEOPLET_ADDRESS = process.env.NEXT_PUBLIC_GEOPLET_ADDRESS as `0x${string}`;
const USDC_ADDRESS = process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS as `0x${string}`;

export function useGeopletBalance(tokenId: number) {
  const { writeContractAsync } = useWriteContract();

  /**
   * Get claimable balance for NFT
   */
  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: GEOPLET_ADDRESS,
    abi: GeopletABI,
    functionName: 'getTokenBalance',
    args: [BigInt(tokenId), USDC_ADDRESS],
    chainId: base.id,
  });

  /**
   * Check if withdrawals are enabled
   */
  const { data: withdrawalsEnabled } = useReadContract({
    address: GEOPLET_ADDRESS,
    abi: GeopletABI,
    functionName: 'withdrawalsEnabled',
    chainId: base.id,
  });

  /**
   * Check if already claimed
   */
  const { data: hasClaimed } = useReadContract({
    address: GEOPLET_ADDRESS,
    abi: GeopletABI,
    functionName: 'hasClaimed',
    args: [BigInt(tokenId), USDC_ADDRESS],
    chainId: base.id,
  });

  /**
   * Withdraw tokens
   */
  const withdraw = async () => {
    try {
      const hash = await writeContractAsync({
        address: GEOPLET_ADDRESS,
        abi: GeopletABI,
        functionName: 'withdraw',
        args: [BigInt(tokenId), USDC_ADDRESS],
        chainId: base.id,
      });

      await refetchBalance();
      return hash;
    } catch (error) {
      console.error('Withdraw error:', error);
      throw error;
    }
  };

  return {
    balance: balance ? formatUnits(balance, 6) : '0', // USDC has 6 decimals
    balanceRaw: balance,
    withdrawalsEnabled: !!withdrawalsEnabled,
    hasClaimed: !!hasClaimed,
    canWithdraw: !!withdrawalsEnabled && !hasClaimed && balance && balance > 0n,
    withdraw,
    refetch: refetchBalance,
  };
}
```

### Step 6: Create Withdraw Component
**`components/WithdrawButton.tsx`**
```tsx
'use client';

import { useState } from 'react';
import { useGeopletBalance } from '@/hooks/useGeopletBalance';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { haptics } from '@/lib/haptics';

interface WithdrawButtonProps {
  tokenId: number;
}

export function WithdrawButton({ tokenId }: WithdrawButtonProps) {
  const { balance, canWithdraw, withdrawalsEnabled, hasClaimed, withdraw } =
    useGeopletBalance(tokenId);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = async () => {
    try {
      haptics.tap();
      setIsWithdrawing(true);

      toast.info('Withdrawing tokens...');
      const hash = await withdraw();

      haptics.success();
      toast.success(`Withdrawn ${balance} USDC!`);
      console.log('Transaction:', hash);
    } catch (error: any) {
      haptics.error();
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setIsWithdrawing(false);
    }
  };

  // No balance to claim
  if (!balance || parseFloat(balance) === 0) {
    return null;
  }

  // Already claimed
  if (hasClaimed) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4 text-center text-gray-400">
          ✅ Already claimed {balance} USDC
        </CardContent>
      </Card>
    );
  }

  // Withdrawals disabled
  if (!withdrawalsEnabled) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-4 text-center">
          <p className="text-yellow-400 mb-2">💰 {balance} USDC Available</p>
          <p className="text-sm text-gray-400">
            Withdrawals will be enabled soon by the admin
          </p>
        </CardContent>
      </Card>
    );
  }

  // Can withdraw
  return (
    <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
      <CardContent className="p-4">
        <div className="text-center mb-3">
          <p className="text-2xl font-bold text-green-400">{balance} USDC</p>
          <p className="text-sm text-gray-300">Available to withdraw</p>
        </div>
        <Button
          onClick={handleWithdraw}
          disabled={!canWithdraw || isWithdrawing}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold touch-target"
          size="lg"
        >
          {isWithdrawing ? 'Withdrawing...' : '💸 Withdraw to Wallet'}
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Step 7: Create Admin Panel
**`app/admin/deposit/page.tsx`**
```tsx
'use client';

import { useState } from 'react';
import { useWriteContract, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { GeopletABI } from '@/abi/GeopletABI';
import { base } from 'wagmi/chains';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const GEOPLET_ADDRESS = process.env.NEXT_PUBLIC_GEOPLET_ADDRESS as `0x${string}`;

const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

export default function AdminDepositPage() {
  const [deposits, setDeposits] = useState<Array<{ tokenId: number; amount: string }>>([]);
  const { writeContractAsync } = useWriteContract();

  // Check withdrawal status
  const { data: withdrawalsEnabled } = useReadContract({
    address: GEOPLET_ADDRESS,
    abi: GeopletABI,
    functionName: 'withdrawalsEnabled',
    chainId: base.id,
  });

  // Handle CSV upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        const data = results.data as Array<{ tokenId: string; amount: string }>;
        setDeposits(
          data
            .filter((row) => row.tokenId && row.amount)
            .map((row) => ({
              tokenId: parseInt(row.tokenId),
              amount: row.amount,
            }))
        );
        toast.success(`Loaded ${data.length} deposits`);
      },
    });
  };

  // Batch deposit
  const handleBatchDeposit = async () => {
    try {
      const tokenIds = deposits.map((d) => BigInt(d.tokenId));
      const amounts = deposits.map((d) => parseUnits(d.amount, 6)); // USDC = 6 decimals

      const totalAmount = amounts.reduce((a, b) => a + b, 0n);

      // 1. Approve USDC
      toast.info('Approving USDC...');
      await writeContractAsync({
        address: USDC_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [GEOPLET_ADDRESS, totalAmount],
        chainId: base.id,
      });

      // 2. Batch deposit
      toast.info('Depositing to NFTs...');
      await writeContractAsync({
        address: GEOPLET_ADDRESS,
        abi: GeopletABI,
        functionName: 'batchDepositToTokens',
        args: [tokenIds, USDC_ADDRESS as `0x${string}`, amounts],
        chainId: base.id,
      });

      toast.success(`Deposited to ${deposits.length} NFTs!`);
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || 'Deposit failed');
    }
  };

  // Toggle withdrawals
  const handleToggleWithdrawals = async () => {
    try {
      await writeContractAsync({
        address: GEOPLET_ADDRESS,
        abi: GeopletABI,
        functionName: 'setWithdrawalsEnabled',
        args: [!withdrawalsEnabled],
        chainId: base.id,
      });

      toast.success(`Withdrawals ${!withdrawalsEnabled ? 'enabled' : 'disabled'}`);
    } catch (error: any) {
      toast.error(error.message || 'Toggle failed');
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Geoplet Admin - Token Deposits</h1>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Upload Deposits</CardTitle>
        </CardHeader>
        <CardContent>
          <Input type="file" accept=".csv" onChange={handleFileUpload} className="mb-4" />

          {deposits.length > 0 && (
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-semibold mb-2">Preview:</p>
              <div className="max-h-40 overflow-y-auto text-sm">
                {deposits.slice(0, 5).map((d, i) => (
                  <div key={i}>
                    Token #{d.tokenId}: {d.amount} USDC
                  </div>
                ))}
                {deposits.length > 5 && <div>... and {deposits.length - 5} more</div>}
              </div>
              <p className="mt-2 font-semibold">
                Total: {deposits.reduce((sum, d) => sum + parseFloat(d.amount), 0)} USDC
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleBatchDeposit}
            disabled={deposits.length === 0}
            className="w-full"
            size="lg"
          >
            Deposit to {deposits.length} NFTs
          </Button>

          <div className="border-t pt-4">
            <p className="mb-2">
              Withdrawals: {withdrawalsEnabled ? '🟢 Enabled' : '🔴 Disabled'}
            </p>
            <Button
              onClick={handleToggleWithdrawals}
              variant={withdrawalsEnabled ? 'destructive' : 'default'}
              className="w-full"
            >
              {withdrawalsEnabled ? 'Disable Withdrawals' : 'Enable Withdrawals'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Dependencies to Install

```bash
npm install papaparse
npm install @types/papaparse --save-dev
```

---

## User Flows

### Flow 1: Mint Geoplet
```
1. User generates art (FREE) ✅ (already working)
2. User clicks "Mint Geoplet" ($0.50)
3. System calls usePayment.pay('0.50')
4. Payment succeeds → Call /api/mint-geoplet
5. Backend calls contract.mintGeoplet(to, warpletId, base64)
6. Show success + OpenSea link
```

### Flow 2: Withdraw Tokens
```
1. User views their Geoplet NFT
2. System shows claimable balance (e.g., "100 USDC")
3. User clicks "Withdraw"
4. System calls contract.withdraw(tokenId, USDC)
5. Tokens transferred to user wallet
6. Show success toast
```

### Flow 3: Admin Deposits
```
1. Admin prepares CSV (tokenId, amount)
2. Admin uploads CSV to admin panel
3. System previews deposits
4. Admin approves USDC (total amount)
5. Admin clicks "Batch Deposit"
6. System calls contract.batchDepositToTokens()
7. All NFTs credited
8. Admin enables withdrawals
```

---

## CSV Format for Admin

**deposits.csv:**
```csv
tokenId,amount
1,100
2,100
3,150
4,100
5,200
```

**Notes:**
- Amount in USDC (will be converted to 6 decimals)
- One row per NFT token ID
- Can have different amounts per NFT

---

## Environment Variables

**Update `.env.local`:**
```bash
# Geoplet Contract (Base Network)
NEXT_PUBLIC_GEOPLET_ADDRESS=0x88b7d5be70650dc0db9bbf7f69c06ecbd6cc5e0c

# Mint pricing
MINT_PRICE=0.50

# Deployer private key (for backend minting - KEEP SECURE!)
DEPLOYER_PRIVATE_KEY=0x...
```

---

## Testing Checklist

**Phase 1: Minting**
- [ ] Generate image works
- [ ] Mint button appears after generation
- [ ] Payment flow ($0.50 USDC) works
- [ ] Backend mints NFT successfully
- [ ] Transaction shows on BaseScan
- [ ] NFT appears on OpenSea
- [ ] Error handling (insufficient funds, failed tx)

**Phase 2: Withdrawals**
- [ ] Balance displays correctly
- [ ] Withdraw button shows when balance > 0
- [ ] Withdraw transfers tokens to wallet
- [ ] Cannot withdraw when disabled
- [ ] Cannot withdraw twice (hasClaimed check)
- [ ] Balance updates after withdrawal
- [ ] Shows "already claimed" message

**Phase 3: Admin**
- [ ] CSV upload works
- [ ] Preview shows correct data
- [ ] Total calculation accurate
- [ ] USDC approval succeeds
- [ ] Batch deposit successful
- [ ] Enable/disable toggle works
- [ ] Withdrawals status updates

---

## Security Considerations (KISS + CLAUDE.md Compliance)

### ✅ What We're Doing Right:
- Using battle-tested OpenZeppelin contracts
- Read-only hooks for balance checks
- Proper error handling with try-catch
- TypeScript for type safety
- Environment variables for sensitive data

### ⚠️ Additional Safeguards:
- Add confirmation dialog before minting ($0.50 charge)
- Show gas estimate before transactions
- Add transaction pending states
- Validate base64 size (prevent huge gas costs)
- Rate limit API endpoints
- Secure DEPLOYER_PRIVATE_KEY (use secrets manager)

---

## File Structure Summary

```
geoplet/
├── .env.local                      ✏️ Add GEOPLET_ADDRESS, MINT_PRICE
├── abi/
│   └── GeopletABI.ts              ✅ Already exists
├── app/
│   ├── admin/
│   │   └── deposit/
│   │       └── page.tsx           🆕 Admin deposit panel
│   └── api/
│       └── mint-geoplet/
│           └── route.ts           🆕 Mint endpoint
├── components/
│   ├── ImageGenerator.tsx         ✏️ Add mint button
│   └── WithdrawButton.tsx         🆕 Withdrawal UI
└── hooks/
    ├── useGeoplet.ts              🆕 NFT contract hook
    ├── useGeopletBalance.ts       🆕 Balance/withdraw hook
    └── usePayment.ts              ✅ Already exists
```

**Legend:** ✅ Exists | 🆕 Create | ✏️ Modify

---

## Recommended Implementation Order

### Day 1-2: Minting (Phase 1)
1. Create `hooks/useGeoplet.ts`
2. Create `app/api/mint-geoplet/route.ts`
3. Update `components/ImageGenerator.tsx` with mint button
4. Test end-to-end mint flow
5. Verify on BaseScan and OpenSea

### Day 3: Withdrawals (Phase 2)
1. Create `hooks/useGeopletBalance.ts`
2. Create `components/WithdrawButton.tsx`
3. Add to main page or ImageGenerator
4. Test withdrawal flow
5. Test edge cases (disabled, claimed, no balance)

### Day 4-5: Admin (Phase 3)
1. Install papaparse dependency
2. Create `app/admin/deposit/page.tsx`
3. Test CSV upload
4. Test batch deposits
5. Test enable/disable withdrawals
6. Create sample CSV files

### Day 6: Testing & Polish
1. End-to-end testing all flows
2. Error handling improvements
3. Loading states polish
4. Mobile responsiveness check
5. Gas optimization review

---

## KISS Principle Compliance ✅

- ✅ Simple hooks (one purpose each)
- ✅ Reuse existing payment flow
- ✅ Standard wagmi patterns
- ✅ No over-engineering
- ✅ Clear separation of concerns
- ✅ TypeScript for safety
- ✅ Minimal dependencies (only papaparse)
- ✅ No custom state management (use wagmi's built-in)
- ✅ Professional error handling
- ✅ Mobile-first UI (existing patterns)

**Ready to implement! 🚀**
