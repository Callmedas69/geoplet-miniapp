'use client';

import { useState, useEffect, useCallback } from 'react';
import { GEOPLET_CONFIG } from '@/lib/contracts';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export interface GeopletNFT {
  tokenId: number;
  name: string;
  image: string;
  owner?: string;
}

/**
 * Alchemy API NFT response structure
 * Only includes fields we actually use
 */
interface AlchemyNFT {
  tokenId: string; // hex format
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
 * Hook to fetch all minted Geoplets from Alchemy
 * Simple approach: Let Alchemy handle everything
 */
export function useGalleryNFTs() {
  const [nfts, setNfts] = useState<GeopletNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNFTs = useCallback(async () => {
    setIsLoading(true);
    try {
      const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForContract`;
      const params = new URLSearchParams({
        contractAddress: GEOPLET_CONFIG.address,
        withMetadata: 'true',
        refreshCache: 'true',
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.nfts && data.nfts.length > 0) {
        const parsedNFTs: GeopletNFT[] = data.nfts.map((nft: AlchemyNFT) => ({
          tokenId: parseInt(nft.tokenId, 16),
          name: nft.name || `Geoplet #${parseInt(nft.tokenId, 16)}`,
          image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '',
        }));

        setNfts(parsedNFTs);
      }
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return {
    nfts,
    isLoading,
    hasMore: false,
    loadMore: () => {},
    totalCount: nfts.length,
    refetch: fetchNFTs,
  };
}
