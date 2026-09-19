import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import type { ArchiveShift, ArchiveShiftRow } from "@/types/archive";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("shifts")
      .select(`
        id,
        shift_number,
        opened_at,
        closed_at,
        status,
        responsible_name,
        opened_by_user_id,
        users ( display_name ),
        sessions (
          id,
          station_id,
          mode,
          billing_mode,
          status,
          start_time,
          end_time,
          games_count,
          calculated_cost,
          duration_hours,
          stations ( name, station_type )
        ),
      sale_items (
        id,
        session_id,
        product_id,
          quantity,
          unit_price,
          total_price,
          products ( name )
        )
      `)
      .eq("shop_id", shopId)
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json(
        { error: "الوردية غير موجودة." },
        { status: 404 }
      );
    }

    const row = data as unknown as ArchiveShiftRow;

    const sessionsCost =
      row.sessions?.reduce(
        (sum, s) => sum + (Number(s.calculated_cost) || 0),
        0
      ) ?? 0;
    const saleItemsRevenue =
      row.sale_items?.reduce(
        (sum, s) => sum + (s.session_id == null ? Number(s.total_price) || 0 : 0),
        0
      ) ?? 0;

    const shift: ArchiveShift = {
      id: row.id,
      shift_number: row.shift_number,
      opened_at: row.opened_at,
      closed_at: row.closed_at,
      responsible_name: row.responsible_name,
      opened_by_user_name: row.users?.display_name ?? null,
      sessions: row.sessions ?? [],
      sale_items: row.sale_items ?? [],
      total_revenue: sessionsCost + saleItemsRevenue,
    };

    return NextResponse.json({ shift });
  } catch (err) {
    console.error("Error in GET /api/archive/shifts/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
