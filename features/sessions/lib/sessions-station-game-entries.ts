import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

export async function GET(request: NextRequest) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertPermission(userId, "manage_sessions");

    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get("session_id");

    if (!session_id || session_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الجلسة مطلوب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: entries, error } = await supabase
      .from("station_game_entries")
      .select("*")
      .eq("session_id", session_id)
      .eq("shop_id", shopId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Failed to fetch station game entries:", error);
      return NextResponse.json(
        { error: "Failed to fetch game entries" },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error fetching station game entries:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
