# Geoplet - Farcaster Miniapp Implementation Plan

## Project Overview

Geoplet is a Farcaster miniapp that transforms **Warplets NFTs** into stunning geometric art style using AI. Built on Base network following KISS principle.

**Core Features:**
- 🖼️ **Warplets NFT Gallery**: Automatically fetch & display user's Warplets (ERC721)
- 🎨 **Geometric Art Generation**: Transform Warplets to geometric art (FREE for testing)
- 💾 **Download**: Save generated art locally
- 🚀 **Share**: Share to Farcaster with one click
- 🎯 **Future: Mint NFT**: Mint generated art with fully onchain storage (Base64 + metadata)

---

## Technology Stack

### Frontend
- **Framework**: Next.js 16.0.1 with React 19
- **Styling**: TailwindCSS
- **Web3**: wagmi 2.19.1, viem 2.38.5, RainbowKit 2.2.9
- **Farcaster**: @farcaster/miniapp-sdk 0.2.1

### Backend
- **API Routes**: Next.js API routes
- **Image Generation**: OpenAI API (ChatGPT)
- **Storage**: Base64 onchain (future NFT minting)

### Blockchain
- **Network**: Base (Coinbase L2)
- **Warplets NFT**: 0x699727f9e01a822efdcf7333073f0461e5914b4e (ERC721)
- **NFT Standard**: ERC721 with tokenURI metadata
- **Future: GeoPlet NFT**: Deploy with Foundry for minting generated art

---

## Architecture

```
User Flow:
1. User connects wallet (RainbowKit)
2. Frontend reads Warplets NFTs owned by user (ERC721)
3. Display all Warplets in gallery grid
4. User clicks on a Warplet to transform
5. Frontend sends NFT image to API (FREE, no payment)
6. Backend calls OpenAI API for geometric art
7. Returns generated art to user
8. User can Download or Share to Farcaster
9. (Future) User can Mint as NFT with onchain storage
```

### Data Flow (KISS Principle)
- **No database**: All NFT data read from blockchain
- **No payment system**: Free for testing phase
- **Direct NFT reading**: Use wagmi + standard ERC721 interface
- **Simple API**: Just image transformation, no complex logic
- **Client-side processing**: Download handled in browser

---

## Environment Variables

```bash
# AI Generation
OPENAI_API_KEY=sk-proj-xxx... # Get from https://platform.openai.com

# Blockchain (Base Network)
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_WARPLETS_ADDRESS=0x699727f9e01a822efdcf7333073f0461e5914b4e

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx # Get from https://cloud.walletconnect.com

# Future: GeoPlet NFT Contract (when deployed)
# NEXT_PUBLIC_GEOPLET_NFT_ADDRESS=0x...
```

---

## Implementation Phases

### Phase 1: Setup & Configuration ✅

**Tasks:**
1. ✅ Create documentation
2. ✅ Configure environment variables
3. ✅ Setup wagmi + RainbowKit providers
4. ✅ Configure Base network
5. ✅ Add Warplets contract address

**Deliverables:**
- ✅ Complete environment configuration
- ✅ Web3 providers working
- ✅ WalletConnect integration

---

### Phase 2: Warplets NFT Reading ✅ COMPLETE

**File:** `hooks/useWarplets.ts`

