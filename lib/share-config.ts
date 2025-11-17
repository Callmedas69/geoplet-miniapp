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
    farcaster: "Welcome to Geoplet, art that deploys like code, preserved forever on-chain.\n\nGeopleting your Warplets by @sayangel, reborn with Bauhaus harmony and Suprematist geometry.\n\n🪙 Fully on-chain\n🪙 x402 payment enabled\n🪙 Powered by Onchain.fi\n🪙 Produced by @geoart\n\nStart exploring ↓\n\n",
    twitter: "Welcome to Geoplet, art that deploys like code, preserved forever on-chain.\n\nGeopleting your Warplets by @sayangel, reborn with Bauhaus harmony and Suprematist geometry.\n\n🪙 Fully on-chain\n🪙 x402 payment enabled\n🪙 Powered by @onchainpayment\n🪙 Produced by @geoart\n\nStart exploring ↓\n\n",
  },

  // 2. After mint (post-mint celebration)
  afterMint: {
    farcaster:
      "My Geoplet just went live on-chain!\nWarplets @sayangel being geopleted\n\n🪙 x402 payment settled\n🪙 Geometry aligned\n🪙 Art deployed.\n\nReady for upgrade.",
    twitter:
      "My Geoplet just went live on-chain!\nWarplets being geopleted\n\n🪙 x402 payment settled\n🪙 Geometry aligned\n🪙 Art deployed.\n\nReady for upgrade.",
  },

  // 3. Gallery (existing NFT share)
  gallery: {
    farcaster: "A living archive of geometric art - each Geoplet is fully on-chain, immutable, and upgrade-ready.\n\nGeopleting Warplets by @sayangel with Bauhaus and Suprematist influence.\n\nCurated and produced by @geoart.",
    twitter: "A living archive of geometric art - each Geoplet is fully on-chain, immutable, and upgrade-ready.\n\nGeopleting Warplets with Bauhaus and Suprematist influence.\n\nCurated and produced by @geoart_studio.",
  },

  // Animation feature share
  animation: {
    farcaster: "Check out my animated image created with Geoplet!\n\n",
    twitter: "Check out my animated image created with Geoplet!\n\n",
  },
} as const;
