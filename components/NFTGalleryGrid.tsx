"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import Image from "next/image";
import { sdk } from "@farcaster/miniapp-sdk";
import { GeopletNFT } from "@/hooks/useGalleryNFTs";
import { useUserNFTs } from "@/hooks/useUserNFTs";
import { getNFTById, GEOPLET_ADDRESS } from "@/lib/rarible";
import { GEOPLET_CONFIG } from "@/lib/contracts";
import { SHARE_CONFIG } from "@/lib/share-config";
import { ExpandableShareButton } from "./ExpandableShareButton";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";

interface NFTGalleryGridProps {
  nfts: GeopletNFT[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  userFid?: number | null; // User's FID (equals their Geoplet tokenId in 1:1 mapping)
}

/**
 * Check if image URL is a data URI
 * Data URIs start with "data:" prefix (e.g., data:image/webp;base64,...)
 */
function isDataUri(url: string): boolean {
  return url.startsWith("data:");
}

/**
 * NFT Image Component - Handles both HTTP URLs and data URIs
 * Next.js Image only supports HTTP URLs, so we use native img for data URIs
 */
function NFTImage({
  src,
  alt,
  className,
  priority = false,
  tokenId,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  tokenId?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const isData = isDataUri(src);

  const handleError = () => {
    console.error(
      `Failed to load image for ${alt}${
        tokenId ? ` (token #${tokenId})` : ""
      }:`,
      src.substring(0, 100)
    );
    setHasError(true);
  };

  // Show skeleton if empty src or error occurred
  if (!src || src.trim() === "" || hasError) {
    return (
      <div className="w-full h-full bg-amber-50/80 border border-amber-200/40 flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/60 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
      </div>
    );
  }

  // Use native img for data URIs (Next.js Image doesn't support them)
  if (isData) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        onError={handleError}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    );
  }

  // Use Next.js Image for HTTP URLs (optimized)
  return (
    <Image
      src={src}
      alt={alt}
      fill
      className={className}
      priority={priority}
      onError={handleError}
    />
  );
}

export function NFTGalleryGrid({
  nfts,
  isLoading,
  isLoadingMore = false,
  hasMore,
  onLoadMore,
  userFid,
}: NFTGalleryGridProps) {
  const observerRef = useRef<HTMLDivElement>(null);
  const { nfts: userNFTs, isConnected } = useUserNFTs();

  // Sort NFTs by token ID descending (most recent first)
  const sortedNFTs = useMemo(() => {
    return [...nfts].sort((a, b) => b.tokenId - a.tokenId);
  }, [nfts]);

  // Fetch user's Geoplet directly by FID (FID = tokenId in 1:1 mapping)
  const [myGeoplet, setMyGeoplet] = useState<GeopletNFT | null>(null);
  const cachedFidRef = useRef<number | null>(null);

  useEffect(() => {
    if (!userFid) {
      setMyGeoplet(null);
      cachedFidRef.current = null;
      return;
    }

    // KISS: Cache check - prevent refetching same NFT using ref
    if (cachedFidRef.current === userFid) {
      console.log('[FEATURED-NFT] Using cached data for FID:', userFid);
      return;
    }

    // Fetch user's specific NFT from Rarible by FID (only if not cached)
    console.log('[FEATURED-NFT] Fetching from Rarible for FID:', userFid);
    getNFTById(GEOPLET_ADDRESS, userFid.toString())
      .then(nft => {
        setMyGeoplet({
          tokenId: parseInt(nft.tokenId, 10),
          name: nft.name,
          image: nft.image,
        });
        cachedFidRef.current = userFid; // Cache the FID in ref
        console.log('[FEATURED-NFT] Fetched and cached:', {
          fid: userFid,
          tokenId: nft.tokenId,
          image: nft.image.substring(0, 100),
        });
      })
      .catch(error => {
        console.error('[FEATURED-NFT] Failed to fetch:', error);
        setMyGeoplet(null);
      });
  }, [userFid]); // Only userFid dependency - no loop!

  // Infinite scroll using Intersection Observer
  useEffect(() => {
    if (!observerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !isLoading && !isLoadingMore) {
          onLoadMore();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasMore, isLoading, isLoadingMore, onLoadMore]);

  // Share handlers - Use dynamic OG embeds
  const handleShareFarcaster = async () => {
    if (!userFid) return;

    try {
      const shareUrl = `${window.location.origin}/share/${userFid}`;

      await sdk.actions.composeCast({
        text: SHARE_CONFIG.gallery.farcaster,
        embeds: [shareUrl],
      });

      haptics.success();
      toast.success("Share window opened!");
    } catch (error) {
      console.error("Share error:", error);
      haptics.error();
      toast.error("Failed to share to Farcaster");
    }
  };

  const handleShareX = () => {
    if (!userFid) return;

    const shareUrl = `${window.location.origin}/share/${userFid}`;
    const text = SHARE_CONFIG.gallery.twitter;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(shareUrl)}`;

    const newWindow = window.open(twitterUrl, "_blank", "noopener,noreferrer");
    if (newWindow) newWindow.opener = null;
    haptics.tap();
  };

  // Marketplace link handlers - Opens in Farcaster in-app browser
  const handleOpenSea = async () => {
    if (!userFid) return;

    try {
      const url = `https://opensea.io/assets/base/${GEOPLET_CONFIG.address}/${userFid}`;
      await sdk.actions.openUrl(url);
      haptics.tap();
    } catch (error) {
      console.error("Failed to open OpenSea:", error);
      haptics.error();
      toast.error("Failed to open OpenSea");
    }
  };

  const handleOnchainChecker = async () => {
    if (!userFid) return;

    try {
      const url = `https://onchainchecker.xyz/collection/base/${GEOPLET_CONFIG.address}/${userFid}`;
      await sdk.actions.openUrl(url);
      haptics.tap();
    } catch (error) {
      console.error("Failed to open OnchainChecker:", error);
      haptics.error();
      toast.error("Failed to open OnchainChecker");
    }
  };

  // Empty state
  if (nfts.length === 0 && !isLoading) {
    return (
      <div className="text-center py-20" role="status" aria-live="polite">
        <p className="text-gray-700 text-sm">No Geoplets minted yet</p>
        <p className="text-gray-500 text-xs mt-2">
          Be the first to transform your Warplet!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-safe mt-4">
      {/* Row 1: Featured Section (Featured NFT + Info Column) */}
      <section
        aria-label="Featured Geoplet"
        className="grid gap-4 py-6 w-full"
        style={{ gridTemplateColumns: "45% 55%" }}
      >
        {/* Left: Featured "My Geoplet" Card - 2x bigger, sticky */}
        <div className="sticky top-20 z-10">
          <div className="relative w-full rounded-xl aspect-square border-2 border-dashed border-black/8 overflow-hidden">
            {myGeoplet ? (
              // Show user's NFT
              <div className="relative w-full h-full rounded-xl">
                <NFTImage
                  src={myGeoplet.image}
                  alt={myGeoplet.name}
                  className="object-contain rounded-xl"
                  priority
                  tokenId={myGeoplet.tokenId}
                />
              </div>
            ) : (
              // Show placeholder
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="text-center p-4">
                  <p className="text-black/60 text-sm mb-2">No Geoplet yet</p>
                  <p className="text-black/40 text-xs">
                    Mint yours from the Home page
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: NFT Info Column */}
        <div className="flex flex-col justify-center gap-3">
          {myGeoplet ? (
            <>
              <div>
                <p className="text-xl font-medium">{myGeoplet.name}</p>
              </div>
              <div>
                {/* NFT Marketplace Links & Share - Use FID directly since FID = tokenId (1:1 mapping) */}
                <div className="flex flex-col gap-2">
                  {/* Row 1: Marketplace Links */}
                  <div className="flex gap-1">
                    <button
                      onClick={handleOpenSea}
                      className="text-xs text-black px-3 py-1.5 flex items-center cursor-pointer"
                      aria-label="View on OpenSea"
                    >
                      <Image
                        src="/Opensea.svg"
                        alt="OpenSea"
                        width={32}
                        height={32}
                        className="shrink-0"
                      />
                    </button>
                    <button
                      onClick={handleOnchainChecker}
                      className="text-xs text-black px-3 py-1.5 flex items-center cursor-pointer"
                      aria-label="View on OnchainChecker"
                    >
                      <Image
                        src="/Onchainchecker.png"
                        alt="OnchainChecker"
                        width={32}
                        height={32}
                        className="shrink-0"
                      />
                    </button>
                  </div>
                  {/* Row 2: Expandable Share Button */}
                  <ExpandableShareButton
                    onShareFarcaster={handleShareFarcaster}
                    onShareX={handleShareX}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-black/40 text-sm italic">Geopleting....</p>
            </div>
          )}
        </div>
      </section>

      <div className="font-bold border-b border-black/8 pb-4">
        <p>Recently Geopleted</p>
      </div>

      {/* Row 2: NFT Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {/* Regular NFTs */}
        {sortedNFTs.map((nft) => (
          <div
            key={nft.tokenId}
            className="group relative aspect-square rounded-xl overflow-hidden cursor-pointer  transition-colors"
          >
            {/* NFT Image */}
            <div className="relative w-full h-full p-2">
              <NFTImage
                src={nft.image}
                alt={nft.name}
                className="object-contain rounded-xl border-1 border-gray-300 border-dashed"
                tokenId={nft.tokenId}
              />
            </div>
          </div>
        ))}

        {/* Loading skeleton */}
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="aspect-square rounded-xl bg-amber-50/80 border border-amber-200/40 overflow-hidden relative"
            >
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/60 to-transparent animate-[shimmer_2s_ease-in-out_infinite]" />
            </div>
          ))}
      </div>

      {/* Infinite scroll trigger */}
      {hasMore && (
        <div
          ref={observerRef}
          className="h-20 flex items-center justify-center"
        >
          {isLoadingMore && (
            <p className="text-gray-600 text-sm">Loading more...</p>
          )}
        </div>
      )}
    </div>
  );
}
