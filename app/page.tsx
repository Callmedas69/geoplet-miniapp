"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { MobileWalletButton } from "@/components/MobileWalletButton";
import { HeroSection } from "@/components/HeroSection";
import { GenerateMintButton } from "@/components/GenerateMintButton";
import { SuccessModal } from "@/components/SuccessModal";
import { GallerySection } from "@/components/GallerySection";
import { useWarplets } from "@/hooks/useWarplets";
import { useAccount } from "wagmi";
import { AnimateIcon } from "@/components/animate-ui/icons/icon";

export default function Home() {
  const [isSDKReady, setIsSDKReady] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

  const { isConnected } = useAccount();
  const { nft, fid, isLoading, error: fetchError, hasWarplet } = useWarplets();

  // Initialize Farcaster SDK
  useEffect(() => {
    const initSDK = async () => {
      try {
        await sdk.actions.ready();
        setIsSDKReady(true);
        console.log("Farcaster SDK initialized");
      } catch (error) {
        console.error("Failed to initialize Farcaster SDK:", error);
        // Continue anyway for development
        setIsSDKReady(true);
      }
    };

    initSDK();
  }, []);

  if (!isSDKReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fff3d6]">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#fff3d6] mobile-safe-area">
      {/* Mobile-Optimized Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">GEOPLET</h1>
          <p className="text-gray-600 text-[10px] sm:text-sm italic">
            when geo meet warplets
          </p>
        </div>
        <MobileWalletButton />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8 px-4 pb-safe">
        {/* State-based rendering */}
        {!isConnected ? (
          <div className="max-w-md mx-auto p-8 text-black/80 text-center my-8">
            <div className="text-4xl mb-4">
              <AnimateIcon animateOnHover className="w-4 h-4">
                🔗
              </AnimateIcon>
            </div>
            <p className="text-[10px] sm:text-sm italic">connect...</p>
          </div>
        ) : isLoading ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-black p-8 text-black text-center my-8">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-sm">Loading your Warplets...</p>
          </div>
        ) : fetchError ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-black p-8 text-black text-center my-8">
            <div className="text-4xl mb-4">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">
              Error Loading Warplets
            </h3>
            <p className="text-sm text-red-600">{fetchError}</p>
          </div>
        ) : !hasWarplet || !nft ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl border-2 border-black p-8 text-black text-center space-y-4 my-8">
            <div className="text-4xl">🖼️</div>
            <div>
              <h3 className="text-lg font-semibold mb-2">No Warplet Found</h3>
              <p className="text-sm mb-1">
                Your FID{fid ? ` #${fid}` : ""} doesn&apos;t have a Warplet NFT
                yet.
              </p>
              <p className="text-xs text-gray-600">
                Warplets use FID as token ID - you need Warplet #{fid}
              </p>
            </div>
            <a
              href={`https://opensea.io/assets/base/${process.env.NEXT_PUBLIC_WARPLETS_ADDRESS}/${fid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-black text-white hover:bg-gray-800 px-4 py-2 rounded-lg font-medium"
            >
              View on OpenSea →
            </a>
          </div>
        ) : (
          <>
            {/* Hero Section - 2 Grid Layout */}
            <div className="my-4">
              <HeroSection
                warpletImage={nft.thumbnailUrl || nft.imageUrl}
                warpletTokenId={nft.tokenId}
                generatedImage={generatedImage}
              />
            </div>

            {/* Generate & Mint Button */}
            <div className="flex justify-center my-4">
              <GenerateMintButton
                generatedImage={generatedImage}
                onGenerate={setGeneratedImage}
                onSuccess={(hash, tokenId) => {
                  setMintTxHash(hash);
                  setMintedTokenId(tokenId);
                  setShowSuccessModal(true);
                }}
              />
            </div>
          </>
        )}

        {/* Gallery Section - Always show */}
        <div className="my-8">
          <GallerySection />
        </div>
      </main>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          // Reset generated image after modal closes
          setGeneratedImage(null);
        }}
        image={generatedImage}
        txHash={mintTxHash}
        tokenId={mintedTokenId}
      />

      {/* Footer */}
      <footer className="mt-4 mb-safe text-center text-gray-500 text-[8px] sm:text-sm py-4 italic">
        <p>
          Powered by $GEOPLET • Build by GeoArt.Studio •{" "}
          <a
            href="https://onchain.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black"
          >
            Onchain.fi x402
          </a>
        </p>
      </footer>
    </div>
  );
}
