import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import type { PricingMode } from "@/types";

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
    const { session_id, mode, games_count, price_per_game } = body ?? {};

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
      games_count <= 0
    ) {
      return NextResponse.json(
        { error: "عدد الجيمات يجب أن يكون رقمًا صحيحًا موجبًا." },
        { status: 400 }
      );
    }

    if (mode !== "single" && mode !== "multi") {
      return NextResponse.json(
        { error: "وضع اللعب غير صالح." },
        { status: 400 }
      );
    }

    if (
      price_per_game !== undefined &&
      (typeof price_per_game !== "number" || !Number.isFinite(price_per_game) || price_per_game < 0)
    ) {
      return NextResponse.json(
        { error: "السعر لكل جيم يجب أن يكون رقمًا غير سالب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, station_id, billing_mode, status, stations!inner(station_type)")
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
        { error: "يمكن إضافة جيمات فقط للجلسات النشطة." },
        { status: 409 }
      );
    }

    if (session.stations.station_type === "billiard") {
      return NextResponse.json(
        { error: "استخدم نقطة إضافة جيمات البلياردو للبلياردو." },
        { status: 400 }
      );
    }

    let finalPricePerGame = price_per_game;

    if (finalPricePerGame === undefined) {
      const stationType = session.stations.station_type;
      const { data: rule, error: ruleError } = await supabase
        .from("pricing_rules")
        .select("rate")
        .eq("shop_id", shopId)
        .eq("station_type", stationType)
        .eq("play_type", "normal")
        .eq("play_subtype", mode as PricingMode)
        .eq("unit", "game")
        .limit(1)
        .maybeSingle();

      if (ruleError || !rule) {
        return NextResponse.json(
          { error: "قاعدة التسعير لهذا النوع غير موجودة." },
          { status: 404 }
        );
      }

      finalPricePerGame = Number(rule.rate);
    }

    const { data: entry, error: insertError } = await supabase
      .from("station_game_entries")
      .insert({
        shop_id: shopId,
        session_id,
        mode: mode as PricingMode,
        games_count,
        price_per_game: finalPricePerGame,
      })
      .select()
      .maybeSingle();

    if (insertError || !entry) {
      console.error("Failed to add station game entry:", insertError);
      return NextResponse.json(
        { error: "Failed to add game entry" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, entry });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error adding station game entry:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
