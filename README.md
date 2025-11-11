# Geoplet 🎨

Transform your Warplet NFT into stunning geometric art. Built on Base as a Farcaster miniapp.

## Features

- 🎨 **AI Art Generation** - Convert your Warplet into Bauhaus/Suprematism geometric art (FREE first time)
- 🔄 **Regenerate** - Create new variations with different styles ($0.90 USDC)
- 🖼️ **Mint as NFT** - Save your creation as an NFT on Base ($1 USDC)
- 📱 **Farcaster Native** - Built as a Farcaster miniapp with one-click sharing
- 🎯 **1:1 Mapping** - Your Farcaster ID = Your Warplet tokenId = Your Geoplet tokenId
- 🖼️ **Gallery** - Browse all minted Geoplets

## Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Web3**: Wagmi, Viem, RainbowKit
- **Blockchain**: Base Network (USDC, ERC721)
- **AI**: OpenAI gpt-image-1 (image-to-image)
- **Payment**: OnchainFI x402 protocol (EIP-3009)
- **Farcaster**: @farcaster/miniapp-sdk
- **Storage**: Supabase, Alchemy NFT API

## Quick Start

### Install & Run
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables
Create `.env.local`:
```bash
NEXT_PUBLIC_ALCHEMY_API_KEY=your_key
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_id
OPENAI_API_KEY=your_key
NEXT_PUBLIC_ONCHAINFI_KEY=your_key
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
```

### Build
```bash
npm run build
```

## Pricing

- **Auto-generation**: FREE (first-time per FID)
- **Regeneration**: $0.90 USDC per generation
- **Minting**: $1.00 USDC per NFT
- **Gas**: <$0.01 per tx on Base
- **Treasury**: `0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0`

## How It Works

1. **Connect** - RainbowKit wallet on Base network
2. **Load** - Fetches your Warplet NFT by Farcaster ID
3. **Generate** - AI transforms it into geometric art (FREE)
4. **Regenerate** - Pay $0.90 USDC for new variations (optional)
5. **Mint** - Pay $1 USDC to mint as NFT on Base (optional)
6. **Share** - One-click sharing to Farcaster with OG images

## Payment System

Uses **x402 protocol** via OnchainFI:
- EIP-3009 signatures (no prior approval needed)
- Automatic USDC transfer verification
- On-chain settlement after service delivery
- Secure payment authorization flow

## Project Structure

```
geoplet/
├── app/
│   ├── api/           # API routes (generate, mint, payment)
│   ├── gallery/       # Gallery page
│   ├── share/[fid]/   # Share pages with OG images
│   └── page.tsx       # Main app
├── components/        # UI components
├── hooks/             # Custom hooks (useWarplets, useGeoplet, usePayment)
├── lib/               # Utilities and configs
└── public/
    └── .well-known/
        └── farcaster.json  # Farcaster manifest
```

## Testing Locally

### Farcaster Preview
```bash
npx ngrok http 3000
```
Then visit: https://farcaster.xyz/~/developers/mini-apps/preview

## Deployment

### Vercel
```bash
vercel
```

### Register with Farcaster
1. Visit: https://farcaster.xyz/~/developers/mini-apps/manifest
2. Enter your production domain
3. Sign the manifest
4. Update `public/.well-known/farcaster.json`

## Resources

- **Farcaster Docs**: https://docs.farcaster.xyz
- **Base Network**: https://docs.base.org
- **OnchainFI**: https://docs.onchain.fi
- **RainbowKit**: https://rainbowkit.com

## Contract Addresses (Base Mainnet)

- **Geoplet NFT**: `0x9e1028F5F1D5eDE59748FFceE5532509976840E0`
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **Treasury**: `0xFdF53De20f46bAE2Fa6414e6F25EF1654E68Acd0`

## License

MIT
