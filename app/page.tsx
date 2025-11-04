"use client";

import { useEffect, useState } from "react";
import { sdk } from "@farcaster/miniapp-sdk";
import { HeroSection } from "@/components/HeroSection";
import { GenerateMintButton } from "@/components/GenerateMintButton";
import { SuccessModal } from "@/components/SuccessModal";
import { useWarplets } from "@/hooks/useWarplets";

export default function Home() {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mintTxHash, setMintTxHash] = useState<string | null>(null);
  const [mintedTokenId, setMintedTokenId] = useState<string | null>(null);

  const { nft } = useWarplets();

  // Initialize Farcaster SDK
  useEffect(() => {
    sdk.actions.ready().catch(console.error);
  }, []);

  return (
    <>
      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-8 px-4 pb-20">
        {/* Hero Section */}
        <div className="my-4">
          <HeroSection
            warpletImage={nft?.thumbnailUrl || nft?.imageUrl || null}
            warpletTokenId={nft?.tokenId || null}
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
      </main>

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => {
          setShowSuccessModal(false);
          setGeneratedImage(null);
        }}
        image={generatedImage}
        txHash={mintTxHash}
        tokenId={mintedTokenId}
      />
    </>
  );
}
