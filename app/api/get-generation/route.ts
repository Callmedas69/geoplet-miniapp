import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fid = searchParams.get('fid');

    // Validation
    if (!fid) {
      return NextResponse.json(
        { success: false, error: 'FID is required' },
        { status: 400 }
      );
    }

    const fidNumber = parseInt(fid, 10);
    if (isNaN(fidNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid FID format' },
        { status: 400 }
      );
    }

    // Query database
    const { data, error } = await supabaseAdmin
      .from('unminted_geoplet')
      .select('*')
      .eq('fid', fidNumber)
      .single();

    if (error) {
      // Not found is not an error, just return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({
          success: true,
          data: null,
        });
      }

      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve generation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        fid: data.fid,
        image_data: data.image_data,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error('Get generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
