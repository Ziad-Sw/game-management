import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import type { StationType, PricingMode, PricingUnit, PlayType, PlaySubtype } from "@/types";

/**
 * Upserts a single pricing rule.
 *
 * Body: { station_type, mode, unit, rate, play_type?, play_subtype? }
 * - station_type: 'playstation' | 'billiard' | 'pingpong'
 * - mode: 'single' | 'multi'
 * - unit: 'hour' | 'game'
 * - rate: number >= 0
 * - play_type (optional): 'normal' | 'combo'  — defaults to 'normal'
 * - play_subtype (optional): 'single' | 'multi' | 'triple' | 'quad' — defaults to mode
 *
 * The UNIQUE constraint on (shop_id, station_type, play_type, play_subtype, unit) ensures
 * each combination has exactly one row per shop.
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
    await assertPermission(userId, "manage_settings");

    const body = await request.json();
    const { station_type, mode, unit, rate } = body ?? {};
    const play_type: PlayType =
      body.play_type === "combo" ? "combo" : "normal";
    const play_subtype: PlaySubtype =
      body.play_subtype === "multi"
        ? "multi"
        : body.play_subtype === "triple"
          ? "triple"
          : body.play_subtype === "quad"
            ? "quad"
            : mode === "multi"
              ? "multi"
              : "single";

    // 1. Validate station_type
    if (
      station_type !== "playstation" &&
      station_type !== "billiard" &&
      station_type !== "pingpong"
    ) {
      return NextResponse.json(
        { error: "نوع الجهاز غير صالح." },
        { status: 400 }
      );
    }

    // 2. Validate mode
    if (mode !== "single" && mode !== "multi") {
      return NextResponse.json(
        { error: "نوع اللعب (فردي/مالتي) غير صالح." },
        { status: 400 }
      );
    }

    // 3. Validate unit
    if (unit !== "hour" && unit !== "game") {
      return NextResponse.json(
        { error: "وحدة التسعير (ساعة/جيم) غير صالحة." },
        { status: 400 }
      );
    }

    // 4. Validate rate
    if (
      typeof rate !== "number" ||
      !Number.isFinite(rate) ||
      rate < 0
    ) {
      return NextResponse.json(
        { error: "السعر يجب أن يكون رقمًا موجبًا." },
        { status: 400 }
      );
    }

    // 5. Upsert — relies on UNIQUE (shop_id, station_type, play_type, play_subtype, unit)
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("pricing_rules")
      .upsert(
        {
          shop_id: shopId,
          station_type: station_type as StationType,
          mode: mode as PricingMode,
          unit: unit as PricingUnit,
          rate,
          play_type,
          play_subtype,
        },
        { onConflict: "shop_id,station_type,play_type,play_subtype,unit" }
      )
      .select("id, station_type, mode, unit, rate, play_type, play_subtype")
      .maybeSingle();

    if (error || !data) {
      console.error("pricing_rules upsert failed:", error);
      return NextResponse.json(
        { error: "Failed to save pricing rule" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, pricingRule: data });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error upserting pricing rule:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
