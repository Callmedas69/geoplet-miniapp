"use client";

import localFont from "next/font/local";
import { NFTGalleryGrid } from "./NFTGalleryGrid";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";
import { useWarplets } from "@/hooks/useWarplets";

const spriteGraffiti = localFont({
  src: "../public/font/SpriteGraffiti-Shadow.otf",
  display: "swap",
});

export function GallerySection() {
  const { nfts, isLoading, hasMore, loadMore, refetch } = useGalleryNFTs();
  const { fid } = useWarplets();

  return (
    <section className="max-w-7xl mx-auto">
      {/* Title */}
      <div className="text-center mb-4">
        <h1 className={`text-7xl ${spriteGraffiti.className}`}>geollery</h1>
      </div>

      {/* NFT Gallery Grid */}
      <NFTGalleryGrid
        nfts={nfts}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        userFid={fid}
      />
    </section>
  );
}
