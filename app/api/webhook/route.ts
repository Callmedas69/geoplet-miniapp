/**
 * Webhook Endpoint for Farcaster Mini App Notifications
 *
 * Receives POST events from Farcaster/Base platform:
 * - User added app
 * - Notification delivered
 * - User removed app
 * - etc.
 *
 * Reference: .docs/LOG.md lines 432-438
 */

import { NextRequest, NextResponse } from 'next/server';

// CORS headers for webhook requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Handle POST webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log webhook event for debugging
    console.log('[WEBHOOK] Received notification event:', {
      timestamp: new Date().toISOString(),
      event: body,
    });

    // Handle different event types
    const eventType = body.type || body.event_type;

    switch (eventType) {
      case 'user_added_app':
        console.log('[WEBHOOK] User added app:', {
          fid: body.user?.fid,
          username: body.user?.username,
        });
        // TODO: Track user adoption metrics
        break;

      case 'notification_delivered':
        console.log('[WEBHOOK] Notification delivered:', {
          notificationId: body.notification_id,
          fid: body.user?.fid,
        });
        // TODO: Track notification delivery metrics
        break;

      case 'user_removed_app':
        console.log('[WEBHOOK] User removed app:', {
          fid: body.user?.fid,
        });
        // TODO: Track churn metrics
        break;

      default:
        console.log('[WEBHOOK] Unknown event type:', eventType);
    }

    // Return success response
    return NextResponse.json(
      { success: true, received: true },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);

    // Return error response
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Invalid request',
      },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }
}
