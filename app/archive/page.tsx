import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/layout/authenticated-shell";
import CalendarGrid from "@/components/archive/calendar-grid";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import type { ArchiveShift, ArchiveShiftRow } from "@/types/archive";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  const session = await verifySessionCookieValue(sessionCookie);
  if (!session) return null;

  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("users")
    .select("id, login_id, display_name, role, shop_id")
    .eq("id", session.user_id)
    .limit(1)
    .maybeSingle();

  return user;
}

async function getShopName(shopId: string) {
  const supabase = createAdminClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("name")
    .eq("id", shopId)
    .limit(1)
    .maybeSingle();

  return shop?.name ?? "المحل";
}

async function getOwnerName(shopId: string) {
  const supabase = createAdminClient();
  const { data: shop } = await supabase
    .from("shops")
    .select("owner_name")
    .eq("id", shopId)
    .limit(1)
    .maybeSingle();

  return shop?.owner_name ?? null;
}

async function getArchiveShifts(shopId: string): Promise<ArchiveShift[]> {
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
    return [];
  }

  const rows = (data ?? []) as unknown as ArchiveShiftRow[];

  return rows.map((row) => {
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
}

export default async function ArchivePage() {
  const user = await getCurrentUser();
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;
  const shifts = user ? await getArchiveShifts(user.shop_id) : [];

  if (!user) {
    return <div>Error loading archive</div>;
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">أرشيف الورديات</h1>
          <p className="mt-2 text-foreground-muted">
            عرض الورديات المقفولة خلال آخر 30 يوم
          </p>
        </div>

        <CalendarGrid shifts={shifts} />
      </div>
    </AuthenticatedShell>
  );
}
