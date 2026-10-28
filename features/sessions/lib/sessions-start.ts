import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import { assertPermission, PermissionError } from "@/lib/auth/permissions";
import { isMissingGamesModelColumn } from "@/features/sessions/lib/games-model";
import type { Database } from "@/types";

/**
 * POST /api/sessions/start — starts a new session on a station
 * Body: { station_id: string, mode: 'single' | 'multi', billing_mode: 'time' | 'games', games_count?: number, play_type?: 'normal' | 'combo', play_subtype?: 'single' | 'multi' | 'triple' | 'quad' }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify session
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySessionCookieValue(sessionCookie);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await assertPermission(session.user_id, "manage_sessions");

    // Parse body
    const body = await request.json();
    const { station_id, mode, billing_mode, games_count, play_type, play_subtype } = body ?? {};

    if (typeof station_id !== "string" || station_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الجهاز مطلوب." },
        { status: 400 }
      );
    }

    if (billing_mode !== "time" && billing_mode !== "games") {
      return NextResponse.json(
        { error: "طريقة الفوترة غير صالحة." },
        { status: 400 }
      );
    }

    if (games_count !== undefined) {
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
    }

    // Validate optional play_type (billiard-specific)
    if (play_type !== undefined && play_type !== "normal" && play_type !== "combo") {
      return NextResponse.json(
        { error: "نوع اللعب غير صالح." },
        { status: 400 }
      );
    }

    // Validate optional play_subtype (billiard-specific)
    if (
      play_subtype !== undefined &&
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

    const supabase = createAdminClient();

    // Get user shop_id
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

    // Verify station belongs to the shop
    const { data: station, error: stationError } = await supabase
      .from("stations")
      .select("id, station_type")
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

    // Station-type-dependent validations
    if (station.station_type !== "billiard") {
      if (billing_mode === "time") {
        // Mode is required for time billing
        if (mode !== "single" && mode !== "multi") {
          return NextResponse.json(
            { error: "وضع الجلسة مطلوب." },
            { status: 400 }
          );
        }
      }
    } else {
      // Billiard+time: play_type and play_subtype are required
      if (billing_mode === "time") {
        if (!play_type) {
          return NextResponse.json(
            { error: "نوع اللعب مطلوب للبلياردو بالوقت." },
            { status: 400 }
          );
        }
        if (!play_subtype) {
          return NextResponse.json(
            { error: "النوع الفرعي مطلوب للبلياردو بالوقت." },
            { status: 400 }
          );
        }
      }
    }

    // Validate play_type/play_subtype are only allowed for billiard
    if ((play_type || play_subtype) && station.station_type !== "billiard") {
      return NextResponse.json(
        { error: "نوع اللعب والنوع الفرعي متاحان فقط للبلياردو." },
        { status: 400 }
      );
    }

    // Check if the station type is enabled in shop settings
    const { data: shopSettings, error: shopErr } = await supabase
      .from("shops")
      .select("ps_enabled, billiard_enabled, pingpong_enabled")
      .eq("id", shopId)
      .limit(1)
      .maybeSingle();

    if (shopErr || !shopSettings) {
      console.error("Failed to fetch shop settings:", shopErr);
      return NextResponse.json(
        { error: "Failed to verify shop settings" },
        { status: 500 }
      );
    }

    const typeToEnabledFlag: Record<string, keyof typeof shopSettings> = {
      playstation: "ps_enabled",
      billiard: "billiard_enabled",
      pingpong: "pingpong_enabled",
    };

    const flagName = typeToEnabledFlag[station.station_type];
    if (flagName && !shopSettings[flagName]) {
      const typeLabels: Record<string, string> = {
        playstation: "البلايستيشن",
        billiard: "البلياردو",
        pingpong: "البينغ بونغ",
      };
      return NextResponse.json(
        { error: `${typeLabels[station.station_type] || "هذا النوع"} معطل حاليًا من الإعدادات` },
        { status: 400 }
      );
    }

    // Get the current open shift
    const { data: openShift, error: shiftError } = await supabase
      .from("shifts")
      .select("id")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (shiftError) {
      console.error("Failed to get open shift:", shiftError);
      return NextResponse.json(
        { error: "Failed to get open shift" },
        { status: 500 }
      );
    }

    if (!openShift) {
      return NextResponse.json(
        { error: "لا يمكن بدء جلسة بدون وردية مفتوحة. يرجى فتح وردية أولاً." },
        { status: 400 }
      );
    }

    // Check if there's already an active session on this station
    const { data: existingSession, error: existingError } = await supabase
      .from("sessions")
      .select("id")
      .eq("station_id", station_id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Failed to check existing session:", existingError);
      return NextResponse.json(
        { error: "Failed to check existing session" },
        { status: 500 }
      );
    }

    if (existingSession) {
      return NextResponse.json(
        { error: "يوجد جلسة نشطة بالفعل على هذا الجهاز." },
        { status: 409 }
      );
    }

    // Create the new session
    const insertData: Record<string, unknown> = {
      shop_id: shopId,
      shift_id: openShift.id,
      station_id: station_id,
      billing_mode: billing_mode,
      status: "active",
      start_time: new Date().toISOString(),
    };

    if (station.station_type === "billiard") {
      if (billing_mode === "time") {
        insertData.mode = play_subtype === "single" ? "single" : "multi";
        insertData.play_type = play_type;
        insertData.play_subtype = play_subtype;
      } else {
        // Billiard+games: mode is informational, default to "single"
        insertData.mode = "single";
        insertData.games_model = "entries";
      }
    } else {
      // PS/pingpong+games: mode defaults to single (like billiard+games); optional pre-start
      // entry is created via add-station-game-entry after session creation, not here.
      insertData.mode = billing_mode === "time" ? (mode ?? "single") : "single";
      if (billing_mode === "games") {
        insertData.games_model = "entries";
      } else if (games_count !== undefined) {
        insertData.games_count = games_count;
      }
    }

    let { data: newSession, error: sessionError } = await supabase
      .from("sessions")
      .insert(insertData as Database["public"]["Tables"]["sessions"]["Insert"])
      .select()
      .maybeSingle();

    if (isMissingGamesModelColumn(sessionError) && "games_model" in insertData) {
      const insertDataWithoutGamesModel = { ...insertData };
      delete insertDataWithoutGamesModel.games_model;
      const fallbackInsert = await supabase
        .from("sessions")
        .insert(insertDataWithoutGamesModel as Database["public"]["Tables"]["sessions"]["Insert"])
        .select()
        .maybeSingle();

      newSession = fallbackInsert.data;
      sessionError = fallbackInsert.error;
    }

    if (sessionError || !newSession) {
      console.error("Failed to create session:", sessionError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, session: newSession });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error starting session:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