**Implementation: Alchemy API (KISS Principle)**
```typescript
export function useWarplets() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<WarpletNFT[]>([]);

  useEffect(() => {
    if (!isConnected || !address) return;

    // Use Alchemy getNFTsForOwner API
    const params = new URLSearchParams({
      owner: address,
      'contractAddresses[]': WARPLETS_ADDRESS,
      withMetadata: 'true',
      'excludeFilters[]': 'SPAM',
    });

    const url = `${ALCHEMY_BASE_URL}/getNFTsForOwner?${params.toString()}`;
    const response = await fetch(url);
    const data = await response.json();

    setNfts(data.ownedNfts.map(nft => ({
      tokenId: nft.tokenId,
      name: nft.name || `Warplet #${nft.tokenId}`,
      imageUrl: nft.image?.cachedUrl || nft.image?.originalUrl,
      thumbnailUrl: nft.image?.thumbnailUrl,
    })));
  }, [address, isConnected]);

  return { nfts, isLoading, error, hasWarplets: nfts.length > 0 };
}
```

**Why Alchemy API vs Direct Contract Calls:**
- ✅ Faster: Pre-indexed NFT data with thumbnails
- ✅ Simpler: No need to loop through tokenOfOwnerByIndex
- ✅ Better UX: Cached thumbnails load instantly
- ✅ No RPC spam: Single API call vs N contract calls
- ✅ Free tier: 100M compute units/month

---

### Phase 3: API Routes (Backend) ✅ COMPLETE

#### File: `app/api/generate-image/route.ts`

**Implementation: gpt-image-1 Direct Image-to-Image Transformation**

```typescript
POST /api/generate-image
Body: { imageUrl: string, tokenId: string, name: string }

// Direct image-to-image transformation with gpt-image-1
async function generateGeometricArt(imageUrl, tokenId, name) {
  // Fetch the original Warplet image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();

  // Convert to File object for OpenAI API
  const imageFile = await toFile(Buffer.from(imageBuffer), 'warplet.png', {
    type: 'image/png'
  });

  // Use gpt-image-1 for direct image-to-image transformation
  const response = await openai.images.edit({
    model: 'gpt-image-1',
    image: imageFile,
    prompt: `The character in the submitted image is the primary subject.
             Convert this character into a low-poly geometric vector art style
             with a dark horror atmosphere. CRITICAL: Keep the original expressions
             exactly as shown in the source image. Keep the original pose exactly
             as shown in the source image. Use sharp angular polygons, flat color
             planes, and minimal shading with eerie lighting and dramatic shadows.
             Preserve the character's proportions and key details, but render them
             with faceted polygonal shapes. Add a spooky yet captivating mood with
             dark ambience. Clean flat background, minimalist aesthetic, modern
             digital geometric art style.`,
    n: 1,
    size: '1024x1024',
  });

  // Convert to Base64 for download/future minting
  const resultImageUrl = response.data[0].url;
  const resultBuffer = await fetch(resultImageUrl).arrayBuffer();
  return `data:image/png;base64,${Buffer.from(resultBuffer).toString('base64')}`;
}
```

**Evolution of Approaches:**
1. ❌ **DALL-E 2 `images.edit()` FAILED**: Requires RGBA with transparent pixels (for inpainting, not style transfer)
2. ✅ **GPT-4o Vision + DALL-E 3 (v1)**: 2-step process with text analysis, worked but inconsistent
3. ✅ **gpt-image-1 `images.edit()` (v2 - CURRENT)**: Direct image-to-image transformation, simpler and more consistent

**Why gpt-image-1 (Current Approach):**
- ✅ **Direct transformation**: No text analysis step, image directly transforms image
- ✅ **Better consistency**: Preserves original expressions and pose more accurately
- ✅ **Simpler code**: Single API call vs 2-step Vision + Generation
- ✅ **Horror theme**: Dark low-poly geometric style with dramatic shadows
- ⚠️ **Requires organization verification**: Must have verified OpenAI organization

**Performance:**
- Image fetch: ~1-2 seconds
- Generation: ~30-35 seconds (gpt-image-1)
- Base64 conversion: ~1 second
- **Total**: ~32-38 seconds per transformation
- **Cost**: ~$0.02-0.03 per generation (cheaper than Vision + DALL-E 3)

**Security:**
- ✅ API key server-side only
- ✅ Image URL validation
- ✅ Error handling with retry logic
- 📋 TODO: Rate limiting per wallet address

---

### Phase 4: UI Components ✅ COMPLETE

#### File: `app/page.tsx`

**Updates:**
```typescript
- Initialize Farcaster SDK
- Call sdk.actions.ready() after load
- Add RainbowKit wallet connection
- Import ImageGenerator component
- Farcaster miniapp styling
```

#### File: `components/ImageGenerator.tsx`

**Features:**
- **Warplets Gallery View**:
  - Grid display of user's Warplets NFTs
  - Loading state while fetching NFTs
  - Empty state if no Warplets owned
  - Click on NFT to select for transformation

- **Generation View**:
  - Show selected Warplet image
  - "Transform to Geometric Art" button (FREE)
  - Loading state with progress indicator
  - Display generated result

- **Result Actions**:
  - 💾 **Download** button - Save to device
  - 🚀 **Share** button - Share to Farcaster via `sdk.actions.composeCast()`
  - 🔄 **New** button - Return to gallery

**UI/UX Principles:**
- Mobile-first (Farcaster miniapp size: 424x695px)
- Clean NFT gallery grid (2-3 columns)
- Clear loading states
- Error handling with helpful messages
- Success celebration on generation complete

---

### Phase 5: Farcaster Configuration ✅ COMPLETE (Local Testing)

#### File: `public/.well-known/farcaster.json`

**Manifest Structure:**
```json
{
  "accountAssociation": {
    "header": "...",
    "payload": "...",
    "signature": "..."
  },
  "miniapp": {
    "version": "1",
    "name": "Geoplet",
    "iconUrl": "https://yourdomain.com/icon.png",
    "homeUrl": "https://yourdomain.com",
    "imageUrl": "https://yourdomain.com/og-image.png",
    "description": "Transform your Warplets into geometric art",
    "buttonTitle": "Transform Warplets",
    "splashImageUrl": "https://yourdomain.com/splash.png",
    "splashBackgroundColor": "#6366f1"
  }
}
```

**Steps:**
1. Deploy app to production domain
2. Sign manifest via Farcaster developer tools: https://farcaster.xyz/~/developers/mini-apps/manifest
3. Add signed `accountAssociation` to manifest
4. Test manifest validation

#### Embed Metadata

Add to page `<head>` for social sharing:
```typescript
metadata: {
  other: {
    "fc:miniapp": JSON.stringify({
      version: "1",
      imageUrl: "https://yourdomain.com/og.png",
      button: {
        title: "Open Geoplet",
        action: {
          type: "launch_frame",
          name: "Geoplet",
          url: "https://yourdomain.com"
        }
      }
    })
  }
}
```

---

### Phase 6: Testing & Deployment 🚧 IN PROGRESS

#### Local Testing ✅ COMPLETE
1. ✅ Wallet connection works (RainbowKit)
2. ✅ Warplets NFT reading successful (Alchemy API)
3. ✅ NFT gallery displays correctly
4. ✅ Geometric art generation WORKS (GPT-4o Vision + DALL-E 3)
5. ✅ Download functionality works
6. ✅ Share to Farcaster implemented
7. ✅ Ngrok tunnel setup complete (`https://b83a69b94b5e.ngrok-free.app`)
8. ✅ Tested with Warplet #304954 successfully

