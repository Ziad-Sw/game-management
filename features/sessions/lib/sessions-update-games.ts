import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

/**
 * POST /api/sessions/update-games — updates games_count on an active session
 * Body: { session_id: string, games_count: number }
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
    const { session_id, games_count } = body ?? {};

    if (typeof session_id !== "string" || session_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الجلسة مطلوب." },
        { status: 400 }
      );
    }

    if (
      typeof games_count !== "number" ||
      !Number.isFinite(games_count) ||
      !Number.isInteger(games_count) ||
      games_count < 0
    ) {
      return NextResponse.json(
        { error: "عدد الجيمات يجب أن يكون رقمًا صحيحًا غير سالب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, status, billing_mode, games_model, stations!inner(station_type)")
      .eq("id", session_id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "الجلسة غير موجودة." },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "لا يمكن تعديل جلسة منتهية." },
        { status: 409 }
      );
    }

    const stationType = session.stations.station_type;

    if (
      stationType !== "billiard" &&
      session.billing_mode === "games" &&
      session.games_model !== "legacy"
    ) {
      return NextResponse.json(
        { error: "هذه الجلسة تستخدم نظام الدفعات المتراكمة. استخدم إضافة جيمات بدلاً من تعديل العدد." },
        { status: 400 }
      );
    }
    const { data: updatedSession, error: updateError } = await supabase
      .from("sessions")
      .update({ games_count })
      .eq("id", session_id)
      .eq("shop_id", shopId)
      .select("id, games_count")
      .maybeSingle();

    if (updateError || !updatedSession) {
      console.error("Failed to update games count:", updateError);
      return NextResponse.json(
        { error: "Failed to update games count" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, session: updatedSession });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error updating games count:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
