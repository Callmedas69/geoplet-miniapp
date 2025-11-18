import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { neynarClient, getSignerUuid } from '@/lib/neynar';

/**
 * POST /api/admin/send-cast
 *
 * Sends individual Farcaster casts to each selected user via Neynar API
 * Each cast includes their specific generated Geoplet OG image
 * Marks users as contacted (cast_sent = true) after successful send
 *
 * Body:
 * {
 *   fids: number[],
 *   message: string,  // Text without mentions, will add @username for each individual cast
 *   template?: string // Optional template type for message variation cycling
 * }
 */

interface CastRequest {
  fids: number[];
  message: string;
  template?: string;
}

interface CastResult {
  fid: number;
  username: string;
  success: boolean;
  error?: string;
}

// Friendly message variations - cycle through when template is 'friendly'
const FRIENDLY_VARIATIONS = [
  "your Geoplet is doing a little happy dance… mint it whenever you wanna join in 💃✨",
  "your Geoplet is practicing its 'I'm minted!' pose — take your time 😄🎨",
  "your Geoplet keeps whispering, 'Are we minting today?' but it's cool if not 😂💫",
  "your Geoplet is vibing in the waiting room, snacking on pixels 🍿🟦",
  "your Geoplet is ready to glow up into a GeoTizen — whenever you feel the spark ✨😎",
];

// App URL for embeds
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://geoplet.geoart.studio';

export async function POST(req: NextRequest) {
  try {
    const body: CastRequest = await req.json();
    const { fids, message, template } = body;

    console.log('[SEND-CAST] Request received:', {
      fidsCount: fids.length,
      messageLength: message.length,
      template: template || 'default',
      timestamp: new Date().toISOString()
    });

    // Validation
    if (!fids || fids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No users selected' },
        { status: 400 }
      );
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Fetch usernames for the selected FIDs
    const { data: users, error: fetchError } = await supabaseAdmin
      .from('unminted_geoplets')
      .select('fid, username')
      .in('fid', fids);

    if (fetchError) {
      console.error('[SEND-CAST] Error fetching users:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user data' },
        { status: 500 }
      );
    }

    if (!users || users.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid users found' },
        { status: 404 }
      );
    }

    // Get Neynar signer UUID
    let signerUuid: string;
    try {
      signerUuid = getSignerUuid();
    } catch (error) {
      console.error('[SEND-CAST] Signer UUID not configured:', error);
      return NextResponse.json(
        { success: false, error: 'Neynar signer not configured' },
        { status: 500 }
      );
    }

    console.log('[SEND-CAST] Sending individual casts to', users.length, 'users via Neynar API');

    // Send individual casts to each user
    const results: CastResult[] = [];
    const successfulFids: number[] = [];

    let userIndex = 0; // Track index for friendly variation cycling

    for (const user of users) {
      try {
        // Determine message based on template type
        // If 'friendly', cycle through variations; otherwise use provided message
        const finalMessage = template === 'friendly'
          ? FRIENDLY_VARIATIONS[userIndex % FRIENDLY_VARIATIONS.length]
          : message;

        // Build personalized cast text
        // Format: "Hey! @username {message}"
        const castText = `Hey! @${user.username} ${finalMessage}`;

        // Each user gets their own share page (which includes OG image metadata)
        // Add cache-busting parameter to force Farcaster to refresh OG image
        const shareUrl = `${APP_URL}/share/unminted/${user.fid}?v=${Date.now()}`;

        console.log('[SEND-CAST] Sending to @' + user.username + ' (FID:', user.fid + ')');
        console.log('[SEND-CAST] Message:', finalMessage.substring(0, 50) + '...');

        // Publish cast using Neynar SDK
        const cast = await neynarClient.publishCast({
          signerUuid,
          text: castText,
          embeds: [{ url: shareUrl }],
        });

        console.log('[SEND-CAST] Success for @' + user.username + ', cast hash:', cast.cast.hash);

        results.push({
          fid: user.fid,
          username: user.username,
          success: true
        });

        successfulFids.push(user.fid);

        // Rate limiting: wait 100ms between casts to avoid hitting API limits
        if (users.indexOf(user) < users.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error('[SEND-CAST] Exception for @' + user.username + ':', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        results.push({
          fid: user.fid,
          username: user.username,
          success: false,
          error: errorMessage
        });
      }

      userIndex++; // Increment for next variation
    }

    // Mark successfully contacted users
    if (successfulFids.length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('unminted_geoplets')
        .update({ cast_sent: true })
        .in('fid', successfulFids);

      if (updateError) {
        console.error('[SEND-CAST] Error updating cast_sent status:', updateError);
        console.warn('[SEND-CAST] Casts sent but failed to update database');
      } else {
        console.log('[SEND-CAST] Marked', successfulFids.length, 'users as contacted');
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} casts successfully, ${failureCount} failed`,
      results,
      summary: {
        total: users.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('[SEND-CAST] Error:', error);
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
