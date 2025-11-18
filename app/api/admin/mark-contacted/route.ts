import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/admin/mark-contacted
 *
 * Marks selected users as contacted (cast_sent = true)
 * Useful for manual tracking when cast is sent outside the admin panel
 *
 * Body:
 * {
 *   fids: number[],
 *   contacted: boolean  // true to mark as contacted, false to reset
 * }
 */

interface MarkContactedRequest {
  fids: number[];
  contacted: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body: MarkContactedRequest = await req.json();
    const { fids, contacted } = body;

    console.log('[MARK-CONTACTED] Request received:', {
      fidsCount: fids.length,
      contacted,
      timestamp: new Date().toISOString()
    });

    // Validation
    if (!fids || fids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No users selected' },
        { status: 400 }
      );
    }

    if (typeof contacted !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid contacted value' },
        { status: 400 }
      );
    }

    // Update cast_sent status
    const { error } = await supabaseAdmin
      .from('unminted_geoplets')
      .update({ cast_sent: contacted })
      .in('fid', fids);

    if (error) {
      console.error('[MARK-CONTACTED] Database error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to update contact status' },
        { status: 500 }
      );
    }

    console.log('[MARK-CONTACTED] Successfully updated users:', fids.length);

    return NextResponse.json({
      success: true,
      message: `Successfully marked ${fids.length} user(s) as ${contacted ? 'contacted' : 'not contacted'}`,
      updated: fids.length
    });

  } catch (error) {
    console.error('[MARK-CONTACTED] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
