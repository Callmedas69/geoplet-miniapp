"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { GeopletNFT } from "@/hooks/useGalleryNFTs";
import { Card } from "./ui/card";

interface NFTGalleryGridProps {
  nfts: GeopletNFT[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function NFTGalleryGrid({
  nfts,
  isLoading,
  hasMore,
  onLoadMore,
}: NFTGalleryGridProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  // Empty state
  if (nfts.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🖼️</div>
        <p className="text-gray-700 text-lg">No Geoplets minted yet</p>
        <p className="text-gray-500 text-sm mt-2">
          Be the first to transform your Warplet!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* NFT Grid - Simple blue rounded squares like the image */}
      <div className="grid grid-cols-4 gap-4">
        {nfts.map((nft) => (
          <div
            key={nft.tokenId}
            className="group relative aspect-square bg-blue-400 rounded-3xl overflow-hidden cursor-pointer hover:bg-blue-500 transition-colors"
          >
            {/* NFT Image */}
            <div className="relative w-full h-full p-2">
              <Image
                src={nft.image}
                alt={nft.name}
                fill
                className="object-contain"
                loading="lazy"
              />
            </div>

            {/* Hover overlay with token ID */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white font-semibold text-sm">#{nft.tokenId}</p>
            </div>
          </div>
        ))}

        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="aspect-square rounded-3xl animate-pulse"
            />
          ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={observerRef}
          className="h-20 flex items-center justify-center"
        >
          <p className="text-gray-600 text-sm">Loading more...</p>
        </div>
      )}

      {/* End message */}
      {!hasMore && nfts.length > 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600 text-sm">~ Geo ~</p>
        </div>
      )}
    </div>
  );
}
