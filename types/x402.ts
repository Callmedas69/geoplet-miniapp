/**
 * x402 Payment Protocol Types
 *
 * Based on onchain.fi specification from .docs/log.md
 * Implements EIP-3009 transferWithAuthorization for USDC payments
 */

import { Address } from 'viem';

/**
 * x402 Payment Header Structure (Root Level)
 * This is the exact format required by onchain.fi
 */
export interface X402PaymentHeader {
  x402Version: 1;
  scheme: 'exact';
  network: 'base';
  payload: {
    signature: `0x${string}`;
    authorization: X402Authorization;
  };
}

/**
 * EIP-3009 Authorization Data
 * Used in transferWithAuthorization for USDC payments
 */
export interface X402Authorization {
  from: Address;           // Payer's wallet address
  to: Address;             // Recipient/treasury address
  value: string;           // Amount in atomic units (e.g., "2000000" for 2 USDC)
  validAfter: string;      // Unix timestamp or "0"
  validBefore: string;     // Unix timestamp (expiration)
  nonce: `0x${string}`;    // 32-byte random hex string
}

/**
 * EIP-712 Domain for USDC on Base
 */
export interface USDCDomain {
  name: string;              // "USD Coin"
  version: string;           // "2"
  chainId: number;           // 8453 for Base
  verifyingContract: Address; // USDC contract address
}

/**
 * 402 Payment Required Response
 * Returned by backend when X-Payment header is missing
 */
export interface PaymentRequired402Response {
  x402Version: 1;
  accepts: Array<{
    scheme: 'exact';
    network: 'base';
    maxAmountRequired: string;
    asset: Address;
    payTo: Address;
    resource: string;
    description: string;
    mimeType: string;
    maxTimeoutSeconds: number;
    extra?: {
      name?: string;
      version?: string;
    };
  }>;
  error: string;
}

/**
 * Payment Header Generation Options
 */
export interface GeneratePaymentHeaderOptions {
  from: Address;
  to: Address;
  value: string;
  validAfter?: string;
  validBefore?: number; // Unix timestamp, defaults to 5 min from now
  nonce?: `0x${string}`; // Optional: 32-byte hex nonce (generated if not provided)
  usdcAddress: Address;
  chainId: number;
}

/**
 * Validation error details
 */
export interface PaymentHeaderValidationError {
  field: string;
  message: string;
}

/**
 * Validate payment header structure
 * Returns true if valid, throws error with details if invalid
 */
export function validatePaymentHeader(decoded: unknown): decoded is X402PaymentHeader {
  if (!decoded || typeof decoded !== 'object') {
    throw new Error('Payment header must be an object');
  }

  const header = decoded as Partial<X402PaymentHeader>;
  const errors: PaymentHeaderValidationError[] = [];

  // Validate root-level fields
  if (header.x402Version !== 1) {
    errors.push({ field: 'x402Version', message: 'Must be 1' });
  }

  if (header.scheme !== 'exact') {
    errors.push({ field: 'scheme', message: 'Must be "exact"' });
  }

  if (header.network !== 'base') {
    errors.push({ field: 'network', message: 'Must be "base"' });
  }

  // Validate payload
  if (!header.payload) {
    errors.push({ field: 'payload', message: 'Missing payload object' });
  } else {
    if (!header.payload.signature || !header.payload.signature.startsWith('0x')) {
      errors.push({ field: 'payload.signature', message: 'Must be hex string with 0x prefix' });
    }

    if (!header.payload.authorization) {
      errors.push({ field: 'payload.authorization', message: 'Missing authorization object' });
    } else {
      const auth = header.payload.authorization;

      if (!auth.from || !/^0x[a-fA-F0-9]{40}$/.test(auth.from)) {
        errors.push({ field: 'payload.authorization.from', message: 'Invalid address format' });
      }

      if (!auth.to || !/^0x[a-fA-F0-9]{40}$/.test(auth.to)) {
        errors.push({ field: 'payload.authorization.to', message: 'Invalid address format' });
      }

      if (!auth.value || !/^\d+$/.test(auth.value)) {
        errors.push({ field: 'payload.authorization.value', message: 'Must be numeric string' });
      }

      if (!auth.validAfter) {
        errors.push({ field: 'payload.authorization.validAfter', message: 'Required field' });
      }

      if (!auth.validBefore) {
        errors.push({ field: 'payload.authorization.validBefore', message: 'Required field' });
      }

      if (!auth.nonce || !/^0x[a-fA-F0-9]{64}$/.test(auth.nonce)) {
        errors.push({ field: 'payload.authorization.nonce', message: 'Must be 32-byte hex string' });
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Payment header validation failed:\n${errors.map((e) => `  - ${e.field}: ${e.message}`).join('\n')}`
    );
  }

  return true;
}
