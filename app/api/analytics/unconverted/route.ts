import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { UnconvertedUser } from '@/lib/supabase';

/**
 * GET /api/analytics/unconverted
 *
 * Returns list of users who generated Geoplets but haven't paid/minted
 * Queries the `unconverted_users` VIEW (database-level filtering)
 *
 * Query Parameters:
 * - cast_sent: Optional filter by cast status (true/false)
 *
 * Response:
 * {
 *   success: true,
 *   users: Array<UnconvertedUser>,
 *   count: number,
 *   tag_string: string  // For easy copy-paste into Farcaster casts
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const castSentFilter = searchParams.get('cast_sent');

    console.log('[ANALYTICS] Fetching unconverted users:', {
      castSentFilter,
      timestamp: new Date().toISOString()
    });

    // Build query on the VIEW
    let query = supabaseAdmin
      .from('unconverted_users')
      .select('*')
      .order('generated_at', { ascending: false });

    // Optional filter by cast_sent status
    if (castSentFilter !== null) {
      query = query.eq('cast_sent', castSentFilter === 'true');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ANALYTICS] ❌ Supabase error:', {
        error,
        errorCode: error.code,
        errorMessage: error.message
      });
      throw error;
    }

    // Generate tag string for easy copy-paste into Farcaster casts
    const tagString = data?.map(u => `@${u.username}`).join(' ') || '';

    console.log('[ANALYTICS] ✅ Retrieved unconverted users:', {
      count: data?.length || 0,
      castSentFilter
    });

    return NextResponse.json({
      success: true,
      users: data as UnconvertedUser[],
      count: data?.length || 0,
      tag_string: tagString,
    });

  } catch (error) {
    console.error('[ANALYTICS] Error fetching unconverted users:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch unconverted users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
