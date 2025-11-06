import { WarpletDisplay } from "./WarpletDisplay";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRef, useEffect } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";

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
  const badgeContainerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  // Badge stagger animation on mount
  useGSAP(() => {
    if (badgeContainerRef.current) {
      gsap.from(".badge-item", {
        opacity: 0,
        y: 10,
        duration: 0.3,
        stagger: 0.05,
        ease: "power2.out"
      });
    }
  }, { scope: badgeContainerRef });

  // Image transformation animation when generated
  useGSAP(() => {
    if (generatedImage && displayRef.current) {
      gsap.from(displayRef.current, {
        scale: 0.95,
        opacity: 0,
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }, { dependencies: [generatedImage], scope: displayRef });

  // Conditional rendering AFTER all hooks
  if (!warpletImage || !warpletTokenId) {
    return null;
  }

  return (
    <div id="hero-section" className="space-y-6 max-w-2xl mx-auto">
      {/* Badge Section - Above display, outside loading overlay */}
      <div className="text-center px-4">
        <div ref={badgeContainerRef} className="flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className="badge-item text-xs font-medium">
            ⚡ $GEOPLET
          </Badge>
          <Badge variant="outline" className="badge-item text-xs font-medium">
            🔗 onchain.fi
          </Badge>
          <Badge variant="outline" className="badge-item text-xs font-medium">
            🎨 GeoArt.Studio
          </Badge>
          <Badge
            variant="outline"
            className="badge-item text-xs font-medium border-blue-600 text-blue-700"
          >
            ✨ Fully On-Chain
          </Badge>
        </div>
      </div>

      {/* Display Area - Loading overlay only affects this section */}
      <div ref={displayRef} className="relative px-4">
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
