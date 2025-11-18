import { NextRequest, NextResponse } from 'next/server';
import { neynarClient, getSignerUuid } from '@/lib/neynar';

/**
 * GET /api/admin/test-farcaster-key
 *
 * Tests the Neynar API key and signer configuration
 * Returns account info if valid, error details if invalid
 */

export async function GET(req: NextRequest) {
  try {
    // Check if API key is configured
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'NEYNAR_API_KEY not configured',
          details: 'Please add NEYNAR_API_KEY to your .env file'
        },
        { status: 500 }
      );
    }

    // Check if signer UUID is configured
    let signerUuid: string;
    try {
      signerUuid = getSignerUuid();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'NEYNAR_SIGNER_UUID not configured',
          details: 'Please add NEYNAR_SIGNER_UUID to your .env file'
        },
        { status: 500 }
      );
    }

    console.log('[TEST-API-KEY] Testing Neynar API key and signer...');
    console.log('[TEST-API-KEY] Signer UUID:', signerUuid);

    // Test the signer by fetching its details
    const signer = await neynarClient.lookupSigner({ signerUuid });

    console.log('[TEST-API-KEY] Signer status:', signer.status);
    console.log('[TEST-API-KEY] FID:', signer.fid);

    // Check if signer is approved
    if (signer.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error: 'Signer not approved',
          details: `Signer status is "${signer.status}". The signer must be approved in Warpcast app before it can be used to post casts.`,
          signer: {
            status: signer.status,
            signerUuid: signer.signer_uuid,
            fid: signer.fid || null,
          }
        },
        { status: 400 }
      );
    }

    // Fetch user details for the FID
    let username = 'N/A';
    let displayName = 'N/A';

    if (signer.fid) {
      try {
        const user = await neynarClient.fetchBulkUsers({ fids: [signer.fid] });
        if (user.users && user.users.length > 0) {
          username = user.users[0].username || 'N/A';
          displayName = user.users[0].display_name || 'N/A';
        }
      } catch (userError) {
        console.warn('[TEST-API-KEY] Could not fetch user details:', userError);
      }
    }

    console.log('[TEST-API-KEY] ✅ Neynar API key and signer are valid');
    console.log('[TEST-API-KEY] Casts will be posted from:', username, `(FID: ${signer.fid})`);

    return NextResponse.json({
      success: true,
      message: 'Neynar API key and signer are valid',
      account: {
        fid: signer.fid || 'N/A',
        username,
        displayName,
      },
      signer: {
        status: signer.status,
        signerUuid: signer.signer_uuid,
      },
      testedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('[TEST-API-KEY] Exception:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
