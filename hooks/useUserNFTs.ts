'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import type { GeopletNFT } from './useGalleryNFTs';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const PAGE_SIZE = 20;

interface AlchemyNFT {
  tokenId: string;
  name?: string;
  image?: {
    cachedUrl?: string;
    originalUrl?: string;
  };
  raw?: {
    metadata?: {
      image?: string;
    };
  };
}

/**
 * Hook to fetch NFTs owned by the connected wallet address
 * Uses Alchemy's getNFTsForOwner endpoint filtered by Geoplet contract
 */
export function useUserNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<GeopletNFT[]>([]);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  /**
   * Fetch user's NFTs from Alchemy API
   */
  const fetchNFTs = useCallback(
    async (nextPageKey?: string | null) => {
      if (!address || !isConnected || isLoading) return;

      setIsLoading(true);

      try {
        // Alchemy NFT API endpoint for Base Mainnet
        const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner`;
        const params = new URLSearchParams({
          owner: address,
          'contractAddresses[]': GEOPLET_CONFIG.address,
          withMetadata: 'true',
          limit: PAGE_SIZE.toString(),
        });

        if (nextPageKey) {
          params.append('pageKey', nextPageKey);
        }

        const response = await fetch(`${baseUrl}?${params}`);
        const data = await response.json();

        if (!data.ownedNfts || data.ownedNfts.length === 0) {
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        // Parse NFTs from Alchemy response
        const parsedNFTs: GeopletNFT[] = data.ownedNfts.map((nft: AlchemyNFT) => ({
          tokenId: parseInt(nft.tokenId, 16), // Alchemy returns hex
          name: nft.name || `Geoplet #${parseInt(nft.tokenId, 16)}`,
          image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '',
          owner: address,
        }));

        // Add to existing NFTs (filter duplicates)
        setNfts((prev) => {
          const existingIds = new Set(prev.map(n => n.tokenId));
          const newNFTs = parsedNFTs.filter(nft => !existingIds.has(nft.tokenId));
          return [...prev, ...newNFTs];
        });

        // Update pagination
        if (data.pageKey) {
          setPageKey(data.pageKey);
          setHasMore(true);
        } else {
          setPageKey(null);
          setHasMore(false);
        }
      } catch (error) {
        console.error('Failed to fetch user NFTs from Alchemy:', error);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [address, isConnected, isLoading]
  );

  /**
   * Load more NFTs (triggered by infinite scroll)
   */
  const loadMore = useCallback(() => {
    if (!isLoading && hasMore && pageKey) {
      fetchNFTs(pageKey);
    }
  }, [isLoading, hasMore, pageKey, fetchNFTs]);

  /**
   * Reset NFTs when address changes or disconnects
   */
  useEffect(() => {
    setNfts([]);
    setPageKey(null);
    setHasMore(true);
  }, [address]);

  /**
   * Initial fetch when component mounts or address changes
   */
  useEffect(() => {
    if (isConnected && address && nfts.length === 0 && !isLoading) {
      fetchNFTs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  return {
    nfts,
    isLoading,
    hasMore,
    loadMore,
    isConnected,
  };
}
