"use client";

interface SharePageClientProps {
  params: Promise<{ fid: string }>;
}

export default function SharePageClient({ params }: SharePageClientProps) {
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
        <h2 className="text-3xl font-bold text-black">
          Your Geoplet is Waiting! 🎨
        </h2>

        <p className="text-lg text-black/80">
          Your personalized Geoplet has been generated and is ready to mint.
          Open the app to claim yours!
        </p>

        <button
          onClick={openMiniApp}
          className="px-8 py-4 bg-black text-white rounded-lg font-medium hover:bg-black/90 transition-colors"
        >
          Mint Your Geoplet
        </button>

        <p className="text-sm text-black/60">
          When geometric art meets Warplet — your unique GeoTizen awaits ✨
        </p>
      </div>
    </div>
  );
}
