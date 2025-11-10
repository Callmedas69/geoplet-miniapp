// hooks/useContractSimulation.ts
//
// Contract Simulation Hook
// Simulates mint transaction BEFORE payment (TRUE blockchain simulation)

import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { GEOPLET_CONFIG } from '@/lib/contracts';

/**
 * Mint voucher structure (must match backend)
 */
interface MintVoucher {
  to: string;
  fid: string;
  nonce: string;
  deadline: string;
}

/**
 * Simulation result
 */
interface SimulationResult {
  success: boolean;
  error?: string;
  canRetry?: boolean;
}

/**
 * Hook for TRUE contract simulation using viem
 *
 * NEW Flow:
 * 1. Simulate mint (THIS HOOK) ← BEFORE payment
 * 2. Payment verification (only if simulation passes)
 * 3. Payment settlement
 * 4. Execute mint
 */
export function useContractSimulation() {
  /**
   * Pre-flight eligibility check BEFORE payment
   *
   * Checks basic eligibility without needing a signature:
   * - FID not already minted
   * - Contract not paused
   * - Image size within limits
   *
   * This runs BEFORE payment to avoid charging users for guaranteed failures.
   *
   * @param fid - Farcaster ID
   * @param imageData - Base64 image data
   * @returns Simulation result
   */
  const checkEligibility = async (
    fid: string,
    imageData: string
  ): Promise<SimulationResult> => {
    try {
      console.log('[PRE-FLIGHT] Checking eligibility before payment...');

      // Create public client for Base network
      const publicClient = createPublicClient({
        chain: base,
        transport: http(GEOPLET_CONFIG.rpc.alchemy),
      });

      // Check 1: FID already minted?
      const isMinted = await publicClient.readContract({
        address: GEOPLET_CONFIG.address,
        abi: GEOPLET_CONFIG.abi,
        functionName: 'isFidMinted',
        args: [BigInt(fid)],
      });

      if (isMinted) {
        return {
          success: false,
          error: 'This Farcaster ID has already minted a Geoplet',
          canRetry: false,
        };
      }

      console.log('[PRE-FLIGHT] ✅ FID not yet minted');

      // Check 2: Minting paused?
      const isPaused = await publicClient.readContract({
        address: GEOPLET_CONFIG.address,
        abi: GEOPLET_CONFIG.abi,
        functionName: 'mintingPaused',
      });

      if (isPaused) {
        return {
          success: false,
          error: 'Minting is temporarily paused. Please try again later.',
          canRetry: true,
        };
      }

      console.log('[PRE-FLIGHT] ✅ Minting not paused');

      // Check 3: Image size within limits
      const imageSize = (imageData.length * 3) / 4; // Base64 size estimate
      const maxSize = 24 * 1024; // 24KB

      if (imageSize > maxSize) {
        return {
          success: false,
          error: 'Image exceeds 24KB limit. Please regenerate to get a smaller image.',
          canRetry: true,
        };
      }

      console.log('[PRE-FLIGHT] ✅ Image size valid');

      console.log('[PRE-FLIGHT] ✅ All eligibility checks passed');

      return {
        success: true,
      };
    } catch (err: unknown) {
      console.error('[PRE-FLIGHT] ❌ Eligibility check failed:', err);

      const errorMessage = err instanceof Error ? err.message : 'Eligibility check failed';

      return {
        success: false,
        error: `Unable to verify eligibility: ${errorMessage}`,
        canRetry: true,
      };
    }
  };

  /**
   * Simulate mint transaction using viem's simulateContract
   *
   * This performs TRUE blockchain simulation by calling eth_call
   * to check if the mint will succeed after payment verification.
   *
   * Checks performed by blockchain:
   * - Valid signature (EIP-712)
   * - Deadline not expired
   * - All Solidity require() statements
   *
   * @param voucher - Mint voucher from backend
   * @param imageData - Base64 image data
   * @param signature - EIP-712 signature
   * @returns Simulation result
   */
  const simulateMint = async (
    voucher: MintVoucher,
    imageData: string,
    signature: string
  ): Promise<SimulationResult> => {
    try {
      console.log('[SIMULATION] Starting TRUE contract simulation...');

      // Prepare contract arguments (convert strings to BigInt for contract)
      const mintVoucher = {
        to: voucher.to as `0x${string}`,
        fid: BigInt(voucher.fid),
        nonce: BigInt(voucher.nonce),
        deadline: BigInt(voucher.deadline),
      };

      console.log('[SIMULATION] Voucher:', {
        to: voucher.to,
        fid: voucher.fid,
        nonce: voucher.nonce,
        deadline: voucher.deadline,
      });

      // Create public client for Base network
      const publicClient = createPublicClient({
        chain: base,
        transport: http(GEOPLET_CONFIG.rpc.alchemy),
      });

      // Simulate the mintGeoplet transaction
      await publicClient.simulateContract({
        address: GEOPLET_CONFIG.address,
        abi: GEOPLET_CONFIG.abi,
        functionName: 'mintGeoplet',
        args: [mintVoucher, imageData, signature as `0x${string}`],
        account: voucher.to as `0x${string}`,
      });

      console.log('[SIMULATION] ✅ Contract simulation passed');
      console.log('[SIMULATION] Voucher verified:', {
        to: voucher.to,
        fid: voucher.fid,
        deadline: voucher.deadline,
        timeUntilExpiry: Number(voucher.deadline) - Math.floor(Date.now() / 1000),
      });

      // Simulation successful
      return {
        success: true,
      };
    } catch (err: unknown) {
      console.error('[SIMULATION] ❌ Simulation failed:', err);

      // Enhanced error logging for debugging
      console.error('[SIMULATION] Voucher details:', {
        to: voucher.to,
        fid: voucher.fid,
        nonce: voucher.nonce,
        deadline: voucher.deadline,
        deadlineDate: new Date(Number(voucher.deadline) * 1000).toISOString(),
        currentTime: Math.floor(Date.now() / 1000),
        timeUntilExpiry: Number(voucher.deadline) - Math.floor(Date.now() / 1000),
      });

      // Parse error and return user-friendly message
      const parsed = parseContractError(err);

      return {
        success: false,
        error: parsed.message,
        canRetry: parsed.canRetry,
      };
    }
  };

  return { checkEligibility, simulateMint };
}

