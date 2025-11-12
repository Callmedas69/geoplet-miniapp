/**
 * Payment Configuration
 *
 * Centralized x402 payment settings for all payment flows
 * - Mint: $1.99 USDC (onchain NFT minting)
 * - Animation: $4.99 USDC (animation generation)
 */

export const PAYMENT_CONFIG = {
  MINT: {
    price: '1.99',           // Human-readable price
    priceAtomic: '1990000',  // USDC atomic units (6 decimals)
    endpoint: '/api/get-mint-signature',
    label: 'Mint',
    description: 'Mint your unique Geoplet NFT',
  },
  ANIMATION: {
    price: '4.99',
    priceAtomic: '4990000',
    endpoint: '/api/generate-animation',
    label: 'Animation',
    description: 'Generate animated version',
  },
} as const;

// USDC contract address on Base
export const BASE_USDC_ADDRESS = process.env.BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Recipient treasury address
export const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS!;
