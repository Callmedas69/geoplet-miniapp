"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { GEOPLET_CONFIG } from "@/lib/contracts";

interface SharePageClientProps {
  params: Promise<{ fid: string }>;
}

export default function SharePageClient({ params }: SharePageClientProps) {
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const { fid } = await params;

      try {
        // Check if FID is minted
        const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}/getNFTMetadata`;
        const urlParams = new URLSearchParams({
          contractAddress: GEOPLET_CONFIG.address,
          tokenId: fid,
          refreshCache: "false",
        });

        const response = await fetch(`${baseUrl}?${urlParams}`);
        const data = await response.json();

        // If not minted, redirect to home
        if (!data.image) {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to check mint status:", error);
        router.push("/");
      }
    };

    checkAndRedirect();
  }, [params, router]);

  return (
    <div className="min-h-screen bg-[#f3daa1] flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h1 className="text-6xl font-bold text-black">🎨</h1>
        <h2 className="text-3xl font-bold text-black">Geoplet Minted!</h2>
        <p className="text-lg text-black/80">
          Open in Farcaster to view this Geoplet NFT
        </p>
        <button
          onClick={() => router.push("/")}
          className="px-8 py-4 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors"
        >
          Open App
        </button>
      </div>
    </div>
  );
}
