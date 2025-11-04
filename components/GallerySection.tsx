"use client";

import { NFTGalleryGrid } from "./NFTGalleryGrid";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";
import { useWarplets } from "@/hooks/useWarplets";
import { Button } from "./ui/button";
import { GEOPLET_CONFIG } from "@/lib/contracts";

export function GallerySection() {
  const { fid } = useWarplets();
  const { nfts, isLoading, hasMore, loadMore } = useGalleryNFTs();

  return (
    <section className="max-w-7xl mx-auto">
      {/* Action Buttons Row */}
      <div className="flex gap-2 my-4">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-1 bg-transparent border-0"
        >
          <a
            href={`${GEOPLET_CONFIG.explorers.opensea}/${GEOPLET_CONFIG.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center underline"
          >
            OpenSea
          </a>
        </Button>
        <Button
          variant="outline"
          size="sm"
          asChild
          className="flex-1 bg-transparent border-0"
        >
          <a
            href={`https://onchainchecker.xyz/collection/base/${
              GEOPLET_CONFIG.address
            }/${fid || ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center underline"
          >
            OnchainChecker
          </a>
        </Button>
      </div>

      {/* NFT Gallery Grid */}
      <NFTGalleryGrid
        nfts={nfts}
        isLoading={isLoading}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
    </section>
  );
}
