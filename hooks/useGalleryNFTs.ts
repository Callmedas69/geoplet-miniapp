'use client';

import { useState, useEffect, useCallback } from 'react';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import { useReadContract, usePublicClient } from 'wagmi';
import { GeopletsABI } from '@/abi/GeopletsABI';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export interface GeopletNFT {
  tokenId: number;
  name: string;
  image: string;
  owner?: string;
}

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
    console.error('[Gallery] Failed to decode tokenURI:', error);
    return null;
  }
}

/**
 * Alchemy API NFT response structure (API V3)
 * @see https://docs.alchemy.com/reference/getnftsforcontract-v3
 * Note: Alchemy V3 returns tokenId as decimal strings, not hex
 * @see https://www.alchemy.com/docs/reference/alchemy-sdk-v2-to-v3-migration-guide
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

/**
 * Hook to fetch all minted Geoplets from Alchemy
 * Validates against on-chain data to filter out stale cache
 */
export function useGalleryNFTs() {
  const [nfts, setNfts] = useState<GeopletNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const publicClient = usePublicClient();

  // Read actual minted count from contract to detect stale Alchemy cache
  const { data: totalSupply } = useReadContract({
    address: GEOPLET_CONFIG.address as `0x${string}`,
    abi: GeopletsABI,
    functionName: 'totalSupply',
  });

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
        console.log(`[Gallery] Alchemy returned ${data.nfts.length} NFTs, contract totalSupply: ${totalSupply?.toString() || 'loading...'}`);

        // Step 1: Parse all NFTs and identify which need contract fallback
        const nftsWithMetadata = await Promise.all(
          data.nfts.map(async (nft: AlchemyNFT) => {
            // Parse tokenId as decimal (Alchemy V3 returns decimal strings)
            const tokenId = parseInt(nft.tokenId, 10);

            // Validate parsed tokenId
            if (isNaN(tokenId) || tokenId < 0) {
              console.error(`[Gallery] Invalid tokenId from Alchemy: "${nft.tokenId}"`);
              return null;
            }

            let image = nft.image?.cachedUrl || nft.image?.originalUrl || nft.raw?.metadata?.image || '';

            // Step 2: If Alchemy has no metadata, read from contract directly
            if ((!image || image.trim() === '') && publicClient) {
              console.log(`[Gallery] ⚠️ Token #${tokenId} has NO Alchemy metadata, reading from contract...`);

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
                    console.log(`[Gallery] ✅ Token #${tokenId} fetched from contract: ${image.substring(0, 50)}...`);
                  }
                }
              } catch (error) {
                console.error(`[Gallery] Failed to read tokenURI for #${tokenId}:`, error);
              }
            }

            // Step 3: Final validation - filter out if still no image
            if (!image || image.trim() === '') {
              console.warn(`[Gallery] ❌ Token #${tokenId} has NO image even after contract read, filtering out`);
              return null;
            }

            // Log image type
            if (image.startsWith('data:')) {
              console.log(`[Gallery] ✅ Token #${tokenId} using data URI`);
            } else {
              console.log(`[Gallery] ✅ Token #${tokenId} using HTTP URL`);
            }

            return {
              tokenId,
              name: nft.name || `Geoplet #${tokenId}`,
              image,
            };
          })
        );

        // Filter out null entries
        const parsedNFTs = nftsWithMetadata.filter((nft): nft is GeopletNFT => nft !== null);

        console.log(`[Gallery] Final result: ${parsedNFTs.length} valid NFTs (removed ${data.nfts.length - parsedNFTs.length} invalid)`);
        setNfts(parsedNFTs);
      }
    } catch (error) {
      console.error('Failed to fetch NFTs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [totalSupply, publicClient]);

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
