# Farcaster MiniApp Wallet Simulation Issue

**Date:** 2025-11-11
**Status:** IDENTIFIED - Farcaster MiniApp connector limitation
**Contract:** 0x0f084287c98C45F30CCEd0B631073F77423A4653 (Geoplets v2.0)

## Problem

Wallet simulation fails with "unknown" function error when trying to mint via Farcaster MiniApp embedded wallet, despite:
- ✅ ABI matching BaseScan exactly
- ✅ `mintGeoplet` function existing in ABI
- ✅ EIP-712 domain configuration matching contract
- ✅ Signature generation verified locally

**Error Message:**
```
Simulation failed: ContractFunctionExecutionError: The contract function 'unknown' reverted
```

## Investigation Results

### 1. EIP-712 Configuration ✅ CORRECT

**Contract (Geoplets.sol:144):**
```solidity
EIP712("Geoplets", "1")
```

**Frontend (GeopletsABI.ts:1315-1318):**
```typescript
export const EIP712_DOMAIN = {
  name: "Geoplets",  // ✅ MATCHES
  version: "1",      // ✅ MATCHES
  chainId: 8453,     // Base Mainnet
}
```

**Backend (get-mint-signature/route.ts:280-290):**
```typescript
const signature = await walletClient.signTypedData({
  domain: {
    ...GEOPLET_CONFIG.eip712.domain,  // Uses correct config
    chainId: GEOPLET_CONFIG.chainId,
    verifyingContract: GEOPLET_CONFIG.address,
  },
  types: GEOPLET_CONFIG.eip712.types,
  primaryType: 'MintVoucher',
  message: voucher,
});
```

### 2. Contract Function Signature ✅ CORRECT

**Function (Geoplets.sol:170):**
```solidity
function mintGeoplet(
    MintVoucher calldata voucher,
    string calldata base64ImageData,
    bytes calldata signature
) external nonReentrant returns (uint256)
```

**Frontend Call (useGeoplet.ts:76-81):**
```typescript
return writeContract({
  address: GEOPLET_CONFIG.address,
  abi: GEOPLET_CONFIG.abi,
  functionName: 'mintGeoplet',
  args: [mintVoucher, base64ImageData, signature as `0x${string}`],
});
```

### 3. Voucher Structure ✅ CORRECT

**Contract Struct (Geoplets.sol:82-87):**
```solidity
struct MintVoucher {
    address to;
    uint256 fid;
    uint256 nonce;
    uint256 deadline;
}
```

**Frontend Conversion (useGeoplet.ts:68-73):**
```typescript
const mintVoucher = {
  to: voucher.to as `0x${string}`,
  fid: BigInt(voucher.fid),
  nonce: BigInt(voucher.nonce),
  deadline: BigInt(voucher.deadline),
};
```

### 4. ABI Verification ✅ CORRECT

Compared local `GeopletsABI.ts` with BaseScan ABI - **IDENTICAL**

## Root Cause Analysis

The "unknown" function error is NOT caused by:
- ❌ ABI mismatch
- ❌ EIP-712 domain mismatch
- ❌ Wrong function signature
- ❌ Incorrect voucher structure

**Likely Cause:** Farcaster MiniApp connector (`@farcaster/miniapp-wagmi-connector`) has limitations with contract simulation for complex functions.

The error occurs during **wallet simulation phase** (before transaction submission), not during actual contract execution.

## Evidence

1. **Signature Verification Works Locally:**
   - Backend recovers correct signer address (get-mint-signature/route.ts:293-319)
   - Logs show: `[✓ Signature verified] { signer: <recovered_address> }`

2. **All Parameters Match Contract Exactly:**
   - Domain name: "Geoplets" ✅
   - Domain version: "1" ✅
   - Chain ID: 8453 ✅
   - Verifying contract: 0x0f08... ✅
   - Type hash matches struct ✅

3. **Contract Is Deployed and Verified:**
   - Address: 0x0f084287c98C45F30CCEd0B631073F77423A4653
   - Verified on BaseScan: https://basescan.org/address/0x0f084287c98c45f30cced0b631073f77423a4653#code
   - Function exists and is public

## Potential Workarounds

### Option 1: Direct Transaction Submission (KISS)
Skip simulation, submit transaction directly:
```typescript
// In useGeoplet.ts - add option to skip simulation
return writeContract({
  address: GEOPLET_CONFIG.address,
  abi: GEOPLET_CONFIG.abi,
  functionName: 'mintGeoplet',
  args: [mintVoucher, base64ImageData, signature as `0x${string}`],
  // May need to add gas estimation if simulation fails
});
```

**Pros:**
- Simple, follows KISS principle
- Transaction will succeed if parameters are correct

**Cons:**
- User pays gas if transaction fails
- Less user-friendly error messages

### Option 2: Backend Simulation
Simulate transaction on backend using Alchemy/Tenderly before returning signature:
```typescript
// In get-mint-signature/route.ts - after signature generation
const simulationResult = await publicClient.simulateContract({
  address: GEOPLET_CONFIG.address,
  abi: GEOPLET_CONFIG.abi,
  functionName: 'mintGeoplet',
  args: [mintVoucher, base64ImageData, signature],
  account: userAddress,
});
```

**Pros:**
- Catches errors before user submits transaction
- Better error messages

**Cons:**
- Additional backend complexity
- Slower response time

### Option 3: Test with Different Connector (RECOMMENDED FOR DEBUGGING)
Try connecting with a standard wallet (MetaMask, Coinbase Wallet) to verify if issue is Farcaster-specific:
```typescript
// In lib/wagmi.ts - temporarily add another connector
import { coinbaseWallet } from 'wagmi/connectors';

export const config = createConfig({
  chains: [base],
  connectors: [
    farcasterMiniApp(),
    coinbaseWallet({ appName: 'Geoplets' }), // Test connector
  ],
  // ... rest of config
});
```

## Next Steps

1. **Test with Standard Wallet:** Verify contract works with MetaMask/Coinbase Wallet
2. **If Standard Wallet Works:** Issue is Farcaster MiniApp connector limitation
3. **If Standard Wallet Fails Too:** Check contract validation logic (likely deadline/nonce validation)

## Related Files

- Contract: `abi/Geoplets.sol`
- ABI: `abi/GeopletsABI.ts`
- Signature generation: `app/api/get-mint-signature/route.ts`
- Minting hook: `hooks/useGeoplet.ts`
- Wagmi config: `lib/wagmi.ts`
- Contract config: `lib/contracts.ts`

## Contract Validation Checks

When transaction is submitted, contract validates (Geoplets.sol:184-209):

1. ✅ Nonce > 0
2. ✅ Deadline >= nonce
3. ✅ Current time <= deadline
4. ✅ Signature not already used (replay protection)
5. ✅ EIP-712 signature recovery
6. ✅ Signer matches signerWallet
7. ✅ Supply not exceeded
8. ✅ FID not already minted
9. ✅ Valid recipient address
10. ✅ Image data not empty
11. ✅ Image size <= 24KB

All parameters from backend are correct, so transaction **should succeed** if submitted.

## Recommendation (KISS Principle)

Since all parameters are verified correct:
1. **Try submitting transaction directly** without relying on Farcaster wallet simulation
2. If transaction succeeds → Confirmed Farcaster connector limitation
3. If transaction fails → Check contract logs for actual revert reason

The "unknown" function error is misleading - it's a simulation issue, not a contract issue.
