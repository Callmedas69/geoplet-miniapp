"use client";

import { NFTGalleryGrid } from "./NFTGalleryGrid";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";

export function GallerySection() {
  const { nfts, isLoading, hasMore, loadMore } = useGalleryNFTs();

  return (
    <section className="max-w-7xl mx-auto">
      {/* Section Header - Simple text like the image */}
      <div className="mb-4">
        <h2 className="text-lg text-black font-bold underline">
          recent geofyings
        </h2>
      </div>

      {/* Gallery Grid */}
      <NFTGalleryGrid
        nfts={nfts}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </section>
  );
}
