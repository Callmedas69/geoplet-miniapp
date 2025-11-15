"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  getNFTById,
  transformRaribleItem,
  GEOPLET_ADDRESS,
} from "@/lib/rarible";

interface SharePageClientProps {
  params: Promise<{ fid: string }>;
}

export default function SharePageClient({ params }: SharePageClientProps) {
  const router = useRouter();

  useEffect(() => {
    const checkAndRedirect = async () => {
      const { fid } = await params;

      try {
        // Fetch NFT metadata from Rarible
        const data = await getNFTById(GEOPLET_ADDRESS, fid);
        const nft = transformRaribleItem(data);

        // If not minted (no image), redirect to home
        if (!nft.image) {
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to check mint status:", error);
        router.push("/");
      }
    };

    checkAndRedirect();
  }, [params, router]);

  /**
   * Open the official Farcaster Miniapp using Universal Link.
   * Mobile  → opens Farcaster app automatically.
   * Browser → opens miniapp drawer.
   */
  const openMiniApp = () => {
    window.location.href =
      "https://farcaster.xyz/miniapps/qSFv2sErypbU/geoplet";
  };

  return (
    <div className="min-h-screen bg-[#f3daa1] flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-6">
        <h2 className="text-3xl font-bold text-black">Geoplet Minted!</h2>

        <p className="text-lg text-black/80">
          Open in Farcaster to view this Geoplet NFT
        </p>

        <button
          onClick={openMiniApp}
          className="px-8 py-4 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors"
        >
          Open App
        </button>
      </div>
    </div>
  );
}
