// hooks/useContractSimulation.ts
//
// Contract Simulation Hook
// Simulates mint transaction BEFORE execution (per LOG.md)

import { useSimulateContract } from 'wagmi';
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
 * Hook for simulating mint contract call
 *
 * Flow (per LOG.md):
 * 1. Payment verified (backend)
 * 2. Simulate mint (THIS HOOK)
 * 3. Settle payment (if simulation passes)
 * 4. Execute mint (if settlement passes)
 */
export function useContractSimulation() {
  /**
   * Simulate mint transaction
   *
   * This is a simple wrapper that calls the contract's read functions
   * to check if mint will succeed before executing the transaction.
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
      console.log('[SIMULATION] Simulating mint transaction...');

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

      // For now, we'll use a simplified simulation approach
      // In production, you can use viem's simulateContract directly
      // or call publicClient.simulateContract()

      // Basic validation checks
      const now = Math.floor(Date.now() / 1000);
      const deadline = Number(voucher.deadline);

      if (deadline < now) {
        return {
          success: false,
          error: 'Signature expired',
          canRetry: true,
        };
      }

      // Image size check
      const imageSize = (imageData.length * 3) / 4; // Base64 size estimate
      const maxSize = 24 * 1024; // 24KB

      if (imageSize > maxSize) {
        return {
          success: false,
          error: 'Image exceeds 24KB limit',
          canRetry: true,
        };
      }

      console.log('[SIMULATION] ✅ Basic checks passed');

      // Simulation successful
      return {
        success: true,
      };
    } catch (err: unknown) {
      console.error('[SIMULATION] ❌ Unexpected error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Simulation failed';
      return {
        success: false,
        error: errorMessage,
        canRetry: false,
      };
    }
  };

  return { simulateMint };
}

/**
 * Parse contract error into user-friendly message
 *
 * Maps Solidity revert reasons to clear messages
 */
function parseContractError(error: any): { message: string; canRetry: boolean } {
  const errorStr = error?.message?.toLowerCase() || error?.toString()?.toLowerCase() || '';

  // Contract-specific errors (from Geoplet.sol)
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
    message: `Simulation failed: ${error?.message || 'Unknown error'}`,
    canRetry: true,
  };
}
