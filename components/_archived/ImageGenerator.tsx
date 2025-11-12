"use client";

import { useState, useEffect } from "react";
import { useWarplets, WarpletNFT } from "@/hooks/useWarplets";
import { useGeoplet } from "@/hooks/useGeoplet";
import { sdk } from "@farcaster/miniapp-sdk";
import Image from "next/image";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

// Track generated images per NFT
type GeneratedImage = {
  imageData: string;
  nft: WarpletNFT;
};

export function ImageGenerator() {
  const { isConnected } = useAccount();
  const { nft, fid, isLoading, error: fetchError, hasWarplet } = useWarplets();
  const {
    mintNFT,
    isLoading: isMinting,
    isSuccess,
    error: mintError,
  } = useGeoplet();

  // Track if generating and store generated image
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(
    null
  );
  const [alreadyMinted, setAlreadyMinted] = useState(false);
  const [checkingMintStatus, setCheckingMintStatus] = useState(false);

  /**
   * Check if FID is already minted on component mount
   */
  useEffect(() => {
    const checkMintStatus = async () => {
      if (!fid) return;

      setCheckingMintStatus(true);
      try {
        const response = await fetch(`/api/check-fid?fid=${fid}`);
        if (response.ok) {
          const data = await response.json();
          setAlreadyMinted(data.isMinted);
        }
      } catch (error) {
        console.warn("Failed to check mint status:", error);
      } finally {
        setCheckingMintStatus(false);
      }
    };

    checkMintStatus();
  }, [fid]);

  /**
   * Update alreadyMinted state after successful mint
   */
  useEffect(() => {
    if (isSuccess) {
      setAlreadyMinted(true);
    }
  }, [isSuccess]);

  /**
   * Generate geometric art inline (replaces image in card)
   */
  const handleGenerate = async () => {
    if (!nft) return;

    try {
      haptics.tap(); // Haptic feedback on button press
      setIsGenerating(true);

      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl: nft.imageUrl,
          tokenId: nft.tokenId,
          name: nft.name,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Generation failed");
      }

      const result = await response.json();

      // Store generated image
      setGeneratedImage({
        imageData: result.imageData,
        nft,
      });

      haptics.success(); // Success haptic
      toast.success("Geometric art generated!");
    } catch (err: unknown) {
      console.error("Generation error:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate geometric art";
      haptics.error(); // Error haptic
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Download generated image
   */
  const handleDownload = () => {
    if (!generatedImage) return;

    haptics.tap(); // Haptic feedback
    const link = document.createElement("a");
    link.href = generatedImage.imageData;
    link.download = `geoplet-${generatedImage.nft.tokenId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    haptics.success();
    toast.success("Image downloaded!");
  };

  /**
   * Share to Farcaster
   */
  const handleShare = async () => {
    if (!generatedImage) return;

    try {
      haptics.tap(); // Haptic feedback
      await sdk.actions.composeCast({
        text: `Check out my geometric Warplet created with Geoplet! 🎨✨\n\nOriginal: ${generatedImage.nft.name}`,
        embeds: [generatedImage.imageData],
      });

      haptics.success();
      toast.success("Shared to Farcaster!");
    } catch (err) {
      console.error("Share failed:", err);
      haptics.error();
      toast.error("Failed to share");
    }
  };

  /**
   * Mint NFT on-chain
   */
  const handleMint = async () => {
    if (!generatedImage || !nft) return;

    try {
      haptics.tap(); // Haptic feedback

      // Validate payload size before minting (contract limit is 24KB)
      const base64Data = generatedImage.imageData.split(",")[1] || "";
      const sizeInKB = (base64Data.length * 0.75) / 1024; // Base64 to bytes conversion

      if (sizeInKB > 24) {
        haptics.error();
        toast.error(
          `❌ Image too large: ${sizeInKB.toFixed(
            2
          )}KB. Maximum is 24KB. Please regenerate.`
        );
        return;
      }

      if (sizeInKB > 20) {
        toast.warning(
          `⚠️ Image is ${sizeInKB.toFixed(2)}KB (close to 24KB limit)`
        );
      }

      // ARCHIVED: Old v1.0 minting logic
      // await mintNFT(nft.tokenId, generatedImage.imageData);

      haptics.success();
      toast.success("NFT minted successfully!");
    } catch (err: unknown) {
      console.error("Mint error:", err);

      let errorMessage = "Failed to mint NFT";
      if (err instanceof Error) {
        const msg = err.message.toLowerCase();

        if (msg.includes("fid already minted")) {
          errorMessage =
            "Your Farcaster ID has already been used to mint a Geoplet";
        } else if (msg.includes("max supply reached")) {
          errorMessage = "All Geoplets have been minted!";
        } else if (msg.includes("image too large")) {
          errorMessage = "Image is too large (max 24KB). Please regenerate.";
        } else if (msg.includes("can only mint to yourself")) {
          errorMessage = "You can only mint to your own wallet address";
        } else if (
          msg.includes("user rejected") ||
          msg.includes("user denied")
        ) {
          errorMessage = "Transaction cancelled";
        } else if (msg.includes("empty image data")) {
          errorMessage = "Image data is empty. Please regenerate.";
        } else {
          errorMessage = err.message;
        }
      }

      haptics.error();
      toast.error(errorMessage);
    }
  };

  /**
   * Reset to original image
   */
  const handleReset = () => {
    setGeneratedImage(null);
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto bg-white/5 rounded-2xl border border-white/10 p-8 text-white text-center">
        <div className="text-4xl mb-4">🔌</div>
        <p className="text-sm text-gray-300">Connect your wallet to continue</p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-md mx-auto bg-white/5 rounded-2xl border border-white/10 p-8 text-white text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-sm text-gray-300">Loading your Warplets...</p>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <div className="max-w-md mx-auto bg-white/5 rounded-2xl border border-white/10 p-8 text-white text-center">
        <div className="text-4xl mb-4">⚠️</div>
        <h3 className="text-lg font-semibold mb-2">Error Loading Warplets</h3>
        <p className="text-sm text-red-300">{fetchError}</p>
      </div>
    );
  }

  // No Warplet for this FID
  if (!hasWarplet) {
    return (
      <div className="max-w-md mx-auto bg-white/5 rounded-2xl border border-white/10 p-8 text-white text-center space-y-4">
        <div className="text-4xl">🖼️</div>
        <div>
          <h3 className="text-lg font-semibold mb-2">No Warplet Found</h3>
          <p className="text-sm text-gray-300 mb-1">
            Your FID{fid ? ` #${fid}` : ""} doesn&apos;t have a Warplet NFT yet.
          </p>
          <p className="text-xs text-gray-400">
            Warplets use FID as token ID - you need Warplet #{fid}
          </p>
        </div>
        <Button asChild className="bg-white text-black hover:bg-gray-100">
          <a
            href={`https://opensea.io/assets/base/${process.env.NEXT_PUBLIC_WARPLETS_ADDRESS}/${fid}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on OpenSea →
          </a>
        </Button>
      </div>
    );
  }

  // Main Single NFT View - Your FID's Warplet
  if (!nft) return null;

  const displayImage = generatedImage
    ? generatedImage.imageData
    : nft.thumbnailUrl || nft.imageUrl;

  return (
    <div className="max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base sm:text-lg font-semibold text-white">
          🖼️ Your Warplet
        </h3>
        <p className="text-xs text-gray-400">FID #{fid}</p>
      </div>

      {/* Image Container */}
      <div className="relative aspect-square bg-white/5 rounded-2xl border border-white/10 p-4">
        <div className="relative w-full h-full">
          <Image
            src={displayImage}
            alt={nft.name}
            fill
            className="object-contain rounded-xl"
          />

          {/* Token ID badge */}
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg text-xs text-white/80 font-medium">
            #{nft.tokenId}
          </div>

          {/* Reset button (show when generated) */}
          {generatedImage && (
            <button
              onClick={handleReset}
              className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm hover:bg-black/80 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors touch-target"
            >
              ↺ Reset
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-2 space-y-3">
        {!generatedImage ? (
          // Transform Button (Initial State)
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full bg-white text-black hover:bg-gray-100 font-semibold text-base sm:text-lg touch-target haptic-press"
            size="lg"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2 italic ">
                <span className="animate-spin">⏳</span>
                Geofying...
              </span>
            ) : (
              "✨ Geofy"
            )}
          </Button>
        ) : (
          // Download, Share & Mint Buttons (After Generation)
          <div className="space-y-3">
            {/* Mint NFT Button (Primary Action) */}
            <Button
              onClick={handleMint}
              disabled={
                isMinting || isSuccess || alreadyMinted || checkingMintStatus
              }
              className="w-full bg-white text-black hover:bg-gray-100 font-semibold text-base sm:text-lg touch-target haptic-press disabled:opacity-50"
              size="lg"
            >
              {checkingMintStatus ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Checking...
                </span>
              ) : isMinting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Minting NFT...
                </span>
              ) : alreadyMinted ? (
                "✅ Minted"
              ) : isSuccess ? (
                "✅ Minted!"
              ) : (
                "🎨 Mint"
              )}
            </Button>

            {/* Download & Share Buttons (Secondary Actions) */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 font-semibold text-sm sm:text-base touch-target haptic-press"
                size="lg"
              >
                💾 Download
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                className="bg-white/10 text-white hover:bg-white/20 border-white/20 font-semibold text-sm sm:text-base touch-target haptic-press"
                size="lg"
              >
                🚀 Share
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="px-2 text-xs text-gray-400 text-center">
        💡 FREE during testing • Powered by OpenAI gpt-image-1
      </div>
    </div>
  );
}