#### Production Deployment 📋 TODO
**Checklist:**

1. **Create Branded Assets:**
   - [ ] Design `public/icon.png` (512x512px, Geoplet branding)
   - [ ] Design `public/splash.png` (for Farcaster miniapp loading)
   - [ ] Design `public/og-image.png` (1200x630px for social sharing)

2. **Deploy to Vercel:**
   - [ ] Connect GitHub repository to Vercel
   - [ ] Configure environment variables:
     - `OPENAI_API_KEY`
     - `NEXT_PUBLIC_ALCHEMY_API_KEY`
     - `NEXT_PUBLIC_WARPLETS_ADDRESS`
     - `NEXT_PUBLIC_BASE_RPC_URL`
     - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
   - [ ] Deploy and get production URL (e.g., `geoplet.vercel.app`)

3. **Update URLs:**
   - [ ] Replace ngrok URLs with production domain in:
     - `public/.well-known/farcaster.json`
     - `app/layout.tsx` metadata
   - [ ] Verify all URLs are HTTPS production URLs

4. **Register Farcaster Manifest:**
   - [ ] Sign manifest at https://farcaster.xyz/~/developers/mini-apps/manifest
   - [ ] Update `accountAssociation` in `farcaster.json`
   - [ ] Test manifest validation
   - [ ] Preview in Farcaster developer tools

