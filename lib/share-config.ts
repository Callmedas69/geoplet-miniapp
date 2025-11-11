/**
 * Share Configuration
 *
 * Centralized share messages for all social platforms.
 * KISS Principle: One place to manage all sharing copy.
 *
 * Three states:
 * 1. beforeMint - Pre-generation/preview state
 * 2. afterMint - Post-mint celebration
 * 3. gallery - Existing NFT share from gallery
 */

export const SHARE_CONFIG = {
  // 1. Before mint (pre-generation/preview)
  beforeMint: {
    farcaster: "Art that deploys like code.\nPayments that settle like protocols.\nWelcome to Geoplet — fully on-chain, x402 powered, Onchain.Fi integrated.\n\nStart exploring ↓\n\n",
    twitter: "Art that deploys like code.\nPayments that settle like protocols.\nWelcome to Geoplet — fully on-chain, x402 powered, @onchainpayment integrated.\n\nStart exploring ↓\n\n",
  },

  // 2. After mint (post-mint celebration)
  afterMint: {
    farcaster:
      "Just minted my Geoplet!\nFully on-chain - x402 powered - Onchain.Fi integrated.\nThe future of minting is already here\n\n",
    twitter:
      "Just minted my Geoplet!\nFully on-chain - x402 powered - @onchainpayment integrated.\nThe future of minting is already here\n\n",
  },

  // 3. Gallery (existing NFT share)
  gallery: {
    farcaster: "Check out my Geoplet! \nFully on-chain. x402 powered.\nSettled by Onchain.Fi — art that deploys like code \n\nReady for upgrade\n\n",
    twitter: "Check out my Geoplet! \nFully on-chain. x402 powered.\nSettled by @onchainpayment — art that deploys like code \n\nReady for upgrade\n\n",
  },

  // Animation feature share
  animation: {
    farcaster: "Check out my animated image created with Geoplet!\n\n",
    twitter: "Check out my animated image created with Geoplet!\n\n",
  },
} as const;
