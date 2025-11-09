/**
 * Payment Header Generator
 *
 * Implements EIP-3009 transferWithAuthorization for USDC payments
 * Generates x402 payment headers compatible with onchain.fi
 *
 * Reference: .docs/log.md, .docs/HEADER_FORMAT.md
 * Specification: https://eips.ethereum.org/EIPS/eip-3009
 */

import { type Address, type WalletClient, encodePacked, keccak256 } from 'viem';
import type {
  X402PaymentHeader,
  X402Authorization,
  GeneratePaymentHeaderOptions,
} from '@/types/x402';

/**
 * EIP-3009 Type Hash
 * TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)
 */
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
  '0x7c7c6cdb67a18743f49ec6fa9b35f50d52ed05cbed4cc592e13b44501c1a2267';

/**
 * Generate a random 32-byte nonce for EIP-3009
 */
export function generateNonce(): `0x${string}` {
  // Use crypto.getRandomValues for secure random bytes
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  // Convert to hex string
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return `0x${hex}`;
}

/**
 * Generate EIP-3009 signature for USDC transferWithAuthorization
 *
 * This creates the signature that authorizes USDC transfer from user to treasury
 * The signature is later verified on-chain by the USDC contract
 *
 * @param walletClient - viem WalletClient for signing
 * @param options - Payment parameters (including nonce)
 * @returns EIP-712 signature
 */
export async function generateEIP3009Signature(
  walletClient: WalletClient,
  options: GeneratePaymentHeaderOptions
): Promise<`0x${string}`> {
  const { from, to, value, validAfter = '0', validBefore, nonce, usdcAddress, chainId } = options;

  // Calculate validBefore if not provided (15 minutes from now - matches mint signature expiry)
  const validBeforeTimestamp = validBefore || Math.floor(Date.now() / 1000) + 900;

  // Nonce must be provided by caller to ensure consistency
  if (!nonce) {
    throw new Error('Nonce is required for EIP-3009 signature generation');
  }

  // EIP-712 Domain for USDC on Base
  const domain = {
    name: 'USD Coin',
    version: '2',
    chainId,
    verifyingContract: usdcAddress,
  } as const;

  // EIP-712 Types for transferWithAuthorization
  const types = {
    TransferWithAuthorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  } as const;

  // Message data
  const message = {
    from,
    to,
    value: BigInt(value),
    validAfter: BigInt(validAfter),
    validBefore: BigInt(validBeforeTimestamp),
    nonce,
  };

  // Sign EIP-712 typed data
  const signature = await walletClient.signTypedData({
    account: from,
    domain,
    types,
    primaryType: 'TransferWithAuthorization',
    message,
  });

  console.log('[EIP-3009] Generated signature:', {
    from,
    to,
    value,
    validAfter,
    validBefore: validBeforeTimestamp,
    nonce,
    signature,
  });

  return signature;
}

/**
 * Generate complete x402 payment header
 *
 * This creates the base64-encoded JSON structure required by onchain.fi
 * Format matches specification in .docs/log.md:4
 *
 * IMPORTANT: Generates nonce ONCE and uses it for both signature and authorization
 * to ensure they match (fixes critical bug where different nonces were used)
 *
 * @param walletClient - viem WalletClient for signing
 * @param options - Payment parameters
 * @returns Base64-encoded payment header
 */
export async function generatePaymentHeader(
  walletClient: WalletClient,
  options: GeneratePaymentHeaderOptions
): Promise<string> {
  const { from, to, value, validAfter = '0', validBefore, usdcAddress, chainId } = options;

  // Calculate validBefore if not provided (15 minutes from now - matches mint signature expiry)
  const validBeforeTimestamp = validBefore || Math.floor(Date.now() / 1000) + 900;

  // Generate nonce ONCE - this will be used for both signature and authorization
  const nonce = options.nonce || generateNonce();

  // Generate EIP-3009 signature with the SAME nonce
  const signature = await generateEIP3009Signature(walletClient, {
    from,
    to,
    value,
    validAfter,
    validBefore: validBeforeTimestamp,
    nonce,  // ← Pass the nonce to ensure signature and authorization match
    usdcAddress,
    chainId,
  });

  // Build authorization object
  const authorization: X402Authorization = {
    from,
    to,
    value,
    validAfter,
    validBefore: validBeforeTimestamp.toString(),
    nonce,
  };

  // Build complete payment header (EXACT format from log.md)
  const paymentHeader: X402PaymentHeader = {
    x402Version: 1,
    scheme: 'exact',
    network: 'base',
    payload: {
      signature,
      authorization,
    },
  };

  // Encode as base64
  const jsonString = JSON.stringify(paymentHeader);
  const base64Header = Buffer.from(jsonString).toString('base64');

  console.log('[x402] Payment header generated:', {
    authorization,
    signatureLength: signature.length,
    base64Length: base64Header.length,
  });

  // Debug: Decode and log to verify structure
  if (process.env.NODE_ENV === 'development') {
    const decoded = JSON.parse(Buffer.from(base64Header, 'base64').toString());
    console.log('[x402] Decoded header (verification):', JSON.stringify(decoded, null, 2));
  }

  return base64Header;
}

/**
 * Decode payment header for debugging
 */
export function decodePaymentHeader(base64Header: string): X402PaymentHeader {
  try {
    const jsonString = Buffer.from(base64Header, 'base64').toString();
    return JSON.parse(jsonString) as X402PaymentHeader;
  } catch (error) {
    throw new Error(`Failed to decode payment header: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
