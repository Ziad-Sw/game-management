import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import type { PlayType, PlaySubtype } from "@/types";

/**
 * POST /api/sessions/add-game-entry — adds a game entry to a billiard session
 * Body: { session_id: string, games_count: number, play_type: 'normal' | 'combo', play_subtype: PlaySubtype, price_per_game?: number }
 *
 * If price_per_game is omitted, it is looked up from the pricing_rules table
 * using (shop_id, station_type=billiard, play_type, play_subtype, unit=game).
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
    const { session_id, games_count, play_type, play_subtype, price_per_game } = body ?? {};

    // Validate session_id
    if (typeof session_id !== "string" || session_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الجلسة مطلوب." },
        { status: 400 }
      );
    }

    // Validate games_count
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

    // Validate play_type
    if (play_type !== "normal" && play_type !== "combo") {
      return NextResponse.json(
        { error: "نوع اللعب غير صالح." },
        { status: 400 }
      );
    }

    // Validate play_subtype
    if (
      play_subtype !== "single" &&
      play_subtype !== "multi" &&
      play_subtype !== "triple" &&
      play_subtype !== "quad"
    ) {
      return NextResponse.json(
        { error: "النوع الفرعي للعب غير صالح." },
        { status: 400 }
      );
    }

    // Validate optional price_per_game
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

    // Verify session exists, is active, and belongs to shop
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

    if (session.stations.station_type !== "billiard") {
      return NextResponse.json(
        { error: "يمكن إضافة جيمات فقط لجلسات البلياردو." },
        { status: 400 }
      );
    }

    // Resolve price_per_game from pricing_rules if not provided
    let finalPricePerGame = price_per_game;

    if (finalPricePerGame === undefined) {
      const { data: rule, error: ruleError } = await supabase
        .from("pricing_rules")
        .select("rate")
        .eq("shop_id", shopId)
        .eq("station_type", "billiard")
        .eq("play_type", play_type as PlayType)
        .eq("play_subtype", play_subtype as PlaySubtype)
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

    // Insert the game entry
    const { data: entry, error: insertError } = await supabase
      .from("billiard_game_entries")
      .insert({
        shop_id: shopId,
        session_id,
        play_type: play_type as PlayType,
        play_subtype: play_subtype as PlaySubtype,
        games_count,
        price_per_game: finalPricePerGame,
      })
      .select()
      .maybeSingle();

    if (insertError || !entry) {
      console.error("Failed to add game entry:", insertError);
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
    console.error("Error adding game entry:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
