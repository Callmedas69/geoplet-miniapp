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

import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, usePublicClient } from 'wagmi';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import type { MintSignatureResponse } from './usePayment';

export function useGeoplet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
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

    // Estimate gas to bypass Farcaster wallet simulation issues
    // (Farcaster wallet fails simulation on base64-encoded tokenURI)
    let estimatedGas: bigint;
    try {
      if (publicClient) {
        estimatedGas = await publicClient.estimateContractGas({
          address: GEOPLET_CONFIG.address,
          abi: GEOPLET_CONFIG.abi,
          functionName: 'mintGeoplet',
          args: [mintVoucher, base64ImageData, signature as `0x${string}`],
          account: address,
        });

        // Add 20% buffer for safety
        estimatedGas = (estimatedGas * BigInt(120)) / BigInt(100);

        console.log('[MINT] Gas estimated:', estimatedGas.toString());
      } else {
        // Fallback: Use reasonable gas limit for mint operation
        estimatedGas = BigInt(500000);
        console.log('[MINT] Using fallback gas limit:', estimatedGas.toString());
      }
    } catch (error) {
      // If gas estimation fails, use safe fallback
      estimatedGas = BigInt(500000);
      console.warn('[MINT] Gas estimation failed, using fallback:', error);
    }

    // Call mintGeoplet with manual gas limit (bypasses wallet simulation)
    return writeContract({
      address: GEOPLET_CONFIG.address,
      abi: GEOPLET_CONFIG.abi,
      functionName: 'mintGeoplet',
      args: [mintVoucher, base64ImageData, signature as `0x${string}`],
      gas: estimatedGas,
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