5. **Final Testing:**
   - [ ] Test complete flow on production with real Warplets holder
   - [ ] Monitor API logs for errors
   - [ ] Test share to Farcaster on production
   - [ ] Verify download works on production

#### Future: NFT Minting 📋 PHASE 7
- Deploy GeoPlet NFT contract (Foundry)
- Add "Mint as NFT" functionality
- Implement onchain Base64 storage

---

## Economics & Costs

### Current Model (Testing Phase)
- **Geometric Art Generation**: FREE
- **OpenAI API Cost**: ~$0.02-0.04 per generation
- **User Cost**: $0 (no payments required)

### Future Model (Optional)
- **Option 1**: Keep free, sponsor via grants/partnerships
- **Option 2**: Add optional minting for $X USDC
- **Option 3**: Subscription model for unlimited generations

### Gas Costs (Base Network)
- **Wallet connection**: Free
- **NFT reading**: Free (read-only calls)
- **Future NFT minting**: ~$0.10-0.50 (user pays gas)
- **Base64 storage**: Expensive (~$100+ for large images)

---

## Critical Considerations

### Security
1. **API Key Protection**: Never expose OpenAI key in client-side code
2. **Rate Limiting**: Prevent abuse via IP/wallet address rate limits
3. **NFT Validation**: Verify NFT ownership before generation
4. **Input Validation**: Validate image URLs from tokenURI

### Error Handling
1. **NFT Reading Failures**: Handle no Warplets owned gracefully
2. **API Failures**: Clear error messages with retry option
3. **Network Issues**: Retry logic with exponential backoff
4. **Invalid Metadata**: Handle malformed tokenURI responses

### User Experience
1. **Zero Friction**: No payments, just connect and transform
2. **Progress Indicators**: Loading states for NFT fetching and generation
3. **Empty States**: Helpful message if user has no Warplets
4. **Success Celebration**: Celebrate successful generation with animations
5. **Easy Sharing**: One-click share to Farcaster

---

## File Structure

```
geoplet/
├── app/
│   ├── api/
│   │   └── generate-image/
│   │       └── route.ts          # Geometric art generation endpoint
│   ├── page.tsx                  # Main app page with Farcaster SDK
│   ├── layout.tsx                # Root layout with Providers
│   └── globals.css               # Global styles
├── components/
│   ├── ImageGenerator.tsx        # NFT gallery & transformation UI
│   ├── Providers.tsx             # Web3 providers wrapper
│   └── ui/                       # shadcn/ui components
├── hooks/
│   ├── useWarplets.ts           # Fetch user's Warplets NFTs
│   └── usePayment.ts            # (Legacy - not used in v2)
├── lib/
│   ├── wagmi.ts                 # Wagmi configuration (Base network)
│   └── utils.ts                 # Helper utilities
├── public/
│   └── .well-known/
│       └── farcaster.json       # Farcaster manifest
├── docs/
│   ├── log.md                   # Development log with vision
│   ├── Farcaster_LLM.md         # Farcaster documentation
│   ├── ChatGPT.md               # OpenAI API documentation
│   └── GEOPLET_PLAN.md          # This file (official documentation)
└── .env.local                   # Environment variables
```

---

## Timeline Estimate

- **Phase 1**: ✅ COMPLETE - Setup & Configuration (1 hour)
- **Phase 2**: ✅ COMPLETE - Warplets NFT Reading with Alchemy API (2 hours)
- **Phase 3**: ✅ COMPLETE - API Routes with GPT-4o Vision + DALL-E 3 (3 hours)*
- **Phase 4**: ✅ COMPLETE - UI Components (Black theme, gallery, generation) (2 hours)
- **Phase 5**: ✅ COMPLETE - Farcaster Config (Local testing with ngrok) (1 hour)
- **Phase 6**: 🚧 IN PROGRESS - Production Deployment (2-3 hours remaining)
  - ✅ Local testing complete
  - 📋 Branded assets creation
  - 📋 Vercel deployment
  - 📋 Farcaster manifest signing
