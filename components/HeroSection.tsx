import { WarpletDisplay } from "./WarpletDisplay";
import { Loader2 } from "lucide-react";

interface HeroSectionProps {
  warpletImage: string | null;
  warpletTokenId: string | null;
  generatedImage: string | null;
  isGenerating?: boolean;
}

export function HeroSection({
  warpletImage,
  warpletTokenId,
  generatedImage,
  isGenerating = false,
}: HeroSectionProps) {
  if (!warpletImage || !warpletTokenId) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Main Display Area - Larger and more prominent */}
      <div className="relative">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-3 text-black">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">geofying...</p>
            </div>
          </div>
        )}

        {/* Narrative Text - Centered below display */}
        <div className="text-center text-[16px] text-black/70 leading-relaxed italic space-y-1 my-4">
          <p>Geoplets : Geometric Art meet Warplets</p>
          <p>A fusion of art, code, and value.</p>
          <p>Powered by $GEOPLET</p>
          <p>Moved by onchain.fi</p>
          <p>Born from GeoArt.Studio</p>
          <p>
            creativity, <span className="font-semibold">fully on-chain</span>.
          </p>
        </div>

        {/* Warplet Display */}
        <WarpletDisplay
          imageUrl={warpletImage}
          tokenId={warpletTokenId}
          generatedImage={generatedImage}
          alt={`Warplet #${warpletTokenId}`}
        />
      </div>
    </div>
  );
}
