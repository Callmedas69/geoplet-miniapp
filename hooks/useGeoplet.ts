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

    // Debug logging: Full signature data structure
    console.log('[MINT-DEBUG] ===== SIGNATURE DATA RECEIVED =====');
    console.log('[MINT-DEBUG] Full signatureData object:', JSON.stringify(signatureData, null, 2));
    console.log('[MINT-DEBUG] Has paymentHeader:', 'paymentHeader' in signatureData);
    console.log('[MINT-DEBUG] Voucher extracted:', voucher);
    console.log('[MINT-DEBUG] Signature extracted:', signature);

    // Convert voucher strings to proper types
    const mintVoucher = {
      to: voucher.to as `0x${string}`,
      fid: BigInt(voucher.fid),
      nonce: BigInt(voucher.nonce),
      deadline: BigInt(voucher.deadline),
    };

    // Debug logging: Converted values
    console.log('[MINT-DEBUG] ===== MINT VOUCHER CONSTRUCTED =====');
    console.log('[MINT-DEBUG] MintVoucher:', {
      to: mintVoucher.to,
      fid: mintVoucher.fid.toString(),
      nonce: mintVoucher.nonce.toString(),
      deadline: mintVoucher.deadline.toString(),
    });
    console.log('[MINT-DEBUG] Signature (first 66 chars):', signature.substring(0, 66));
    console.log('[MINT-DEBUG] Image data length:', base64ImageData.length, 'chars');
    console.log('[MINT-DEBUG] Image data preview (first 100 chars):', base64ImageData.substring(0, 100));

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

    // Debug logging: Final contract call parameters
    console.log('[MINT-DEBUG] ===== CALLING WALLET (writeContract) =====');
    console.log('[MINT-DEBUG] Contract address:', GEOPLET_CONFIG.address);
    console.log('[MINT-DEBUG] Function name:', 'mintGeoplet');
    console.log('[MINT-DEBUG] Gas limit:', estimatedGas.toString());
    console.log('[MINT-DEBUG] Args:', [
      {
        to: mintVoucher.to,
        fid: mintVoucher.fid.toString(),
        nonce: mintVoucher.nonce.toString(),
        deadline: mintVoucher.deadline.toString(),
      },
      `${base64ImageData.substring(0, 50)}... (${base64ImageData.length} chars)`,
      signature.substring(0, 66),
    ]);

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
