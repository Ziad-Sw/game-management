import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import type { ArchiveShift, ArchiveShiftRow } from "@/types/archive";

export async function GET() {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

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
      .eq("status", "closed")
      .not("closed_at", "is", null)
      .gte("opened_at", thirtyDaysAgo.toISOString())
      .order("opened_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch archive shifts:", error);
      return NextResponse.json(
        { error: "فشل تحميل أرشيف الورديات." },
        { status: 500 }
      );
    }

    const rows = (data ?? []) as unknown as ArchiveShiftRow[];

    const shifts: ArchiveShift[] = rows.map((row) => {
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

      return {
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
    });

    return NextResponse.json({ shifts });
  } catch (err) {
    console.error("Error in GET /api/archive/shifts:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
