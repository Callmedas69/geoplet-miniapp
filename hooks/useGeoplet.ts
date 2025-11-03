/**
 * useGeoplet Hook - EIP-712 Signature-Based Minting
 *
 * This hook handles minting Geoplet NFTs using the new v2.0 contract
 * with EIP-712 signature verification.
 *
 * Breaking Changes from v1.0:
 * - Old: mintGeoplet(address to, uint256 fid, string base64ImageData)
 * - New: mintGeoplet(MintVoucher voucher, string base64ImageData, bytes signature)
 *
 * Flow:
 * 1. User pays via x402 → backend verifies payment
 * 2. Backend generates EIP-712 signed voucher
 * 3. Frontend calls mintGeoplet with voucher + signature
 */

'use client';

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import type { MintSignatureResponse } from './usePayment';

export function useGeoplet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const {
    writeContract,
    data: hash,
    isPending,
    error: writeError
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Mint NFT with EIP-712 signature
   *
   * @param signatureData - Voucher and signature from payment verification
   * @param base64ImageData - Base64-encoded image data
   * @returns Transaction hash
   */
  const mintNFT = async (
    signatureData: MintSignatureResponse,
    base64ImageData: string
  ) => {
    if (!address) {
      throw new Error('Wallet not connected');
    }

    // Validate chain
    if (chainId !== GEOPLET_CONFIG.chainId) {
      throw new Error('Please switch to Base Mainnet to mint');
    }

    // Validate signature data
    if (!signatureData || !signatureData.voucher || !signatureData.signature) {
      throw new Error('Invalid signature data');
    }

    const { voucher, signature } = signatureData;

    // Convert voucher strings to proper types
    const mintVoucher = {
      to: voucher.to as `0x${string}`,
      fid: BigInt(voucher.fid),
      nonce: BigInt(voucher.nonce),
      deadline: BigInt(voucher.deadline),
    };

    // Call new mintGeoplet function with voucher + signature
    return writeContract({
      address: GEOPLET_CONFIG.address,
      abi: GEOPLET_CONFIG.abi,
      functionName: 'mintGeoplet',
      args: [mintVoucher, base64ImageData, signature as `0x${string}`],
    });
  };

  return {
    mintNFT,
    isLoading: isPending || isConfirming,
    isSuccess,
    error: writeError,
    txHash: hash,
  };
}
