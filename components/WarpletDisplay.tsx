"use client";

import Image from "next/image";
import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { RotatingText } from "./RotatingText";

interface WarpletDisplayProps {
  imageUrl: string;
  tokenId: string;
  generatedImage?: string | null;
  isMinted?: boolean;
  alt?: string;
}

export function WarpletDisplay({
  imageUrl,
  tokenId,
  generatedImage,
  isMinted = false,
  alt = "Warplet NFT",
}: WarpletDisplayProps) {
  const thumbnailRef = useRef<HTMLDivElement>(null);

  // Add data URI prefix if generatedImage is raw base64 (KISS: display layer transformation)
  const formattedGenerated =
    generatedImage && !generatedImage.startsWith("data:")
      ? `data:image/webp;base64,${generatedImage}`
      : generatedImage;

  // Fade out thumbnail when Geoplet appears
  useEffect(() => {
    if (formattedGenerated && thumbnailRef.current) {
      gsap.to(thumbnailRef.current, {
        opacity: 0,
        scale: 0.9,
        duration: 0.3,
        ease: "power2.out",
      });
    }
  }, [formattedGenerated]);

  return (
    <div className="relative aspect-square rounded-lg">
      {/* Small Warplet Thumbnail - Only shown when no Geoplet */}
      {!formattedGenerated && imageUrl && (
        <div
          ref={thumbnailRef}
          className="absolute top-3 left-3 w-16 h-16 rounded-lg overflow-hidden shadow-lg z-10 border-2 border-white/50"
        >
          <Image
            src={imageUrl}
            alt="Your Warplet"
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Main Area: Rotating Text or Geoplet */}
        {!formattedGenerated ? (
          <div className="flex flex-col items-center justify-center text-center px-8">
            <RotatingText
              messages={[
                "Preparing your geometric art...",
                "Summoning geometric harmony...",
                "Aligning Bauhaus angles...",
                "Calculating sacred proportions...",
                "Harmonizing shapes and colors...",
                "Crafting mathematical beauty...",
              ]}
              interval={1500}
              className="text-lg font-medium text-gray-700"
            />
          </div>
        ) : (
          <>
            <Image
              src={formattedGenerated}
              alt={alt}
              fill
              className="object-contain rounded-lg"
              priority
            />

            {/* Generated/Minted indicator */}
            <div
              className={`absolute top-2 left-2 px-2 py-1 rounded text-xs text-white font-medium ${
                isMinted ? "bg-purple-600/90" : "bg-green-500/90"
              }`}
            >
              {isMinted ? "Minted" : "Generated"}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
