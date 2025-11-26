/**
 * Payment Configuration
 *
 * Centralized x402 payment settings for all payment flows
 * - Mint: $1.99 USDC (onchain NFT minting)
 * - Animation: $4.99 USDC (animation generation)
 */

export const PAYMENT_CONFIG = {
  MINT: {
    price: '1',           // Human-readable price
    priceAtomic: '1000000',  // USDC atomic units (6 decimals)
    endpoint: '/api/get-mint-signature',
    label: 'Mint',
    description: 'Mint your unique Geoplet NFT',
  },
  ANIMATION: {
    price: '1.99',
    priceAtomic: '1990000',
    endpoint: '/api/generate-animation',
    label: 'Animation',
    description: 'Generate animated version',
  },
} as const;

// USDC contract address on Base
export const BASE_USDC_ADDRESS = process.env.BASE_USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Recipient treasury address (final destination for funds)
export const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS!;

// Onchain.fi intermediate addresses for x402 signatures
// The signature must be signed TO this address, NOT the final recipient
// See: https://docs.onchain.fi - "Sign to Intermediate Address"
export const ONCHAIN_FI_INTERMEDIATES = {
  // Same-chain Base → Base
  BASE_TO_BASE: '0xfeb1F8F7F9ff37B94D14c88DE9282DA56b3B1Cb1' as const,
  // Same-chain Solana → Solana
  SOLANA_TO_SOLANA: 'DoVABZK8r9793SuR3powWCTdr2wVqwhueV9DuZu97n2L' as const,
  // Cross-chain Base → Solana
  BASE_TO_SOLANA: '0x931Cc2F11C36C34b4312496f470Ff21474F2fA42' as const,
  // Cross-chain Solana → Base
  SOLANA_TO_BASE: 'AGm6Dzvd5evgWGGZtyvJE7cCTg7DKC9dNmwdubJg2toq' as const,
} as const;
