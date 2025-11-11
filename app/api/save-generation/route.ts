import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Rate limiting map (in-memory for MVP, use Redis for production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(fid: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(fid);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(fid, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fid, image_data } = body;

    // Validation
    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Invalid FID' },
        { status: 400 }
      );
    }

    if (!image_data || typeof image_data !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid image data' },
        { status: 400 }
      );
    }

    // Strip data URI prefix if present (KISS: store raw base64, contract format)
    const rawBase64 = image_data.startsWith('data:image/')
      ? image_data.split(',')[1] || ''
      : image_data;

    // Validate base64 format (security: prevent injection)
    if (!rawBase64 || !/^[A-Za-z0-9+/=]+$/.test(rawBase64)) {
      return NextResponse.json(
        { success: false, error: 'Invalid base64 format' },
        { status: 400 }
      );
    }

    // Validate image size on RAW base64 (matches contract validation exactly)
    // Contract requires: bytes(base64ImageData).length <= 24576 (line 206 in Geoplets.sol)
    const sizeInBytes = Buffer.from(rawBase64, 'base64').length;
    if (sizeInBytes > 24576) {
      return NextResponse.json(
        { success: false, error: `Image too large (${sizeInBytes} bytes). Must be ≤24KB (24576 bytes)` },
        { status: 400 }
      );
    }

    // Rate limiting
    if (!checkRateLimit(fid.toString())) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Max 10 requests per minute.' },
        { status: 429 }
      );
    }

    // UPSERT to database (insert or update if FID exists)
    // Store raw base64 (contract-ready format, KISS principle)
    const { data, error } = await supabaseAdmin
      .from('unminted_geoplets')
      .upsert(
        {
          fid,
          image_data: rawBase64,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'fid', // Update if FID already exists
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to save generation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        fid: data.fid,
        created_at: data.created_at,
      },
    });
  } catch (error) {
    console.error('Save generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
