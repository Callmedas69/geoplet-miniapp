import { WarpletDisplay } from "./WarpletDisplay";
import { ProjectDescription } from "./ProjectDescription";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";
import { sdk } from "@farcaster/miniapp-sdk";

interface HeroSectionProps {
  warpletImage: string | null;
  warpletTokenId: string | null;
  generatedImage: string | null;
}

export function HeroSection({
  warpletImage,
  warpletTokenId,
  generatedImage,
}: HeroSectionProps) {
  const { totalCount } = useGalleryNFTs();

  if (!warpletImage || !warpletTokenId) {
    return null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

  const handleFarcasterShare = async () => {
    try {
      await sdk.actions.composeCast({
        text: `Geoplet : when geometric art meets Warplets!\nIntegrated with @onchainpayment (x402 Aggregator).\nProduced by GeoArt — where creativity lives fully on-chain.`,
        embeds: [appUrl],
      });
    } catch (error) {
      console.error("Failed to share on Farcaster:", error);
    }
  };

  const handleTwitterShare = () => {
    const shareText = encodeURIComponent(
      "Geoplet : when geometric art meets Warplets!\nIntegrated with @onchainpayment (x402 Aggregator).\nProduced by GeoArt.Studio — where creativity lives fully on-chain.\n\n"
    );
    const shareUrl = encodeURIComponent(appUrl);
    const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
    window.open(twitterUrl, "_blank");
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      {/* Top Section: Thumbnail + Stats side by side */}
      <div className="flex gap-6">
        {/* Left: Warplet Display - Fixed width thumbnail */}
        <div className="shrink-0 w-28">
          <WarpletDisplay
            imageUrl={warpletImage}
            tokenId={warpletTokenId}
            generatedImage={generatedImage}
            alt={`Warplet #${warpletTokenId}`}
          />
        </div>

        {/* Right: Stats + Share buttons */}
        <div className="flex flex-col justify-start space-y-2 text-xs text-black/70">
          <p>
            <span className="font-semibold">total geofying :</span> {totalCount}
          </p>
          <p>
            <span className="font-semibold">onchain :</span>{" "}
            <span className="text-green-500">fully onchain</span>
          </p>
          <p>
            <span className="font-semibold">onchain.fi :</span>{" "}
            <span className="text-green-500">live</span>
          </p>

          {/* Share Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleFarcasterShare}
              className="flex items-center gap-1 px-2 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded text-[10px] font-medium transition-colors"
              aria-label="Share on Farcaster"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 4v16h4v-4h2v4h8v-4h2v4h4V4H2zm6 8H6V8h2v4zm4 0h-2V8h2v4zm4 0h-2V8h2v4z" />
              </svg>
              Farcaster
            </button>
            <button
              onClick={handleTwitterShare}
              className="flex items-center gap-1 px-2 py-1 bg-black hover:bg-gray-800 text-white rounded text-[10px] font-medium transition-colors"
              aria-label="Share on Twitter"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Full width description */}
      <div className="text-center text-[10px] text-black/80 leading-relaxed italic">
        <p>
          When Geometric Art meets Warplet — a fusion of form and frequency.
          <br />
          Powered by $GEOPLET, integrated with onchain.fi (x402 Aggregator).
          <br />
          Produced by GeoArt.Studio — where creativity lives fully on-chain.
        </p>
      </div>
    </div>
  );
}
