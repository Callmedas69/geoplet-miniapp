import { WarpletDisplay } from "./WarpletDisplay";
import { Loader2 } from "lucide-react";
import { RotatingText } from "./RotatingText";
import { useRef } from "react";
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
  const displayRef = useRef<HTMLDivElement>(null);

  // Image transformation animation when generated
  useGSAP(
    () => {
      if (generatedImage && displayRef.current) {
        gsap.from(displayRef.current, {
          scale: 0.95,
          opacity: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      }
    },
    { dependencies: [generatedImage], scope: displayRef }
  );

  // Conditional rendering AFTER all hooks
  if (!warpletImage || !warpletTokenId) {
    return null;
  }

  return (
    <div id="hero-section" className="max-w-2xl mx-auto">
      {/* Display Area - Loading overlay only affects this section */}
      <div ref={displayRef} className="relative px-4">
        {/* Loading Overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-4 text-black">
              <RotatingText
                messages={[
                  "Summoning geometric harmony...",
                  "Aligning Bauhaus angles...",
                  "Wobbling pixels on-chain...",
                  "Infusing Base energy...",
                  "Balancing Suprematist chaos...",
                  "Painting the blockchain...",
                ]}
                interval={4000}
                className="text-lg font-medium"
              />
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