- **Phase 7** (Future): NFT Minting Contract (4+ hours)

**Total Actual Time**: ~9 hours for local MVP (Phases 1-5)
**Remaining**: ~2-3 hours for production deployment (Phase 6)

*Note: Phase 3 took longer due to debugging DALL-E 2 `images.edit()` issues. Solution: switched to GPT-4o Vision + DALL-E 3 approach.

---

## Success Metrics

### Launch Criteria
- ✅ Wallet connection works smoothly
- ✅ Warplets NFT reading successful
- ✅ Gallery displays correctly
- ✅ Generation produces quality geometric art
- ✅ Download functionality works
- ✅ Share to Farcaster functions properly
- ✅ No critical bugs

### Post-Launch Monitoring
- NFT read success rate (target: >99%)
- Generation success rate (target: >98%)
- User feedback on art quality
- Average transformations per user
- Share rate to Farcaster
- Wallet addresses with Warplets vs without

---

## Future Enhancements

### Phase 7: NFT Minting (Priority)
1. **Deploy GeoPlet NFT Contract** (Foundry):
   - ERC721 contract on Base
   - Fully onchain storage (Base64 + metadata)
   - Minting function with proper access control
2. **Minting UI**:
   - "Mint as NFT" button after generation
   - User pays gas fees (~$0.10-0.50)
   - Show minted NFT on OpenSea/Basescan
3. **Onchain Storage**:
   - Store image as Base64 in tokenURI
   - Store metadata (original Warplet ID, timestamp, etc.)
   - Warning users about high gas costs

### Additional Features (Optional)
1. **Multiple Art Styles**: Cyberpunk, watercolor, pixel art
2. **Batch Processing**: Transform multiple Warplets at once
3. **Gallery History**: View past transformations (requires backend)
4. **Support Other NFTs**: Expand beyond Warplets
5. **AI Customization**: Let users tweak geometric art parameters
6. **Social Features**: Leaderboard of most shared transformations

### Technical Improvements
1. Add caching for repeated generations
2. Implement progress streaming for generation
3. Add image optimization before sending to OpenAI
4. Implement retry queue for failed generations
5. Add analytics dashboard (PostHog/Mixpanel)

---

## Resources

### Documentation
- Farcaster Mini Apps: https://docs.farcaster.xyz/developers/frames/v2
- Onchain.fi: https://onchain.fi/docs
- RainbowKit: https://rainbowkit.com
- wagmi: https://wagmi.sh
- Base: https://docs.base.org

### Tools
- Farcaster Developer Tools: https://farcaster.xyz/~/developers
- Base Explorer: https://basescan.org
- OpenAI Playground: https://platform.openai.com/playground

---

## Notes

**KISS Principle Applied:**
- ✅ No database (NFT data from blockchain)
- ✅ No payment system (free for testing)
- ✅ No complex state management (React hooks only)
- ✅ Direct NFT reading (standard ERC721 interface)
- ✅ Simple UI (focus on core: gallery → transform → download/share)
- ✅ No custom ABI needed (standard ERC721)

**Base Network Benefits:**
- Low gas fees (~$0.0001 for reads, free for RPC calls)
- Fast confirmation (~2 seconds)
- EVM compatible (easy wagmi integration)
- Growing NFT ecosystem (Warplets on Base)
- Cheap NFT minting (future feature)

**Architecture Decisions:**
- Use standard ERC721 interface (no assumptions)
- Free generation (test & grow user base first)
- Download > Mint (lower friction initially)
- Onchain storage for future minting (expensive but fully decentralized)

**Technical Stack Choices:**
- Next.js 16 + React 19 (latest, best DX)
- wagmi + viem (best Web3 DX)
- RainbowKit (best wallet UX)
- Foundry (when deploying contracts)
- shadcn/ui (consistent UI components)

