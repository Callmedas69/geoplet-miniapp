'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import type { GeopletNFT } from './useGalleryNFTs';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

/**
 * Hook to fetch NFTs owned by the connected wallet
 * Simple approach: Let Alchemy handle everything
 */
export function useUserNFTs() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<GeopletNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchUserNFTs = useCallback(async () => {
    if (!address || !isConnected) return;

    setIsLoading(true);
    try {
      const baseUrl = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}/getNFTsForOwner`;
      const params = new URLSearchParams({
        owner: address,
        'contractAddresses[]': GEOPLET_CONFIG.address,
        withMetadata: 'true',
        refreshCache: 'true',
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.ownedNfts && data.ownedNfts.length > 0) {
        const parsedNFTs: GeopletNFT[] = data.ownedNfts.map((nft: any) => ({
          tokenId: parseInt(nft.tokenId, 16),
          name: nft.name || `Geoplet #${parseInt(nft.tokenId, 16)}`,
          image: nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '',
          owner: address,
        }));

        setNfts(parsedNFTs);
      } else {
        setNfts([]);
      }
    } catch (error) {
      console.error('Failed to fetch user NFTs:', error);
      setNfts([]);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected]);

  useEffect(() => {
    if (address && isConnected) {
      fetchUserNFTs();
    } else {
      setNfts([]);
    }
  }, [address, isConnected, fetchUserNFTs]);

  return {
    nfts,
    isLoading,
    hasMore: false,
    loadMore: () => {},
    isConnected,
  };
}
