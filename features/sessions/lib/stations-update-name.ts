import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

/**
 * POST /api/stations/update-name — updates a station's name
 * Body: { station_id: string, new_name: string }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { station_id, new_name } = body ?? {};

    if (typeof station_id !== "string" || station_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الجهاز مطلوب." },
        { status: 400 }
      );
    }

    if (typeof new_name !== "string" || new_name.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم الجهاز مطلوب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify station belongs to the shop
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("id")
      .eq("id", station_id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (stationError || !station) {
      return NextResponse.json(
        { error: "الجهاز غير موجود." },
        { status: 404 }
      );
    }

    // Update station name
    const { data: updatedStation, error: updateError } = await supabase
      .from("stations")
      .update({ name: new_name.trim() })
      .eq("id", station_id)
      .eq("shop_id", shopId)
      .select()
      .maybeSingle();

    if (updateError || !updatedStation) {
      console.error("Failed to update station name:", updateError);
      return NextResponse.json(
        { error: "Failed to update station name" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, station: updatedStation });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error updating station name:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
