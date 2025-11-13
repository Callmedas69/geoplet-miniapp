import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * GET /api/payment-tracking/[fid]
 *
 * Get payment tracking status for a specific FID
 * Used by page.tsx to check if user has settled payment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid: fidParam } = await params;
    const fid = parseInt(fidParam);

    if (isNaN(fid)) {
      return NextResponse.json(
        { success: false, error: "Invalid FID" },
        { status: 400 }
      );
    }

    console.log('[PAYMENT-TRACKING-GET] Checking payment status:', { fid });

    const { data, error } = await supabaseAdmin
      .from("payment_tracking")
      .select("*")
      .eq("fid", fid)
      .single();

    if (error) {
      // Not found is expected for users who haven't paid yet
      if (error.code === 'PGRST116') {
        console.log('[PAYMENT-TRACKING-GET] No payment record found:', { fid });
        return NextResponse.json(
          { success: false, error: "No payment record found" },
          { status: 404 }
        );
      }

      console.error('[PAYMENT-TRACKING-GET] Database error:', {
        error,
        fid
      });
      return NextResponse.json(
        { success: false, error: "Database query failed" },
        { status: 500 }
      );
    }

    console.log('[PAYMENT-TRACKING-GET] Payment record found:', {
      fid,
      status: data.status,
      settlement_tx_hash: data.settlement_tx_hash
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[PAYMENT-TRACKING-GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/payment-tracking/[fid]
 *
 * Update payment tracking status
 * Used after successful mint to mark as 'minted'
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid: fidParam } = await params;
    const fid = parseInt(fidParam);
    const { status, mint_tx_hash, refund_tx_hash } = await request.json();

    if (isNaN(fid)) {
      return NextResponse.json(
        { success: false, error: "Invalid FID" },
        { status: 400 }
      );
    }

    if (!["settled", "minted", "failed", "refunded"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status. Must be: settled, minted, failed, or refunded" },
        { status: 400 }
      );
    }

    console.log('[PAYMENT-TRACKING-PATCH] Updating status:', {
      fid,
      newStatus: status,
      mint_tx_hash: mint_tx_hash || 'not provided',
      refund_tx_hash: refund_tx_hash || 'not provided'
    });

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    // Only include mint_tx_hash if provided
    if (mint_tx_hash) {
      updateData.mint_tx_hash = mint_tx_hash;
    }

    // Only include refund_tx_hash if provided
    if (refund_tx_hash) {
      updateData.refund_tx_hash = refund_tx_hash;
    }

    const { data, error } = await supabaseAdmin
      .from("payment_tracking")
      .update(updateData)
      .eq("fid", fid)
      .select()
      .single();

    if (error) {
      console.error('[PAYMENT-TRACKING-PATCH] Update failed:', {
        error,
        fid,
        status
      });
      return NextResponse.json(
        { success: false, error: "Failed to update record" },
        { status: 500 }
      );
    }

    console.log('[PAYMENT-TRACKING-PATCH] ✅ Status updated:', {
      fid,
      status: data.status
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[PAYMENT-TRACKING-PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
