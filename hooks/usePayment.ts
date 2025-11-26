/**
 * usePayment Hook - Generic x402 Payment Implementation
 *
 * Supports multiple payment flows:
 * - Mint: $2 USDC → Get Signature → Mint NFT
 * - Regenerate: $3 USDC → Generate Image
 *
 * Manual 402 Payment Flow:
 * 1. Make initial request to backend (no payment header)
 * 2. Receive 402 Payment Required with payment terms
 * 3. Prompt user to authorize USDC payment (EIP-3009 signature)
 * 4. Generate x402 payment header with signature
 * 5. Retry request with X-Payment header
 * 6. Backend verifies payment and returns response
 *
 * Benefits of manual implementation:
 * - Full control over payment header format
 * - Guaranteed compatibility with onchain.fi
 * - Better error handling and debugging
 * - No black box dependencies
 * - KISS principle compliance
 *
 * REFACTOR IMPROVEMENTS:
 * - Configurable for any endpoint/price (mint, regenerate, etc.)
 * - Handles structured error responses with error codes
 * - Better error type detection and handling
 * - Throws AppError with error codes
 * - Maintains backward compatibility with string errors
 */

'use client';

import { useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { generatePaymentHeader } from '@/lib/payment-header';
import type { PaymentRequired402Response } from '@/types/x402';
import {
  isAPIError,
  AppError,
  PaymentErrorCode,
  type APIError,
} from '@/types/errors';
import { ONCHAIN_FI_INTERMEDIATES } from '@/lib/payment-config';

// Use empty string for relative paths in client-side fetch
// This ensures same-origin requests with all headers preserved (including X-Payment)
const API_BASE_URL = '';
const USDC_ADDRESS = process.env.NEXT_PUBLIC_BASE_USDC_ADDRESS as `0x${string}`;
const CHAIN_ID = 8453; // Base Mainnet

/**
 * Payment configuration for different flows
 */
export interface PaymentConfig {
  endpoint: string;        // API endpoint (e.g., '/api/get-mint-signature')
  price: string;          // Human-readable price (e.g., '2.00')
  priceAtomic: string;    // USDC atomic units (e.g., '2000000' for 6 decimals)
  label: string;          // Label for logging (e.g., 'Mint', 'Regenerate')
}

export type PaymentStatus =
  | 'idle'
  | 'fetching_terms'      // Getting 402 response
  | 'awaiting_signature'  // Waiting for user to sign
  | 'processing'          // Generating payment header
  | 'verifying'           // Backend verifying payment
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
  paymentHeader: string; // Added for settlement after simulation
  paymentId: string;     // Required for settlement - from onchain.fi verify response
}

