import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { GEOPLET_CONFIG } from '@/lib/contracts';

/**
 * API Route: Check if FID is already minted
 * GET /api/check-fid?fid=12345
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fidParam = searchParams.get('fid');

    if (!fidParam) {
      return NextResponse.json(
        { error: 'FID parameter is required' },
        { status: 400 }
      );
    }

    const fid = BigInt(fidParam);

    // Create public client for reading contract (Base Mainnet)
    const publicClient = createPublicClient({
      chain: GEOPLET_CONFIG.chain,
      transport: http('https://mainnet.base.org'), // Base official RPC
    });

    // Check if FID is minted
    const isMinted = await publicClient.readContract({
      address: GEOPLET_CONFIG.address,
      abi: GEOPLET_CONFIG.abi,
      functionName: 'isFidMinted',
      args: [fid],
    });

    return NextResponse.json({
      fid: fidParam,
      isMinted,
      available: !isMinted,
    });
  } catch (error) {
    console.error('Error checking FID:', error);
    return NextResponse.json(
      { error: 'Failed to check FID availability' },
      { status: 500 }
    );
  }
}
