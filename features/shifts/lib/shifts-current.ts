import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";

/**
 * GET /api/shifts/current — returns the currently open shift for the shop, or null if none.
 */
export async function GET() {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Failed to fetch current shift:", error);
      return NextResponse.json(
        { error: "Failed to fetch current shift" },
        { status: 500 }
      );
    }

    return NextResponse.json({ shift: data });
  } catch (err) {
    console.error("Error fetching current shift:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
