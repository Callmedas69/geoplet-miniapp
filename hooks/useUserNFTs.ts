'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import { GeopletsABI } from '@/abi/GeopletsABI';
import type { GeopletNFT } from './useGalleryNFTs';

/**
 * Alchemy API NFT response structure (API V3)
 * @see https://docs.alchemy.com/reference/getnftsforowner
 * Note: Alchemy V3 returns tokenId as decimal strings, not hex
 */
interface AlchemyNFT {
  tokenId: string; // decimal string format (e.g., "100", "22420") - Alchemy V3 API standard
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

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

/**
 * Decode base64 tokenURI from contract to extract image
 * Browser-compatible (uses atob instead of Buffer)
 */
function decodeTokenURI(tokenURIString: string): string | null {
  try {
    // Contract returns: "data:application/json;base64,eyJ..."
    if (!tokenURIString.includes('data:application/json;base64,')) {
      return null;
    }

    const base64String = tokenURIString.split('data:application/json;base64,')[1];
    if (!base64String) return null;

    // Decode base64 (browser-native)
    const jsonString = atob(base64String);
    const metadata = JSON.parse(jsonString);

    return metadata.image || null;
  } catch (error) {
    console.error('[User NFTs] Failed to decode tokenURI:', error);
    return null;
  }
}

/**
 * Hook to fetch NFTs owned by the connected wallet
 * With contract fallback for uncached metadata
 */
export function useUserNFTs() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
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
        // Step 1: Parse all NFTs and identify which need contract fallback
        const nftsWithMetadata = await Promise.all(
          data.ownedNfts.map(async (nft: AlchemyNFT) => {
            // Parse tokenId as decimal (Alchemy V3 returns decimal strings)
            const tokenId = parseInt(nft.tokenId, 10);

            // Validate parsed tokenId
            if (isNaN(tokenId) || tokenId < 0) {
              console.error(`[User NFTs] Invalid tokenId from Alchemy: "${nft.tokenId}"`);
              return null;
            }

            let image = nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '';

            // Step 2: If Alchemy has no metadata, read from contract directly
            if ((!image || image.trim() === '') && publicClient) {
              console.log(`[User NFTs] ⚠️ Token #${tokenId} has NO Alchemy metadata, reading from contract...`);

              try {
                const tokenURI = await publicClient.readContract({
                  address: GEOPLET_CONFIG.address as `0x${string}`,
                  abi: GeopletsABI,
                  functionName: 'tokenURI',
                  args: [BigInt(tokenId)],
                }) as string;

                if (tokenURI) {
                  const decodedImage = decodeTokenURI(tokenURI);
                  if (decodedImage) {
                    image = decodedImage;
                    console.log(`[User NFTs] ✅ Token #${tokenId} fetched from contract: ${image.substring(0, 50)}...`);
                  }
                }
              } catch (error) {
                console.error(`[User NFTs] Failed to read tokenURI for #${tokenId}:`, error);
              }
            }

            // Step 3: Final validation - filter out if still no image
            if (!image || image.trim() === '') {
              console.warn(`[User NFTs] ❌ Token #${tokenId} has NO image even after contract read, filtering out`);
              return null;
            }

            // Log image type
            if (image.startsWith('data:')) {
              console.log(`[User NFTs] ✅ Token #${tokenId} using data URI`);
            } else {
              console.log(`[User NFTs] ✅ Token #${tokenId} using HTTP URL`);
            }

            return {
              tokenId,
              name: nft.name || `Geoplet #${tokenId}`,
              image,
              owner: address,
            };
          })
        );

        // Filter out null entries
        const parsedNFTs = nftsWithMetadata.filter((nft): nft is GeopletNFT => nft !== null);

        console.log(`[User NFTs] Final result: ${parsedNFTs.length} valid NFTs (removed ${data.ownedNfts.length - parsedNFTs.length} invalid)`);
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
  }, [address, isConnected, publicClient]);

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
