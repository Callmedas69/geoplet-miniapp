"use client";

import { useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { GeopletNFT } from "@/hooks/useGalleryNFTs";
import { Card } from "./ui/card";
import { useUserNFTs } from "@/hooks/useUserNFTs";

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
  const { nfts: userNFTs, isConnected } = useUserNFTs();

  // Sort NFTs by token ID descending (most recent first)
  const sortedNFTs = useMemo(() => {
    return [...nfts].sort((a, b) => b.tokenId - a.tokenId);
  }, [nfts]);

  // Get user's Geoplet (each user only has 1)
  const myGeoplet = useMemo(() => {
    return isConnected && userNFTs.length > 0 ? userNFTs[0] : null;
  }, [isConnected, userNFTs]);

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
    <div className="space-y-6 mb-safe mt-4">
      {/* Row 1: Featured Section (Featured NFT + Info Column) */}
      <div className="grid grid-cols-2 gap-4 pb-6 border-b border-black/8">
        {/* Left: Featured "My Geoplet" Card - 2x bigger, sticky */}
        <div className="sticky top-20 z-10">
          <div className="relative w-full aspect-square border-2 border-dashed border-black/8 rounded-3xl overflow-hidden p-4">
            {myGeoplet ? (
              // Show user's NFT
              <div className="relative w-full h-full">
                <Image
                  src={myGeoplet.image}
                  alt={myGeoplet.name}
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            ) : (
              // Show placeholder
              <div className="relative w-full h-full flex items-center justify-center">
                <p className="text-black/40 text-xs italic text-center">
                  Your Geoplet here
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: NFT Info Column */}
        <div className="flex flex-col justify-center gap-3">
          {myGeoplet ? (
            <>
              <div>
                <p className="text-black/50 text-xs uppercase tracking-wide mb-1">
                  Name
                </p>
                <p className="text-black text-lg font-medium">
                  {myGeoplet.name}
                </p>
              </div>
              <div>
                <p className="text-black/50 text-xs uppercase tracking-wide mb-1">
                  Token ID
                </p>
                <p className="text-black text-lg font-medium">
                  #{myGeoplet.tokenId}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-black/40 text-sm italic">geofying....</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Pure 4-Column NFT Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Regular NFTs */}
        {sortedNFTs.map((nft) => (
          <div
            key={nft.tokenId}
            className="group relative aspect-square  rounded-xl overflow-hidden cursor-pointer hover:bg-blue-500 transition-colors"
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
