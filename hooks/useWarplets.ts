import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { getNFTById, transformRaribleItem, WARPLET_ADDRESS } from '@/lib/rarible';

export interface WarpletNFT {
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  thumbnailUrl?: string;
  contract: {
    address: string;
    name: string;
  };
}

export function useWarplets() {
  const { isConnected } = useAccount();
  const [nft, setNft] = useState<WarpletNFT | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected) {
      setNft(null);
      setError(null);
      setFid(null);
      return;
    }

    const fetchWarpletByFID = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get FID from Farcaster SDK context
        const context = await sdk.context;

        // Add null check for context and user
        if (!context || !context.user || !context.user.fid) {
          throw new Error('Unable to get Farcaster ID. Please ensure you are using this app within Farcaster.');
        }

        // Retrieve FID (Farcaster ID) from SDK context
        // This FID is used throughout the app as the user's unique identifier
        // In Geoplet contract: FID = tokenId (1:1 mapping)
        const userFid = context.user.fid;
        setFid(userFid);

        if (!userFid) {
          throw new Error('Unable to get Farcaster ID');
        }

        // Fetch Warplet NFT metadata from Rarible API
        try {
          const data = await getNFTById(WARPLET_ADDRESS, userFid.toString());
          const raribleNFT = transformRaribleItem(data);

          // Transform to Warplet format
          const warplet: WarpletNFT = {
            tokenId: raribleNFT.tokenId,
            name: raribleNFT.name || `Warplet #${raribleNFT.tokenId}`,
            description: raribleNFT.description || '',
            imageUrl: raribleNFT.image || '',
            thumbnailUrl: raribleNFT.image, // Rarible doesn't have separate thumbnails, use main image
            contract: {
              address: raribleNFT.contract.address,
              name: raribleNFT.contract.name || 'Warplets',
            },
          };

          setNft(warplet);
        } catch (err) {
          // Handle 404 - user doesn't own their FID Warplet
          if (err instanceof Error && (err.message.includes('404') || err.message.includes('not found'))) {
            setNft(null);
            setError(null); // Not an error, just doesn't exist
            return;
          }
          throw err; // Re-throw other errors
        }
      } catch (err: unknown) {
        console.error('Error fetching Warplet by FID:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch Warplet NFT');
        setNft(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWarpletByFID();
  }, [isConnected]);

  return {
    nft,
    fid,
    isLoading,
    error,
    hasWarplet: nft !== null,
  };
}
