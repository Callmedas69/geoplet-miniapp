"use client";

import { NFTGalleryGrid } from "./NFTGalleryGrid";
import { useGalleryNFTs } from "@/hooks/useGalleryNFTs";
import { useWarplets } from "@/hooks/useWarplets";
import { GEOPLET_CONFIG } from "@/lib/contracts";
import Image from "next/image";

export function GallerySection() {
  const { fid } = useWarplets();
  const { nfts, isLoading, hasMore, loadMore } = useGalleryNFTs();

  return (
    <section className="max-w-7xl mx-auto">
      {/* Action Links Row */}
      <div className="flex gap-2 my-4">
        <a
          href={`${GEOPLET_CONFIG.explorers.opensea}/${GEOPLET_CONFIG.address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <Image
            src="/Opensea.svg"
            alt="OpenSea"
            width={20}
            height={20}
          />
        </a>
        <a
          href={`https://onchainchecker.xyz/collection/base/${
            GEOPLET_CONFIG.address
          }/${fid || ""}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <Image
            src="/Onchainchecker.png"
            alt="OnchainChecker"
            width={20}
            height={20}
          />
        </a>
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
