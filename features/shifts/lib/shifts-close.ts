import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

/**
 * POST /api/shifts/close — closes an open shift.
 *
 * Body: { shift_id: string }
 *
 * Validation:
 * - Shift exists and belongs to the shop
 * - Shift status is 'open'
 * - No active sessions (status = 'active') are linked to this shift
 *
 * Once closed, shift data is preserved permanently (no deletion or modification).
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
    await assertPermission(userId, "manage_shifts");

    const body = await request.json();
    const { shift_id } = body ?? {};

    if (typeof shift_id !== "string" || shift_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الوردية مطلوب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the shift to verify it exists and belongs to the shop
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .select("*")
      .eq("id", shift_id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (shiftError || !shift) {
      return NextResponse.json(
        { error: "الوردية غير موجودة." },
        { status: 404 }
      );
    }

    // 2. Verify shift is open
    if (shift.status !== "open") {
      return NextResponse.json(
        { error: "هذه الوردية ليست مفتوحة." },
        { status: 400 }
      );
    }

    // 3. Check for active sessions linked to this shift
    // This check is device-type agnostic — it applies to all sessions regardless of station_type
    const { data: activeSessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("id")
      .eq("shift_id", shift_id)
      .eq("status", "active")
      .limit(1);

    if (sessionsError) {
      console.error("Failed to check for active sessions:", sessionsError);
      return NextResponse.json(
        { error: "Failed to check for active sessions" },
        { status: 500 }
      );
    }

    if (activeSessions && activeSessions.length > 0) {
      return NextResponse.json(
        { error: "لا تزال هناك أجهزة نشطة. يجب إغلاق جميع الجلسات قبل إنهاء الوردية." },
        { status: 409 }
      );
    }

    // 4. Close the shift
    const { data: updatedShift, error: updateError } = await supabase
      .from("shifts")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
      })
      .eq("id", shift_id)
      .eq("shop_id", shopId)
      .select("*")
      .maybeSingle();

    if (updateError || !updatedShift) {
      console.error("Failed to close shift:", updateError);
      return NextResponse.json(
        { error: "Failed to close shift" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, shift: updatedShift });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error closing shift:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