---

## Technical Lessons Learned

### Critical Decisions & Solutions

**1. Alchemy API vs Direct Contract Calls**
- **Decision**: Use Alchemy `getNFTsForOwner` instead of direct ERC721 contract calls
- **Reason**: Single API call vs N contract calls, pre-indexed data, cached thumbnails
- **Result**: Faster loading, better UX, no RPC spam

**2. Image Generation API Evolution**
- **v1 - DALL-E 2 `images.edit()`**: ❌ FAILED
  - Requires RGBA with transparent pixels (designed for inpainting, not style transfer)
  - Failed attempts: `.ensureAlpha()`, `palette: false`, transparent mask file
  - Root cause: Wrong API for image-to-image style transfer

- **v2 - GPT-4o Vision + DALL-E 3**: ✅ WORKED (but replaced)
  - 2-step process: Vision analysis → DALL-E 3 generation
  - Worked well but had consistency issues
  - Required structured prompts + temperature=0 + caching for consistency

- **v3 - gpt-image-1 `images.edit()`**: ✅ CURRENT (Best)
  - Direct image-to-image transformation (no text analysis)
  - Better consistency preserving original expressions/pose
  - Simpler code, faster performance, lower cost
  - Horror theme with low-poly geometric style
  - Requires verified OpenAI organization

**3. Environment Variables Public vs Private**
- **Decision**: Made Alchemy API key and contract addresses `NEXT_PUBLIC_*`
- **Reason**: Needed in client-side components for NFT reading
- **Security**: Read-only API keys safe to expose (no write operations)

**4. Black Theme Instead of Gradient**
- **Decision**: Black background with white foreground
- **Reason**: User's explicit requirement for Geoplet brand
- **Implementation**: Updated all components from colorful gradients to `bg-black` + `text-white`

**5. Base64 for Generated Images**
- **Decision**: Convert generated images to Base64 data URLs
- **Reason**: Enables download functionality and future onchain storage
- **Trade-off**: Larger payload (~2MB) but necessary for full decentralization

### Performance Metrics

**Actual Performance** (tested with Warplet #304954):
- Warplets NFT loading: ~2-3 seconds (Alchemy API)
- Image fetch: ~1-2 seconds
- Art generation: ~30-35 seconds (gpt-image-1, 1024x1024)
- Base64 conversion: ~1 second (1932 KB)
- **Total**: ~32-38 seconds per transformation (faster than Vision + DALL-E 3!)

**Cost per Generation**:
- gpt-image-1: ~$0.02-0.03 (direct image-to-image)
- **Total**: ~$0.02-0.03 per transformation (50% cheaper than v2!)

### Key Takeaways (KISS Principle Applied)

✅ **What Worked:**
1. Using Alchemy API instead of reinventing NFT indexing
2. Iterating through 3 OpenAI API approaches to find the best
3. gpt-image-1 direct image-to-image (simpler, faster, cheaper than Vision + DALL-E 3)
4. Black/white minimalist theme (simpler than complex gradients)
5. No database (read directly from blockchain/APIs)
6. Free for users (testing phase, low friction)
7. Removing text analysis step (direct transformation more consistent)

❌ **What Didn't Work:**
1. DALL-E 2 `images.edit()` for style transfer (wrong use case)
2. Trying to force RGBA format for inpainting API
3. Overcomplicating image processing with Sharp
4. Text analysis introduced inconsistency (removed in v3)

🎯 **Critical Success Factors:**
1. Deep investigation of root causes (not surface-level fixes)
2. Reading official API documentation carefully
3. Understanding API design intent and evolution
4. Willingness to pivot when better approach available
5. Following user's CLAUDE.md guidelines (KISS, critical thinking, thorough investigation)
6. Testing new models when they become available (gpt-image-1)

---

Last Updated: 2025-10-31
Status: Phases 1-5 Complete, Phase 6 In Progress (Production Deployment)
Version: 3.0 (Warplets NFT Focus with gpt-image-1 Direct Transformation)
