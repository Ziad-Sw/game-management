import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";

/**
 * GET /api/sessions/active — returns all active sessions for the shop
 */
export async function GET() {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: sessions, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "active");

    if (error) {
      console.error("Failed to fetch active sessions:", error);
      return NextResponse.json(
        { error: "Failed to fetch active sessions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (err) {
    console.error("Error fetching active sessions:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
