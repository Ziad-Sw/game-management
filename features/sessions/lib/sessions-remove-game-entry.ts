import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";

export async function DELETE(request: NextRequest) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entryId = searchParams.get("entry_id");

    if (!entryId) {
      return NextResponse.json(
        { error: "معرف إدخال الجيم مطلوب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: entry, error: findError } = await supabase
      .from("billiard_game_entries")
      .select(`
        id,
        session_id,
        sessions!inner (
          status
        )
      `)
      .eq("id", entryId)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (findError || !entry) {
      return NextResponse.json(
        { error: "إدخال الجيم غير موجود." },
        { status: 404 }
      );
    }

    if (entry.sessions.status !== "active") {
      return NextResponse.json(
        { error: "لا يمكن حذف جيمات من جلسة منتهية." },
        { status: 409 }
      );
    }

    const { error: deleteError } = await supabase
      .from("billiard_game_entries")
      .delete()
      .eq("id", entryId)
      .eq("shop_id", shopId);

    if (deleteError) {
      console.error("Failed to remove game entry:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove game entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error removing game entry:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
