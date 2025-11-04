"use client";

/**
 * Gallery Page
 *
 * Dedicated page for browsing Geoplet NFTs
 * - Two tabs: "All" (entire collection) and "My NFTs" (user's NFTs)
 * - Mobile-safe layout with bottom navigation
 * - Same header structure as main page
 */

import { MobileWalletButton } from "@/components/MobileWalletButton";
import { GallerySection } from "@/components/GallerySection";

export default function GalleryPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#fff3d6] mobile-safe-area">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-black">GEOPLET</h1>
          <p className="text-gray-600 text-[10px] sm:text-sm italic">
            when geo meet warplets
          </p>
        </div>
        <MobileWalletButton />
      </header>

      {/* Main Content - Gallery with tabs */}
      <main className="flex-1 flex flex-col px-4 pb-20">
        <GallerySection />
      </main>

      {/* Footer */}
      <footer className="mt-4 mb-safe text-center text-gray-500 text-[10px] sm:text-sm py-4 italic pb-20">
        <p>
          Powered by $GEOPLET • Build by GeoArt.Studio •{" "}
          <a
            href="https://onchain.fi"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-black"
          >
            onchain.fi
          </a>
        </p>
      </footer>
    </div>
  );
}
