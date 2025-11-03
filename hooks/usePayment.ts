//hooks/usePayment.ts

/**
 * usePayment Hook - x402 Payment with Pay-First Flow
 *
 * Flow: Pay $2 USDC → Get Signature → Generate Image → Mint
 *
 * Uses x402-fetch to automatically handle payment prompts:
 * 1. Makes request to backend
 * 2. Backend returns 402 Payment Required
 * 3. x402-fetch intercepts and prompts wallet
 * 4. User approves USDC payment in wallet
 * 5. Request retries with X-Payment header
 * 6. Backend verifies payment and returns mint signature
 */

'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { wrapFetchWithPayment } from 'x402-fetch';

const MINT_PRICE = '2.00'; // $2.00 USDC
const API_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || '';

export type PaymentStatus = 'idle' | 'processing' | 'verifying' | 'success' | 'error';

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
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<MintSignatureResponse | null>(null);

  /**
   * Request mint signature with x402 payment
   *
   * This function uses x402-fetch which automatically:
   * 1. Sends request to backend
   * 2. Detects 402 response
   * 3. Prompts user's wallet to sign USDC payment
   * 4. Retries request with payment header
   *
   * @param fid - Farcaster ID
   * @returns Mint signature and voucher data
   */
  const requestMintSignature = async (fid: string): Promise<MintSignatureResponse> => {
    try {
      if (!isConnected || !address) {
        throw new Error('Wallet not connected');
      }

      if (!walletClient?.account) {
        throw new Error('Wallet client not available');
      }

      setStatus('processing');
      setError(null);

      // Wrap fetch with x402 payment handling
      // x402-fetch expects either a WalletClient or LocalAccount
      // wagmi's walletClient is compatible with x402's EvmSigner type
      // Set maxValue to 2.00 USDC (2,000,000 atomic units with 6 decimals)
      const maxPaymentAmount = BigInt(2 * 10 ** 6); // 2.00 USDC
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fetchWithPayment = wrapFetchWithPayment(fetch, walletClient as any, maxPaymentAmount);

      console.log('Requesting mint signature with x402 payment...');

      // This will automatically handle the payment flow:
      // 1. Send request
      // 2. Get 402 response
      // 3. Prompt wallet for $2 USDC payment
      // 4. Retry with X-Payment header
      // 5. Return mint signature
      const response = await fetchWithPayment(`${API_BASE_URL}/api/get-mint-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          fid,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: 'Payment verification failed'
        }));
        throw new Error(errorData.message || errorData.error || `HTTP ${response.status}`);
      }

      setStatus('verifying');

      const data = await response.json();

      if (!data.success || !data.voucher || !data.signature) {
        throw new Error('Invalid response from server');
      }

      console.log('Payment verified and signature received!');

      setSignatureData(data);
      setStatus('success');

      return data;
    } catch (err: unknown) {
      console.error('Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
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
  };

  return {
    // State
    status,
    error,
    signatureData,
    isConnected,
    address,
    mintPrice: MINT_PRICE,

    // Actions
    requestMintSignature,
    reset,
  };
}
