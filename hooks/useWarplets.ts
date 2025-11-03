import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || '';
const WARPLETS_ADDRESS = process.env.NEXT_PUBLIC_WARPLETS_ADDRESS || '';
const ALCHEMY_BASE_URL = `https://base-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_API_KEY}`;

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

// Alchemy getNFTMetadata response for single NFT
interface AlchemyNFTMetadata {
  contract: {
    address: string;
    name?: string;
  };
  tokenId: string;
  name?: string;
  description?: string;
  image: {
    cachedUrl?: string;
    thumbnailUrl?: string;
    originalUrl?: string;
  };
  raw: {
    metadata?: {
      image?: string;
      name?: string;
      description?: string;
    };
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

        const userFid = context.user.fid;
        setFid(userFid);

        if (!userFid) {
          throw new Error('Unable to get Farcaster ID');
        }

        // Build Alchemy API URL for single NFT metadata lookup
        const params = new URLSearchParams({
          contractAddress: WARPLETS_ADDRESS,
          tokenId: userFid.toString(),
          tokenType: 'ERC721',
          refreshCache: 'false',
        });

        const url = `${ALCHEMY_BASE_URL}/getNFTMetadata?${params.toString()}`;

        const response = await fetch(url);

        // Handle 404 - user doesn't own their FID Warplet
        if (response.status === 404) {
          setNft(null);
          setError(null); // Not an error, just doesn't exist
          return;
        }

        if (!response.ok) {
          throw new Error(`Alchemy API error: ${response.statusText}`);
        }

        const data: AlchemyNFTMetadata = await response.json();

        // Transform Alchemy response to our format
        const warplet: WarpletNFT = {
          tokenId: data.tokenId,
          name: data.name || `Warplet #${data.tokenId}`,
          description: data.description || '',
          imageUrl: data.image?.cachedUrl || data.image?.originalUrl || data.raw.metadata?.image || '',
          thumbnailUrl: data.image?.thumbnailUrl,
          contract: {
            address: data.contract.address,
            name: data.contract.name || 'Warplets',
          },
        };

        setNft(warplet);
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
