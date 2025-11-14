/**
 * Central Contract Configuration
 *
 * Single source of truth for all contract-related configuration.
 * Imports directly from ABI to ensure type safety and consistency.
 *
 * KISS Principle: One place to manage all contract config.
 * Security: Type-safe addresses and EIP-712 config from ABI.
 */

import {
  GeopletsABI,
  getGeopletAddress,
  EIP712_DOMAIN,
  EIP712_TYPES,
  type MintVoucher
} from '@/abi/GeopletsABI';
import { base } from 'viem/chains';

// Base Mainnet Configuration
const CHAIN_ID = 8453; // Base Mainnet

export const GEOPLET_CONFIG = {
  // Network Configuration
  chainId: CHAIN_ID,
  chain: base,

  // Contract Configuration (from ABI)
  address: getGeopletAddress(CHAIN_ID),
  abi: GeopletsABI,

  // EIP-712 Configuration (from ABI)
  eip712: {
    domain: {
      ...EIP712_DOMAIN,
      verifyingContract: getGeopletAddress(CHAIN_ID),
    },
    types: EIP712_TYPES,
  },

  // Explorer URLs (Base Mainnet)
  explorers: {
    basescan: 'https://basescan.org',
    opensea: 'https://opensea.io/assets/base',
  },

  // RPC Configuration
  rpc: {
    base: 'https://mainnet.base.org', // Base official RPC (primary - used by wagmi)
    alchemy: `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`, // Alchemy (NFT metadata only)
  },
} as const;

// Re-export types for convenience
export type { MintVoucher };
