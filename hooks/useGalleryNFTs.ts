'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { GEOPLET_CONFIG } from '@/lib/contracts';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const PAGE_SIZE = 20; // Alchemy default is 100, we'll use 20

export interface GeopletNFT {
  tokenId: number;
  name: string;
  image: string; // base64 data URI
  owner?: string;
}

/**
 * Hook to fetch all minted Geoplets using Alchemy NFT API with pagination
 */
export function useGalleryNFTs() {
  const [nfts, setNfts] = useState<GeopletNFT[]>([]);
  const [pageKey, setPageKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Get total supply from contract
  const { data: totalSupply } = useReadContract({
    address: GEOPLET_CONFIG.address,
    abi: GEOPLET_CONFIG.abi,
    functionName: 'totalSupply',
    chainId: GEOPLET_CONFIG.chainId,
  });

  const totalCount = totalSupply ? Number(totalSupply) : 0;

  /**
   * Fetch NFTs from Alchemy API
   */
  const fetchNFTs = useCallback(
    async (nextPageKey?: string | null) => {
      if (isLoading) return;

      setIsLoading(true);

      try {
        // Alchemy NFT API endpoint for Base Mainnet
        const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract`;
        const params = new URLSearchParams({
          contractAddress: GEOPLET_CONFIG.address,
          withMetadata: 'true',
          limit: PAGE_SIZE.toString(),
        });

        if (nextPageKey) {
          params.append('pageKey', nextPageKey);
        }

        const response = await fetch(`${baseUrl}?${params}`);
        const data = await response.json();

        if (!data.nfts || data.nfts.length === 0) {
          setHasMore(false);
          setIsLoading(false);
          return;
        }

        // Parse NFTs from Alchemy response
        const parsedNFTs: GeopletNFT[] = data.nfts.map((nft: any) => ({
          tokenId: parseInt(nft.tokenId, 16), // Alchemy returns hex
          name: nft.name || `Geoplet #${parseInt(nft.tokenId, 16)}`,
          image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '',
          owner: nft.owners?.[0] || undefined,
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
        console.error('Failed to fetch NFTs from Alchemy:', error);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading]
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
   * Initial fetch when component mounts
   */
  useEffect(() => {
    if (nfts.length === 0 && !isLoading) {
      fetchNFTs();
    }
  }, []);

  return {
    nfts,
    isLoading,
    hasMore,
    loadMore,
    totalCount,
  };
}