export function usePayment(config: PaymentConfig) {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [status, setStatus] = useState<PaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<MintSignatureResponse | null>(null);
  const [paymentTerms, setPaymentTerms] = useState<PaymentRequired402Response | null>(null);

  /**
   * Request mint signature with manual x402 payment flow
   *
   * Step 1: Make initial request (no payment)
   * Step 2: Receive 402 with payment terms
   * Step 3: User signs EIP-3009 authorization
   * Step 4: Generate payment header
   * Step 5: Retry with X-Payment header
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

      if (!USDC_ADDRESS) {
        throw new Error('USDC address not configured');
      }

      setStatus('fetching_terms');
      setError(null);

      console.log(`[x402 ${config.label}] Step 1: Requesting payment terms...`);

      // Step 1: Make initial request without payment header
      const initialResponse = await fetch(`${API_BASE_URL}${config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: address,
          fid,
        }),
      });

      // Step 2: Expect 402 Payment Required
      if (initialResponse.status !== 402) {
        // If not 402, something is wrong
        const errorData = await initialResponse.json().catch(() => null);

        // Check if error has error code structure
        if (errorData && isAPIError(errorData)) {
          throw AppError.fromAPIError(errorData.error);
        }

        // Fallback to generic error
        const message = errorData?.message || errorData?.error || `Unexpected status: ${initialResponse.status}`;
        throw new AppError(PaymentErrorCode.API_ERROR, message);
      }

      const paymentTermsData = await initialResponse.json() as PaymentRequired402Response;
      setPaymentTerms(paymentTermsData);

      console.log(`[x402 ${config.label}] Step 2: Received 402 Payment Required:`, {
        amount: paymentTermsData.accepts[0]?.maxAmountRequired,
        recipient: paymentTermsData.accepts[0]?.payTo,
        description: paymentTermsData.accepts[0]?.description,
      });

      // Validate payment terms
      if (!paymentTermsData.accepts?.[0]) {
        throw new Error('Invalid payment terms received');
      }

      const terms = paymentTermsData.accepts[0];

      // Step 3: Prompt user to sign (UI will show modal)
      setStatus('awaiting_signature');
      console.log(`[x402 ${config.label}] Step 3: Awaiting user signature for payment authorization...`);

      // Generate payment header with EIP-3009 signature
      // CRITICAL: Sign to onchain.fi intermediate address, NOT final recipient
      // The intermediate handles the transfer and forwards to final recipient
      setStatus('processing');
      console.log(`[x402 ${config.label}] Step 4: Generating payment header...`);
      console.log(`[x402 ${config.label}] Signing to intermediate: ${ONCHAIN_FI_INTERMEDIATES.BASE_TO_BASE}`);
      console.log(`[x402 ${config.label}] Final recipient (from terms): ${terms.payTo}`);

      const paymentHeader = await generatePaymentHeader(walletClient, {
        from: address,
        to: ONCHAIN_FI_INTERMEDIATES.BASE_TO_BASE as `0x${string}`,  // Sign to intermediate, NOT final recipient
        value: config.priceAtomic,
        validAfter: '0',
        usdcAddress: USDC_ADDRESS,
        chainId: CHAIN_ID,
      });

      console.log(`[x402 ${config.label}] Payment header generated, length:`, paymentHeader.length);

      // Step 5: Retry request with X-Payment header
      setStatus('verifying');
      console.log(`[x402 ${config.label}] Step 5: Retrying request with payment header...`);

      const paymentResponse = await fetch(`${API_BASE_URL}${config.endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Payment': paymentHeader,
        },
        body: JSON.stringify({
          userAddress: address,
          fid,
        }),
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json().catch(() => null);

        // Check if error has error code structure
        if (errorData && isAPIError(errorData)) {
          throw AppError.fromAPIError(errorData.error);
        }

        // Fallback to generic error
        const message = errorData?.message || errorData?.error || `HTTP ${paymentResponse.status}`;
        throw new AppError(PaymentErrorCode.PAYMENT_VERIFICATION_FAILED, message);
      }

      const data = await paymentResponse.json();

      if (!data.success || !data.voucher || !data.signature || !data.paymentId) {
        throw new AppError(PaymentErrorCode.API_ERROR, 'Invalid response from server');
      }

      console.log(`[x402 ${config.label}] Payment verified and signature received!`);

      setSignatureData(data);
      setStatus('success');

      return data;
    } catch (err: unknown) {
      console.error(`[x402 ${config.label}] Payment error:`, err);

      // Handle AppError with error codes
      if (err instanceof AppError) {
        setError(err.message);
        setStatus('error');
        throw err; // Re-throw AppError to preserve error code
      }

      // Handle generic errors (wallet rejections, etc.)
      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        // Detect user rejection/cancellation
        if (message.includes('user rejected') || message.includes('user denied') || message.includes('user cancelled')) {
          const appError = new AppError(PaymentErrorCode.USER_REJECTED, 'Payment cancelled by user');
          setError(appError.message);
          setStatus('error');
          throw appError;
        }

        // Generic error
        setError(err.message);
        setStatus('error');
        throw new AppError(PaymentErrorCode.UNKNOWN_ERROR, err.message);
      }

      // Unknown error type
      const unknownError = new AppError(PaymentErrorCode.UNKNOWN_ERROR, 'Payment failed');
      setError(unknownError.message);
      setStatus('error');
      throw unknownError;
    }
  };

  /**
   * Reset payment state
   */
  const reset = () => {
    setStatus('idle');
    setError(null);
    setSignatureData(null);
    setPaymentTerms(null);
  };

  return {
    // State
    status,
    error,
    signatureData,
    paymentTerms,
    isConnected,
    address,
    price: config.price,

    // Actions
    requestMintSignature,
    reset,
  };
}
