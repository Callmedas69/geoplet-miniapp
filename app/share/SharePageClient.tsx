"use client";

/**
 * General Share Landing Page Client Component
 *
 * Purpose: Web-to-app bridge for general Geoplet sharing (no specific NFT)
 * When users visit this page on mobile/desktop browser, they can open Farcaster app
 */
export default function SharePageClient() {
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
        <h2 className="text-3xl font-bold text-black">Welcome to Geoplet</h2>

        <p className="text-lg text-black/80">
          Art that deploys like code, preserved forever on-chain
        </p>

        <p className="text-base text-black/70">
          Open in Farcaster to start transforming your Warplets into geometric masterpieces
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
