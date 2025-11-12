import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

/**
 * POST /api/payment-tracking
 *
 * Create or update payment tracking record
 * Note: This is primarily done by settle-payment API now,
 * but keeping this endpoint for manual operations if needed
 */
export async function POST(request: NextRequest) {
  try {
    const { fid, settlement_tx_hash, status } = await request.json();

    if (!fid || !settlement_tx_hash) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: fid, settlement_tx_hash" },
        { status: 400 }
      );
    }

    const fidNumber = parseInt(fid);
    if (isNaN(fidNumber)) {
      return NextResponse.json(
        { success: false, error: "Invalid FID" },
        { status: 400 }
      );
    }

    console.log('[PAYMENT-TRACKING-POST] Creating record:', {
      fid: fidNumber,
      settlement_tx_hash,
      status: status || 'settled'
    });

    const { data, error } = await supabaseAdmin
      .from("payment_tracking")
      .upsert({
        fid: fidNumber,
        settlement_tx_hash,
        status: status || "settled",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[PAYMENT-TRACKING-POST] Error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create record" },
        { status: 500 }
      );
    }

    console.log('[PAYMENT-TRACKING-POST] ✅ Record created:', {
      fid: data.fid,
      status: data.status
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[PAYMENT-TRACKING-POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
