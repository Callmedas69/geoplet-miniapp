# Geoplet - Farcaster Miniapp 🎨

Transform your Warplets NFTs into stunning geometric art with AI. Built on Base network.

## ✨ Features

- 🖼️ **Warplets NFT Gallery**: Automatically displays all your Warplets NFTs
- 🎨 **Geometric Art Generation**: Transform any Warplet into geometric art (FREE for testing)
- 💾 **Download**: Save generated art to your device
- 🔗 **Share to Farcaster**: One-click sharing of creations
- 🎯 **Future: Mint as NFT**: Mint generated art with fully onchain storage (Base64 + metadata)
- 📱 **Farcaster Native**: Built as a Farcaster miniapp

## 🛠 Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Web3**: wagmi, viem, RainbowKit
- **Farcaster**: @farcaster/miniapp-sdk
- **Blockchain**: Base Network (ERC721 NFTs)
- **AI**: OpenAI (ChatGPT) for geometric art generation
- **NFT**: Warplets ERC721 Contract

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Environment Variables

Already configured in `.env.local`:
- ✅ OpenAI API key
- ✅ WalletConnect Project ID
- ✅ Warplets NFT contract address (Base)
- ✅ Base RPC URL

## 📋 What's Been Built

### Components
- ✅ `Providers` - Web3 providers (Wagmi, RainbowKit, React Query)
- 🚧 `ImageGenerator` - Warplets NFT gallery & transformation (In Progress)
- 🚧 `useWarplets` hook - Fetch user's Warplets NFTs (Planned)

### API Routes
- 🚧 `/api/generate-image` - Generates geometric art from NFT image

### Features Implemented
- ✅ Farcaster SDK initialization
- ✅ Wallet connection (RainbowKit)
- ✅ Base network configuration
- ✅ Farcaster manifest template

### Features In Progress
- 🚧 Read user's Warplets NFTs (ERC721)
- 🚧 Display NFT gallery
- 🚧 Generate geometric art (FREE)
- 🚧 Download functionality
- 🚧 Share to Farcaster

### Features Planned
- 📋 Mint generated art as NFT (GeoPlet collection)
- 📋 Fully onchain storage (Base64 + metadata)
- 📋 Deploy GeoPlet NFT contract (Foundry)

## 🧪 Testing

### Local Testing
1. Connect wallet that owns Warplets NFTs on Base
2. View your Warplets gallery
3. Click on a Warplet to transform
4. Test geometric art generation (FREE)
5. Test download functionality
6. Verify share to Farcaster

### Farcaster Testing
1. Use ngrok: `npx ngrok http 3000`
2. Preview at: https://farcaster.xyz/~/developers/mini-apps/preview
3. Enter ngrok URL and test

## 🚢 Deployment

### Pre-Deploy Checklist
- [ ] Complete Warplets NFT reading implementation
- [ ] Test with real Warplets holders
- [ ] Create app assets (icon, splash, OG image)
- [ ] Update manifest with production domain
- [ ] Sign manifest with Farcaster
- [ ] (Optional) Deploy GeoPlet NFT contract for minting feature
- [ ] (Optional) Implement pricing model if needed

### Deploy to Vercel
```bash
vercel
```

### Register with Farcaster
1. Visit: https://farcaster.xyz/~/developers/mini-apps/manifest
2. Enter your domain
3. Sign the manifest
4. Update `public/.well-known/farcaster.json`

## 📁 Project Structure

```
geoplet/
├── app/
│   ├── api/
│   │   ├── generate-image/route.ts
│   │   └── generate-animation/route.ts
│   └── page.tsx
├── components/
│   ├── ImageGenerator.tsx
│   └── AnimationGenerator.tsx
├── hooks/
│   └── usePayment.ts
├── public/.well-known/
│   └── farcaster.json
└── docs/
    └── GEOPLET_PLAN.md  (Complete implementation plan)
```

## 💰 Economics

- **Image**: $1 USDC (OpenAI cost ~$0.02)
- **Animation**: $5 USDC (xAI cost TBD)
- **Gas on Base**: <$0.01 per transaction
- **Treasury**: `0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0`

## 📚 Documentation

- [Complete Implementation Plan](docs/GEOPLET_PLAN.md)
- [Farcaster Documentation](docs/Farcaster_LLM.md)
- [Onchain.fi Documentation](docs/onchainfi.md)

## ⚠️ Important Notes

1. **Animation Feature**: Currently postponed - waiting for Grok video generation API documentation
   - All code is ready in `components/AnimationGenerator.tsx` and `app/api/generate-animation/route.ts`
   - Just needs correct Grok video API endpoint when available
   - Can be activated by uncommenting in `app/page.tsx`
2. **OpenAI**: Using `images.edit()` - may need adjustment for your use case
3. **Batch Approval**: Users approve $50 USDC once for multiple generations
4. **Payment Verification**: Checks transaction on Base before generating

## 🐛 Troubleshooting

### Payment Issues
- Ensure USDC balance on Base
- Check allowance is approved
- Verify transaction confirmed on Base

### Generation Issues
- Verify API keys are valid
- Check image size < 5MB
- Monitor API rate limits

### Farcaster Issues
- Call `sdk.actions.ready()` on load
- Sign manifest for production domain
- Use production domain (not ngrok) for `addMiniApp()`

## 🔗 Resources

- **Farcaster**: https://docs.farcaster.xyz
- **Base**: https://docs.base.org
- **Onchain.fi**: https://onchain.fi/docs
- **RainbowKit**: https://rainbowkit.com

## 📝 License

MIT
