import { WarpletDisplay } from "./WarpletDisplay";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface HeroSectionProps {
  warpletImage: string | null;
  warpletTokenId: string | null;
  generatedImage: string | null;
  isGenerating?: boolean;
  isMinted?: boolean;
}

export function HeroSection({
  warpletImage,
  warpletTokenId,
  generatedImage,
  isGenerating = false,
  isMinted = false,
}: HeroSectionProps) {
  if (!warpletImage || !warpletTokenId) {
    return null;
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Badge Section - Above display, outside loading overlay */}
      <div className="text-center px-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs font-medium">
            ⚡ $GEOPLET
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            🔗 onchain.fi
          </Badge>
          <Badge variant="outline" className="text-xs font-medium">
            🎨 GeoArt.Studio
          </Badge>
          <Badge
            variant="outline"
            className="text-xs font-medium border-blue-600 text-blue-700"
          >
            ✨ Fully On-Chain
          </Badge>
        </div>
      </div>

      {/* Display Area - Loading overlay only affects this section */}
      <div className="relative px-4">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-4 text-black">
              <Loader2 className="w-10 h-10 animate-spin" />
              <p className="text-sm font-medium">Creating your Geoplet...</p>
            </div>
          </div>
        )}

        {/* Warplet Display */}
        <WarpletDisplay
          imageUrl={warpletImage}
          tokenId={warpletTokenId}
          generatedImage={generatedImage}
          isMinted={isMinted}
          alt={`Warplet #${warpletTokenId}`}
        />
      </div>
    </div>
  );
}