/**
 * Parse contract error into user-friendly message
 *
 * Maps Solidity revert reasons to clear messages
 */
function parseContractError(error: unknown): { message: string; canRetry: boolean } {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStr = errorMessage.toLowerCase();

  // Contract-specific errors (from Geoplets.sol)
  if (errorStr.includes('minting paused')) {
    return {
      message: 'Minting is temporarily paused. Please try again later.',
      canRetry: true,
    };
  }

  if (errorStr.includes('signature expired')) {
    return {
      message: 'Payment signature expired. Please try minting again.',
      canRetry: true,
    };
  }

  if (errorStr.includes('deadline too long')) {
    return {
      message: 'Signature deadline invalid. Please refresh and try again.',
      canRetry: true,
    };
  }

  if (errorStr.includes('caller mismatch') || errorStr.includes('not the caller')) {
    return {
      message: 'Wallet mismatch. Please use the wallet that requested the signature.',
      canRetry: false,
    };
  }

  if (errorStr.includes('signature already used')) {
    return {
      message: 'This signature has already been used. Please request a new one.',
      canRetry: true,
    };
  }

  if (errorStr.includes('invalid signature')) {
    return {
      message: 'Invalid signature. Please try minting again.',
      canRetry: true,
    };
  }

  if (errorStr.includes('max supply reached')) {
    return {
      message: 'All Geoplets have been minted! Collection is sold out.',
      canRetry: false,
    };
  }

  if (errorStr.includes('fid already minted')) {
    return {
      message: 'This Farcaster ID has already minted a Geoplet.',
      canRetry: false,
    };
  }

  if (errorStr.includes('invalid recipient')) {
    return {
      message: 'Invalid recipient address. Please reconnect your wallet.',
      canRetry: true,
    };
  }

  if (errorStr.includes('empty image data')) {
    return {
      message: 'Image data is missing. Please regenerate and try again.',
      canRetry: true,
    };
  }

  if (errorStr.includes('image too large')) {
    return {
      message: 'Image exceeds 24KB limit. Please regenerate to get a smaller image.',
      canRetry: true,
    };
  }

  // Network/RPC errors
  if (errorStr.includes('insufficient funds')) {
    return {
      message: 'Insufficient ETH for gas fees. Please add some ETH to your wallet.',
      canRetry: true,
    };
  }

  if (errorStr.includes('network') || errorStr.includes('rpc')) {
    return {
      message: 'Network connection issue. Please check your connection and try again.',
      canRetry: true,
    };
  }

  // Generic error
  return {
    message: `Simulation failed: ${errorMessage}`,
    canRetry: true,
  };
}
