import { NextRequest, NextResponse } from 'next/server';

/**
 * Rarible API Proxy Route
 *
 * Server-side proxy for Rarible API calls to:
 * 1. Keep API key secure (server-side only)
 * 2. Eliminate CORS issues
 * 3. Provide reliable NFT data fetching
 *
 * Following KISS Principle - simple proxy, no over-engineering
 */

// Rarible API configuration
const RARIBLE_API_KEY = process.env.RARIBLE_API_KEY || '';
const RARIBLE_BASE_URL = 'https://api.rarible.org/v0.1';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'https://geoplet.geoart.studio',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Rarible API response structure
 */
interface RaribleItem {
  id: string;
  blockchain: string;
  tokenId: string;
  ownerIfSingle?: string;
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
  mintedAt?: string;
  contract?: string;
  itemCollection?: {
    id: string;
    name: string;
  };
}

interface RaribleCollectionResponse {
  items: RaribleItem[];
  continuation?: string;
}

/**
 * Transform Rarible item to common NFT format
 */
function transformRaribleItem(item: RaribleItem) {
  // Extract owner address (remove chain prefix)
  const owner = item.ownerIfSingle?.includes(':')
    ? item.ownerIfSingle.split(':')[1]
    : item.ownerIfSingle;

  // Extract contract address (remove chain prefix)
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

// Handle OPTIONS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/rarible
 *
 * Query params:
 * - type: "single" | "collection"
 * - contractAddress: Contract address (without chain prefix)
 * - tokenId: Token ID (for type=single)
 * - continuation: Pagination token (for type=collection)
 * - size: Number of items per page (for type=collection, default: 20)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const contractAddress = searchParams.get('contractAddress');
    const tokenId = searchParams.get('tokenId');
    const continuation = searchParams.get('continuation');
    const size = searchParams.get('size') || '20'; // Default to 20 items per page

    // Validation
    if (!type || !contractAddress) {
      return NextResponse.json(
        { error: 'Missing required params: type, contractAddress' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (type === 'single') {
      // Fetch single NFT by ID
      if (!tokenId) {
        return NextResponse.json(
          { error: 'Missing tokenId for single NFT fetch' },
          { status: 400, headers: corsHeaders }
        );
      }

      const itemId = `BASE:${contractAddress}:${tokenId}`;
      console.log(`[RARIBLE-API] Fetching single NFT: ${itemId}`);

      const data = await raribleFetch(`/items/${itemId}`);
      const transformed = transformRaribleItem(data);

      console.log(`[RARIBLE-API] Success: ${transformed.name} - Image URL length: ${transformed.image.length}`);

      return NextResponse.json(
        { success: true, data: transformed },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            // Cache for 5 minutes (NFT metadata doesn't change often)
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          }
        }
      );

    } else if (type === 'collection') {
      // Fetch collection NFTs with pagination
      const collectionId = encodeURIComponent(`BASE:${contractAddress}`);
      const sizeParam = `&size=${size}`;
      const continuationParam = continuation ? `&continuation=${continuation}` : '';

      console.log(`[RARIBLE-API] Fetching collection: ${collectionId} (size: ${size})`);

      const data: RaribleCollectionResponse = await raribleFetch(
        `/items/byCollection?collection=${collectionId}${sizeParam}${continuationParam}`
      );

      const transformed = data.items.map(item => transformRaribleItem(item));

      console.log(`[RARIBLE-API] Success: ${transformed.length} items fetched`);

      return NextResponse.json(
        {
          success: true,
          data: {
            items: transformed,
            continuation: data.continuation,
          },
        },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
          }
        }
      );

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "single" or "collection"' },
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (error: unknown) {
    console.error('[RARIBLE-API] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Rarible API request failed';

    return NextResponse.json(
      { error: errorMessage, success: false },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-store', // Don't cache errors
        }
      }
    );
  }
}
