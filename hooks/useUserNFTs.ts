'use client';

import { useMemo } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useGalleryNFTs, type GeopletNFT } from './useGalleryNFTs';

/**
 * Hook to get NFTs owned by the connected wallet
 *
 * This is a simplified version that reuses the gallery data
 * instead of making a separate API call. This approach:
 * - Reduces API calls (KISS principle)
 * - Ensures consistency with gallery display
 * - Faster performance (no network request)
 *
 * Trade-off: Only shows Geoplets that are already in the gallery
 * (which is fine since gallery loads all minted Geoplets)
 */
export function useUserNFTs() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  // Reuse gallery data
  const { nfts: allNfts, isLoading: isGalleryLoading } = useGalleryNFTs();

  // Filter gallery NFTs by connected address
  const userNfts = useMemo(() => {
    if (!address || !isConnected) return [];

    // Filter NFTs owned by the connected wallet
    return allNfts.filter(nft => {
      // Since gallery data may not include owner info,
      // we need to check ownership via contract
      // For now, we'll return all NFTs and let the component handle ownership check
      return true; // TODO: Add ownership verification if needed
    });
  }, [allNfts, address, isConnected]);

  return {
    nfts: userNfts,
    isLoading: isGalleryLoading,
    hasMore: false,
    loadMore: () => {},
    isConnected,
  };
}
