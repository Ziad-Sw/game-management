import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import { getCairoDayBoundaries } from "@/features/shifts/lib/cairo-time";
import { assertPermission, PermissionError } from "@/lib/auth/permissions";

/**
 * POST /api/shifts/open — opens a new shift for the shop.
 *
 * Body: { responsible_name: string }
 *
 * Validation:
 * - No open shift already exists
 * - shift_number does not exceed shifts_per_day from shops table
 * - responsible_name is not empty
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySessionCookieValue(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertPermission(session.user_id, "manage_shifts");

    // 2. Parse body
    const body = await request.json();
    const { responsible_name } = body ?? {};

    if (typeof responsible_name !== "string" || responsible_name.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم المسؤول مطلوب." },
        { status: 400 }
      );
    }

    // 3. Get user shop_id
    const supabase = createAdminClient();
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("shop_id")
      .eq("id", session.user_id)
      .limit(1)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const shopId = user.shop_id;

    // 4. Check if there's already an open shift
    const { data: existingOpen } = await supabase
      .from("shifts")
      .select("id")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    if (existingOpen) {
      return NextResponse.json(
        { error: "يوجد وردية مفتوحة بالفعل. لا يمكن فتح وردية جديدة." },
        { status: 409 }
      );
    }

    // 5. Get shifts_per_day from shops table
    const { data: shop, error: shopError } = await supabase
      .from("shops")
      .select("shifts_per_day")
      .eq("id", shopId)
      .limit(1)
      .maybeSingle();

    if (shopError || !shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const shiftsPerDay = shop.shifts_per_day;

    // 6. Count shifts opened today (both open and closed) using Africa/Cairo timezone
    const { start, end } = getCairoDayBoundaries();

    const { data: todayShifts, error: countError } = await supabase
      .from("shifts")
      .select("id")
      .eq("shop_id", shopId)
      .gte("opened_at", start)
      .lt("opened_at", end);

    if (countError) {
      console.error("Failed to count today's shifts:", countError);
      return NextResponse.json(
        { error: "Failed to count today's shifts" },
        { status: 500 }
      );
    }

    const todayShiftCount = todayShifts?.length || 0;

    // 7. Check if we've reached the daily limit
    if (todayShiftCount >= shiftsPerDay) {
      return NextResponse.json(
        { error: `تم الوصول إلى الحد الأقصى للورديات اليومية (${shiftsPerDay}).` },
        { status: 409 }
      );
    }

    // 8. Calculate shift_number (today's count + 1)
    const shiftNumber = todayShiftCount + 1;

    // 9. Create the new shift
    const { data: shift, error: shiftError } = await supabase
      .from("shifts")
      .insert({
        shop_id: shopId,
        responsible_name: responsible_name.trim(),
        opened_by_user_id: session.user_id,
        shift_number: shiftNumber,
        status: "open",
        opened_at: new Date().toISOString(),
      })
      .select("*")
      .maybeSingle();

    if (shiftError || !shift) {
      console.error("Failed to create shift:", shiftError);
      return NextResponse.json(
        { error: "Failed to create shift" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, shift });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error opening shift:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
