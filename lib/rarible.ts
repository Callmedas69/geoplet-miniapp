/**
 * Rarible API Integration (Client-Side)
 *
 * Provides NFT metadata fetching via server-side API route
 * Server route keeps API key secure and eliminates CORS issues
 *
 * Following KISS Principle - simple client wrapper
 */

import { GEOPLET_ADDRESSES } from '@/abi/GeopletsABI';

// Contract addresses
export const GEOPLET_ADDRESS = GEOPLET_ADDRESSES.baseMainnet;
export const WARPLET_ADDRESS = process.env.NEXT_PUBLIC_WARPLETS_ADDRESS as `0x${string}`;

/**
 * Rarible API item structure
 */
export interface RaribleItem {
  id: string;                    // "BASE:0x...:tokenId"
  blockchain: string;            // "BASE"
  tokenId: string;               // Decimal string
  ownerIfSingle?: string;        // "ETHEREUM:0x..." or "BASE:0x..."
  meta?: {
    name: string;
    description: string;
    content?: Array<{
      '@type': string;
      url: string;
      representation: string;
      mimeType: string;
      width?: number;
      height?: number;
    }>;
    attributes?: Array<{
      key: string;
      value: string;
    }>;
  };
  mintedAt?: string;             // ISO timestamp
  contract?: string;             // "BASE:0x..."
  itemCollection?: {
    id: string;
    name: string;
  };
}

/**
 * Rarible collection response
 */
export interface RaribleCollectionResponse {
  items: RaribleItem[];
  continuation?: string;         // Pagination token
}

/**
 * Common NFT format (transformed from Rarible)
 */
export interface NFTMetadata {
  tokenId: string;
  name: string;
  description: string;
  image: string;
  owner?: string;
  contract: {
    address: string;
    name: string;
  };
  attributes?: Array<{
    key: string;
    value: string;
  }>;
}

/**
 * Fetch from our Rarible API proxy route
 * Server-side route handles authentication and CORS
 */
async function raribleFetch(endpoint: string): Promise<any> {
  const response = await fetch(endpoint);

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`Rarible API proxy error: ${response.status} ${error}`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Rarible API request failed');
  }

  return result.data;
}

/**
 * Get single NFT by contract address and token ID
 *
 * @param contractAddress - Contract address (without chain prefix)
 * @param tokenId - Token ID as string
 * @returns NFT metadata
 */
export async function getNFTById(
  contractAddress: string,
  tokenId: string
): Promise<NFTMetadata> {
  const params = new URLSearchParams({
    type: 'single',
    contractAddress,
    tokenId,
  });

  return raribleFetch(`/api/rarible?${params.toString()}`);
}

/**
 * Get NFTs from a collection with pagination
 *
 * @param contractAddress - Contract address (without chain prefix)
 * @param continuation - Pagination token from previous response
 * @param size - Number of items per page (default: 20)
 * @returns Collection response with items and pagination token
 */
export async function getNFTsFromCollection(
  contractAddress: string,
  continuation?: string,
  size: number = 20
): Promise<{ items: NFTMetadata[]; continuation?: string }> {
  const params = new URLSearchParams({
    type: 'collection',
    contractAddress,
    size: size.toString(),
  });

  if (continuation) {
    params.append('continuation', continuation);
  }

  return raribleFetch(`/api/rarible?${params.toString()}`);
}

/**
 * Transform Rarible item to common NFT format
 * @deprecated - Transformation now handled server-side in /api/rarible
 * This function is kept for backward compatibility only
 */
export function transformRaribleItem(item: any): NFTMetadata {
  // If already transformed by server, return as-is
  if (item.contract && typeof item.contract === 'object' && item.contract.address) {
    return item as NFTMetadata;
  }

  // Legacy transformation (for backward compatibility)
  const owner = item.ownerIfSingle?.includes(':')
    ? item.ownerIfSingle.split(':')[1]
    : item.ownerIfSingle;

  const contractAddress = item.contract?.includes(':')
    ? item.contract.split(':')[1]
    : item.contract || '';

  const image = item.meta?.content?.find((c: any) => c['@type'] === 'IMAGE')?.url || '';

  return {
    tokenId: item.tokenId,
    name: item.meta?.name || `NFT #${item.tokenId}`,
    description: item.meta?.description || '',
    image,
    owner,
    contract: {
      address: contractAddress,
      name: item.itemCollection?.name || 'Unknown Collection',
    },
    attributes: item.meta?.attributes,
  };
}

/**
 * Get multiple NFTs by IDs (batch fetch)
 *
 * @param contractAddress - Contract address
 * @param tokenIds - Array of token IDs
 * @returns Array of NFT metadata
 */
export async function getNFTsByIds(
  contractAddress: string,
  tokenIds: string[]
): Promise<NFTMetadata[]> {
  const promises = tokenIds.map(id =>
    getNFTById(contractAddress, id)
      .catch(error => {
        console.error(`[RARIBLE] Failed to fetch NFT ${id}:`, error);
        return null;
      })
  );

  const results = await Promise.all(promises);
  return results.filter((nft): nft is NFTMetadata => nft !== null);
}
