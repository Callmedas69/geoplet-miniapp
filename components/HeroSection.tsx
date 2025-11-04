import { WarpletDisplay } from "./WarpletDisplay";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";
import { sdk } from "@farcaster/miniapp-sdk";
import localfont from "next/font/local";

const schoolBell = localfont({
  src: "../public/font/Schoolbell-Regular.ttf",
  display: "swap",
});

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
        <div className="flex flex-col justify-start space-y-2 text-sm text-black/70 leading-none">
          <p>
            <span>total geofying :</span> {totalCount}
          </p>
          <p>
            <span>onchain :</span>{" "}
            <span className="text-green-500">fully onchain</span>
          </p>
          <p>
            <span>onchain.fi :</span>{" "}
            <span className="text-green-500">live</span>
          </p>

          {/* Share Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleFarcasterShare}
              aria-label="Share on Farcaster"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 1000 1000"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M257.778 155.556H742.222V844.445H671.111V528.889H670.414C662.554 441.677 589.258 373.333 500 373.333C410.742 373.333 337.446 441.677 329.586 528.889H328.889V844.445H257.778V155.556Z"
                  fill="#855DCD"
                />
                <path
                  d="M128.889 253.333L157.778 351.111H182.222V746.667C169.949 746.667 160 756.616 160 768.889V795.556H155.556C143.283 795.556 133.333 805.505 133.333 817.778V844.445H382.222V817.778C382.222 805.505 372.273 795.556 360 795.556H355.556V768.889C355.556 756.616 345.606 746.667 333.333 746.667H306.667V253.333H128.889Z"
                  fill="#855DCD"
                />
                <path
                  d="M675.556 746.667C663.283 746.667 653.333 756.616 653.333 768.889V795.556H648.889C636.616 795.556 626.667 805.505 626.667 817.778V844.445H875.556V817.778C875.556 805.505 865.606 795.556 853.333 795.556H848.889V768.889C848.889 756.616 838.94 746.667 826.667 746.667V351.111H851.111L880 253.333H702.222V746.667H675.556Z"
                  fill="#855DCD"
                />
              </svg>
            </button>
            <button onClick={handleTwitterShare} aria-label="Share on Twitter">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Full width description */}
      <div
        className={`text-center text-sm text-black/70 leading-relaxed italic`}
      >
        <p>
          when Geometric Art meets Warplet <br />a fusion of form and frequency.
          <br />
          powered by $GEOPLET, <br />
          integrated with onchain.fi (x402 Aggregator).
          <br />
          Produced by GeoArt.Studio <br />
          where creativity lives fully on-chain.
        </p>
      </div>
    </div>
  );
}
