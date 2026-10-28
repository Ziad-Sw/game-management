import { NextRequest, NextResponse } from "next/server";

import type { StationType } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";

/**
 * GET /api/stations/list — returns stations for the shop, optionally filtered by station_type
 * Query params: station_type (optional) - 'playstation', 'billiard', or 'pingpong'
 * Returns: stations with their current status (empty/active) based on active sessions
 */
export async function GET(request: NextRequest) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const stationTypeParam = searchParams.get("station_type");
    const validTypes: readonly StationType[] = ["playstation", "billiard", "pingpong"];
    const stationType = validTypes.find((type) => type === stationTypeParam);

    const supabase = createAdminClient();

    // Check which station types are enabled in the shop
    const { data: shopSettings, error: shopError } = await supabase
      .from("shops")
      .select("ps_enabled, billiard_enabled, pingpong_enabled")
      .eq("id", shopId)
      .limit(1)
      .maybeSingle();

    if (shopError || !shopSettings) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 }
      );
    }

    const enabledTypes: Record<string, boolean> = {
      playstation: shopSettings.ps_enabled,
      billiard: shopSettings.billiard_enabled,
      pingpong: shopSettings.pingpong_enabled,
    };

    // Build query
    let query = supabase
      .from("stations")
      .select(`
        id,
        name,
        station_type,
        sort_order,
        is_active,
        sessions (
          id,
          status
        )
      `)
      .eq("shop_id", shopId)
      .eq("is_active", true);

    if (stationType) {
      query = query.eq("station_type", stationType);
    }

    const { data: stations, error } = await query.order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch stations:", error);
      return NextResponse.json(
        { error: "Failed to fetch stations" },
        { status: 500 }
      );
    }

    // Filter out stations whose type is disabled in shop settings
    const filteredStations = (stations ?? []).filter(
      (s) => enabledTypes[s.station_type] !== false
    );

    // Determine station status based on active sessions
    const stationsWithStatus = filteredStations.map((station) => {
      const hasActiveSession = station.sessions && station.sessions.some(
        (session) => session.status === "active"
      );
      return {
        id: station.id,
        name: station.name,
        station_type: station.station_type,
        sort_order: station.sort_order,
        is_active: station.is_active,
        status: hasActiveSession ? "active" : "empty",
      };
    });

    return NextResponse.json({ stations: stationsWithStatus });
  } catch (err) {
    console.error("Error fetching stations:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
