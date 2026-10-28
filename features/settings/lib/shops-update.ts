import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import type { StationType } from "@/types/database";
import { assertPermission, PermissionError } from "@/lib/auth/permissions";

/**
 * Partial update for the authenticated user's shop.
 *
 * Accepted fields (all optional):
 *   - name
 *   - owner_name
 *   - ps_enabled
 *   - billiard_enabled
 *   - pingpong_enabled
 *   - shifts_per_day        (validated 1..4 here AND in DB)
 *   - ps_station_count      (validated >= 0; syncs stations table)
 *   - billiard_table_count  (validated >= 0; syncs stations table)
 *   - pingpong_table_count  (validated >= 0; syncs stations table)
 *
 * Only fields present in the body are applied. Unknown fields are ignored.
 */

/**
 * Syncs the stations table to match the requested count for a given station type.
 * Creates new stations if count increased, deactivates excess stations if count decreased.
 */
async function syncStations(
  shopId: string,
  stationType: StationType,
  targetCount: number
) {
  const supabase = createAdminClient();

  // Get current active stations for this type
  const { data: currentStations, error: fetchError } = await supabase
    .from("stations")
    .select("id, sort_order")
    .eq("shop_id", shopId)
    .eq("station_type", stationType)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (fetchError) {
    console.error("Failed to fetch current stations:", fetchError);
    return;
  }

  const currentCount = currentStations?.length || 0;

  // If count increased, create new stations
  if (targetCount > currentCount) {
    const newStations = [];
    for (let i = 0; i < targetCount - currentCount; i++) {
      newStations.push({
        shop_id: shopId,
        station_type: stationType,
        name: getDefaultStationName(stationType, currentCount + i + 1),
        sort_order: currentCount + i,
        is_active: true,
      });
    }

    if (newStations.length > 0) {
      const { error: insertError } = await supabase
        .from("stations")
        .insert(newStations);
      if (insertError) {
        console.error("Failed to create new stations:", insertError);
      }
    }
  }
  // If count decreased, deactivate excess stations
  else if (targetCount < currentCount) {
    const stationIdsToDeactivate = currentStations
      .slice(targetCount)
      .map((s) => s.id);

    if (stationIdsToDeactivate.length > 0) {
      const { error: updateError } = await supabase
        .from("stations")
        .update({ is_active: false })
        .in("id", stationIdsToDeactivate);
      if (updateError) {
        console.error("Failed to deactivate stations:", updateError);
      }
    }
  }
}

/**
 * Returns the default name for a new station based on its type and number.
 */
function getDefaultStationName(stationType: StationType, number: number): string {
  switch (stationType) {
    case "playstation":
      return `جهاز ${number}`;
    case "billiard":
      return `طاولة ${number}`;
    case "pingpong":
      return `طاولة ${number}`;
    default:
      return `جهاز ${number}`;
  }
}
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

    await assertPermission(session.user_id, "manage_settings");

    // 2. Parse body
    const body = await request.json();
    const {
      name,
      owner_name,
      ps_enabled,
      billiard_enabled,
      pingpong_enabled,
      shifts_per_day,
      ps_station_count,
      billiard_table_count,
      pingpong_table_count,
    } = body ?? {};

    // 3. Build update payload — only known, type-valid fields are applied.
    const update: Partial<{ name: string; owner_name: string | null; ps_enabled: boolean; billiard_enabled: boolean; pingpong_enabled: boolean; shifts_per_day: number; ps_station_count: number; billiard_table_count: number; pingpong_table_count: number }> = {};

    if (typeof name === "string") {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: "اسم المحل لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }
      update.name = trimmed;
    }

    if (typeof owner_name === "string") {
      const trimmed = owner_name.trim();
      if (trimmed.length === 0) {
        return NextResponse.json(
          { error: "اسم صاحب المحل لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }
      update.owner_name = trimmed;
    }

    if (typeof ps_enabled === "boolean") {
      update.ps_enabled = ps_enabled;
    }

    if (typeof billiard_enabled === "boolean") {
      update.billiard_enabled = billiard_enabled;
    }

    if (typeof pingpong_enabled === "boolean") {
      update.pingpong_enabled = pingpong_enabled;
    }

    if (shifts_per_day !== undefined) {
      // Server-side validation — enforced here regardless of DB constraint
      // (decision: sensitive validation must come from the server, not only DB).
      if (
        typeof shifts_per_day !== "number" ||
        !Number.isInteger(shifts_per_day) ||
        shifts_per_day < 1 ||
        shifts_per_day > 4
      ) {
        return NextResponse.json(
          { error: "عدد الورديات اليومية يجب أن يكون عددًا صحيحًا بين 1 و 4." },
          { status: 400 }
        );
      }
      update.shifts_per_day = shifts_per_day;
    }

    if (ps_station_count !== undefined) {
      if (
        typeof ps_station_count !== "number" ||
        !Number.isInteger(ps_station_count) ||
        ps_station_count < 0
      ) {
        return NextResponse.json(
          { error: "عدد أجهزة البلايستيشن يجب أن يكون عددًا صحيحًا غير سالب." },
          { status: 400 }
        );
      }
      update.ps_station_count = ps_station_count;
    }

    if (billiard_table_count !== undefined) {
      if (
        typeof billiard_table_count !== "number" ||
        !Number.isInteger(billiard_table_count) ||
        billiard_table_count < 0
      ) {
        return NextResponse.json(
          { error: "عدد طاولات البلياردو يجب أن يكون عددًا صحيحًا غير سالب." },
          { status: 400 }
        );
      }
      update.billiard_table_count = billiard_table_count;
    }

    if (pingpong_table_count !== undefined) {
      if (
        typeof pingpong_table_count !== "number" ||
        !Number.isInteger(pingpong_table_count) ||
        pingpong_table_count < 0
      ) {
        return NextResponse.json(
          { error: "عدد طاولات البينغ بونغ يجب أن يكون عددًا صحيحًا غير سالب." },
          { status: 400 }
        );
      }
      update.pingpong_table_count = pingpong_table_count;
    }

    // 4. Nothing to update?
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "لم يتم إرسال أي حقل صالح للتحديث." },
        { status: 400 }
      );
    }

    // 5. Get user shop_id
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

    // 6. Apply update
    const { data: updatedShop, error: updateError } = await supabase
      .from("shops")
      .update(update)
      .eq("id", shopId)
      .select("id, name, owner_name, ps_enabled, billiard_enabled, pingpong_enabled, shifts_per_day, ps_station_count, billiard_table_count, pingpong_table_count")
      .maybeSingle();

    if (updateError || !updatedShop) {
      console.error("Failed to update shop:", updateError);
      return NextResponse.json(
        { error: "Failed to update shop" },
        { status: 500 }
      );
    }

    // 8. Sync stations when station counts change
    if ("ps_station_count" in update) {
      await syncStations(shopId, "playstation", updatedShop.ps_station_count);
    }
    if ("billiard_table_count" in update) {
      await syncStations(shopId, "billiard", updatedShop.billiard_table_count);
    }
    if ("pingpong_table_count" in update) {
      await syncStations(shopId, "pingpong", updatedShop.pingpong_table_count);
    }

    return NextResponse.json({
      ok: true,
      shop: updatedShop,
    });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error updating shop:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
