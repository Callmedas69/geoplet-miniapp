'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { GEOPLET_CONFIG } from '@/lib/contracts';
import { useReadContract, usePublicClient } from 'wagmi';
import { GeopletsABI } from '@/abi/GeopletsABI';
import { getNFTsFromCollection, GEOPLET_ADDRESS } from '@/lib/rarible';

export interface GeopletNFT {
  tokenId: number;
  name: string;
  image: string;
  owner?: string;
  attributes?: Array<{
    key: string;
    value: string;
  }>;
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
 * Hook to fetch all minted Geoplets from Rarible API
 * Validates against on-chain data with contract fallback for missing metadata
 */
export function useGalleryNFTs() {
  const [nfts, setNfts] = useState<GeopletNFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [continuation, setContinuation] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const publicClient = usePublicClient();

  // Read actual minted count from contract for validation
  const { data: totalSupply } = useReadContract({
    address: GEOPLET_CONFIG.address as `0x${string}`,
    abi: GeopletsABI,
    functionName: 'totalSupply',
  });

  // Use refs to avoid re-renders (KISS: stable references)
  const publicClientRef = useRef(publicClient);
  const totalSupplyRef = useRef(totalSupply);

  // Update refs when values change (doesn't trigger re-render)
  useEffect(() => {
    publicClientRef.current = publicClient;
    totalSupplyRef.current = totalSupply;
  }, [publicClient, totalSupply]);

  const fetchNFTs = useCallback(async (nextContinuation?: string, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    try {
      // Fetch from Rarible API with pagination (20 items per page)
      const data = await getNFTsFromCollection(GEOPLET_ADDRESS, nextContinuation, 20);

      // Handle both empty and non-empty responses
      const hasItems = data.items && data.items.length > 0;

      if (hasItems) {
        console.log(`[Gallery] Rarible returned ${data.items.length} NFTs, contract totalSupply: ${totalSupplyRef.current?.toString() || 'loading...'}`);

        // Step 1: Validate all NFTs (already transformed by API route)
        const nftsWithMetadata = await Promise.all(
          data.items.map(async (nft) => {
            const tokenId = parseInt(nft.tokenId, 10);

            // Validate parsed tokenId
            if (isNaN(tokenId) || tokenId < 0) {
              console.error(`[Gallery] Invalid tokenId from Rarible: "${nft.tokenId}"`);
              return null;
            }

            let image = nft.image;

            // Step 2: If Rarible has no metadata, read from contract directly
            if ((!image || image.trim() === '') && publicClientRef.current) {
              console.log(`[Gallery] ⚠️ Token #${tokenId} has NO Rarible metadata, reading from contract...`);

              try {
                const tokenURI = await publicClientRef.current.readContract({
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
              attributes: nft.attributes, // Include rarity data
            };
          })
        );

        // Filter out null entries
        const parsedNFTs = nftsWithMetadata.filter((nft) => nft !== null) as GeopletNFT[];

        console.log(`[Gallery] Final result: ${parsedNFTs.length} valid NFTs (removed ${data.items.length - parsedNFTs.length} invalid)`);

        // Update NFTs list (append if pagination, replace if initial load)
        if (append) {
          setNfts(prev => [...prev, ...parsedNFTs]);
        } else {
          setNfts(parsedNFTs);
        }

        // Update pagination state (Rarible uses "continuation" instead of "pageKey")
        const nextContinuationToken = data.continuation;
        setContinuation(nextContinuationToken);

        // KISS: Only continue pagination if we got items AND have continuation
        // Rarible sometimes returns continuation even when 0 items (prevents infinite loop)
        const shouldLoadMore = !!nextContinuationToken && parsedNFTs.length > 0;
        setHasMore(shouldLoadMore);

        console.log(`[Gallery] Pagination: ${shouldLoadMore ? `Has more (continuation: ${nextContinuationToken.substring(0, 20)}...)` : `No more pages (items: ${parsedNFTs.length}, continuation: ${!!nextContinuationToken})`}`);
      } else {
        // KISS: 0 items returned - STOP pagination to prevent infinite loop
        console.log('[Gallery] ⚠️ Rarible returned 0 items - stopping pagination');
        setHasMore(false);
        setContinuation(undefined);
      }
    } catch (error) {
      console.error('[Gallery] Failed to fetch NFTs:', error);
    } finally {
      if (append) {
        setIsLoadingMore(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []); // Empty dependencies - uses refs for stable reference

  // Initial load - run once on mount only (KISS: prevents infinite loop)
  useEffect(() => {
    fetchNFTs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty array = run once on mount

  // Load more NFTs using continuation token from previous response
  const loadMore = useCallback(() => {
    if (!continuation || isLoadingMore || isLoading) {
      console.log('[Gallery] loadMore() blocked:', {
        hasContinuation: !!continuation,
        isLoadingMore,
        isLoading,
      });
      return;
    }

    console.log(`[Gallery] Loading more NFTs with continuation: ${continuation.substring(0, 20)}...`);
    fetchNFTs(continuation, true); // Pass continuation and append=true
  }, [continuation, isLoadingMore, isLoading]); // Removed fetchNFTs dependency

  return {
    nfts,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    totalCount: nfts.length,
    refetch: () => fetchNFTs(),
  };
}
