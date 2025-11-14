/**
 * Rarible API Integration
 *
 * Provides NFT metadata fetching using Rarible API v0.1
 * Replaces Alchemy NFT API for better Base network support
 */

// Configuration
const RARIBLE_API_KEY = process.env.NEXT_PUBLIC_RARIBLE_API_KEY || '';
const RARIBLE_BASE_URL = 'https://api.rarible.org/v0.1';

// Contract addresses
export const GEOPLET_ADDRESS = '0x999aC3B6571fEfb770EA3A836E82Cc45Cd1e653F';
export const WARPLET_ADDRESS = '0x699727f9e01a822efdcf7333073f0461e5914b4e';

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
 * Fetch from Rarible API with authentication
 */
async function raribleFetch(endpoint: string): Promise<any> {
  if (!RARIBLE_API_KEY) {
    throw new Error('RARIBLE_API_KEY not configured');
  }

  const response = await fetch(`${RARIBLE_BASE_URL}${endpoint}`, {
    headers: {
      'X-API-KEY': RARIBLE_API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => response.statusText);
    throw new Error(`Rarible API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get single NFT by contract address and token ID
 *
 * @param contractAddress - Contract address (without chain prefix)
 * @param tokenId - Token ID as string
 * @returns Rarible item data
 */
export async function getNFTById(
  contractAddress: string,
  tokenId: string
): Promise<RaribleItem> {
  // Format: BASE:0x{contractAddress}:{tokenId}
  const itemId = `BASE:${contractAddress}:${tokenId}`;
  return raribleFetch(`/items/${itemId}`);
}

/**
 * Get NFTs from a collection with pagination
 *
 * @param contractAddress - Contract address (without chain prefix)
 * @param continuation - Pagination token from previous response
 * @returns Collection response with items and pagination token
 */
export async function getNFTsFromCollection(
  contractAddress: string,
  continuation?: string
): Promise<RaribleCollectionResponse> {
  // Format: BASE:0x{contractAddress} (URL-encoded to BASE%3A0x...)
  const collectionId = encodeURIComponent(`BASE:${contractAddress}`);
  const queryParams = continuation ? `&continuation=${continuation}` : '';

  return raribleFetch(`/items/byCollection?collection=${collectionId}${queryParams}`);
}

/**
 * Transform Rarible item to common NFT format
 *
 * Handles parsing of chain-prefixed addresses and extracts
 * relevant metadata fields.
 *
 * @param item - Rarible API item
 * @returns Normalized NFT metadata
 */
export function transformRaribleItem(item: RaribleItem): NFTMetadata {
  // Extract owner address (remove chain prefix)
  // "ETHEREUM:0x..." or "BASE:0x..." → "0x..."
  const owner = item.ownerIfSingle?.includes(':')
    ? item.ownerIfSingle.split(':')[1]
    : item.ownerIfSingle;

  // Extract contract address (remove chain prefix)
  // "BASE:0x..." → "0x..."
  const contractAddress = item.contract?.includes(':')
    ? item.contract.split(':')[1]
    : item.contract || '';

  // Extract image URL from content array
  const image = item.meta?.content?.find(c => c['@type'] === 'IMAGE')?.url || '';

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
      .then(transformRaribleItem)
      .catch(error => {
        console.error(`[RARIBLE] Failed to fetch NFT ${id}:`, error);
        return null;
      })
  );

  const results = await Promise.all(promises);
  return results.filter((nft): nft is NFTMetadata => nft !== null);
}
