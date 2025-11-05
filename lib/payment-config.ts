/**
 * Payment Configuration
 *
 * Centralized x402 payment settings for all payment flows
 * - Mint: $2 USDC (onchain NFT minting)
 * - Regenerate: $3 USDC (AI image generation)
 */

export const PAYMENT_CONFIG = {
  MINT: {
    price: '2.00',           // Human-readable price
    priceAtomic: '2000000',  // USDC atomic units (6 decimals)
    endpoint: '/api/get-mint-signature',
    label: 'Mint',
    description: 'Mint your unique Geoplet NFT',
  },
  REGENERATE: {
    price: '3.00',
    priceAtomic: '3000000',
    endpoint: '/api/generate-image',
    label: 'Regenerate',
    description: 'Generate a new Geoplet artwork',
  },
  ANIMATION: {
    price: '5.00',
    priceAtomic: '5000000',
    endpoint: '/api/generate-animation',
    label: 'Animation',
    description: 'Generate animated version',
  },
} as const;

// USDC contract address on Base
export const BASE_USDC_ADDRESS = process.env.BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Recipient treasury address
export const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS!;
