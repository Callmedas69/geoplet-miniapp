// app/api/openai-precheck/route.ts
//
// OpenAI Service Pre-Check Endpoint
// Independent router for checking OpenAI availability before generation

import { NextResponse } from 'next/server';
import { checkOpenAIAvailability } from '@/lib/openai-health';

// CORS headers for frontend requests
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * API Response Format
 */
interface PreCheckResponse {
  available: boolean;
  reason?: string;
  checkedAt: number;
}

/**
 * Handle OPTIONS preflight
 */
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

/**
 * GET /api/openai-precheck
 *
 * Check OpenAI service availability and credit balance
 *
 * Returns:
 * - 200: Service available
 * - 503: Service unavailable (with reason)
 * - 500: Health check failed
 */
export async function GET() {
  try {
    console.log('[PRECHECK] Starting OpenAI availability check...');

    // Perform health check
    const health = await checkOpenAIAvailability();

    console.log('[PRECHECK] Health check result:', {
      available: health.available,
      reason: health.reason,
    });

    const response: PreCheckResponse = {
      available: health.available,
      reason: health.reason,
      checkedAt: health.checkedAt,
    };

    // Return appropriate status code
    if (health.available) {
      // Service is available
      return NextResponse.json(response, {
        status: 200,
        headers: {
          ...corsHeaders,
          // Cache for 30 seconds to reduce load
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
        },
      });
    } else {
      // Service is unavailable
      return NextResponse.json(response, {
        status: 503,
        headers: corsHeaders,
      });
    }
  } catch (error: unknown) {
    console.error('[PRECHECK] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Pre-check failed';

    return NextResponse.json(
      {
        available: false,
        reason: errorMessage,
        checkedAt: Date.now(),
      } as PreCheckResponse,
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
}
