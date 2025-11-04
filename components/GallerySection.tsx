"use client";

import { useState } from "react";
import { NFTGalleryGrid } from "./NFTGalleryGrid";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";
import { useUserNFTs } from "@/hooks/useUserNFTs";

type TabType = "all" | "myNFTs";

export function GallerySection() {
  const [activeTab, setActiveTab] = useState<TabType>("all");

  // Fetch data for both tabs
  const allNFTs = useGalleryNFTs();
  const userNFTs = useUserNFTs();

  // Select active data source based on tab
  const activeData = activeTab === "all" ? allNFTs : userNFTs;
  const { nfts, isLoading, hasMore, loadMore } = activeData;

  return (
    <section className="max-w-7xl mx-auto">
      {/* Section Header with Tabs */}
      <div className="mb-4">
        <h2 className="text-lg text-black font-bold underline mb-3">
          recent geofyings
        </h2>

        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-black/10">
          <button
            onClick={() => setActiveTab("all")}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${
                activeTab === "all"
                  ? "text-black border-b-2 border-black"
                  : "text-black/50 hover:text-black/70"
              }
            `}
            aria-current={activeTab === "all" ? "page" : undefined}
          >
            All
          </button>
          <button
            onClick={() => setActiveTab("myNFTs")}
            className={`
              px-4 py-2 text-sm font-medium transition-colors
              ${
                activeTab === "myNFTs"
                  ? "text-black border-b-2 border-black"
                  : "text-black/50 hover:text-black/70"
              }
            `}
            aria-current={activeTab === "myNFTs" ? "page" : undefined}
          >
            My NFTs
          </button>
        </div>
      </div>

      {/* Conditional Content Based on Tab */}
      {activeTab === "myNFTs" && !userNFTs.isConnected ? (
        <div className="text-center py-12 text-black/60">
          <p className="text-sm">Connect your wallet to view your NFTs</p>
        </div>
      ) : (
        <NFTGalleryGrid
          nfts={nfts}
          isLoading={isLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      )}
    </section>
  );
}
