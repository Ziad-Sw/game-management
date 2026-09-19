import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import AuthenticatedShell from "@/components/layout/authenticated-shell";
import { formatCurrency, formatCount } from "@/lib/format/number";
import { formatDateTime, formatTime } from "@/lib/format/time";
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

async function getShiftDetail(
  shopId: string,
  shiftId: string
): Promise<ArchiveShift | null> {
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
      ),
      expenses (
        id,
        description,
        amount,
        category,
        shifts ( responsible_name )
      )
    `)
    .eq("shop_id", shopId)
    .eq("id", shiftId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

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
  const expensesTotal =
    row.expenses?.reduce(
      (sum, e) => sum + (Number(e.amount) || 0),
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
    expenses: (row.expenses ?? []).map((e) => ({
      id: e.id,
      description: e.description,
      amount: Number(e.amount),
      category: e.category,
      responsible_name: e.shifts?.responsible_name ?? null,
    })),
    total_revenue: sessionsCost + saleItemsRevenue,
    expensesTotal,
  };
}

function getStationTypeLabel(stationType: string): string {
  switch (stationType) {
    case "playstation": return "بلايستيشن";
    case "billiard": return "بلياردو";
    case "pingpong": return "بينغ بونغ";
    default: return stationType;
  }
}

function getBillingModeLabel(mode: string): string {
  return mode === "time" ? "بالوقت" : "بالجيمات";
}

function getModeLabel(mode: string): string {
  return mode === "single" ? "فردي" : "مالتي";
}

function formatDuration(isoStart: string, isoEnd: string | null): string {
  if (!isoEnd) return "—";
  const start = new Date(isoStart).getTime();
  const end = new Date(isoEnd).getTime();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / 3600000);
  const minutes = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 0) return `${hours}س ${minutes}د`;
  return `${minutes}د`;
}

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;
  const shift = user ? await getShiftDetail(user.shop_id, id) : null;

  if (!user) {
    return <div>Error loading shift detail</div>;
  }

  if (!shift) {
    notFound();
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/archive"
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          → العودة إلى أرشيف الورديات
        </Link>

        {/* Shift header */}
        <div className="rounded-xl bg-surface-card p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                الوردية #{formatCount(shift.shift_number)}
              </h1>
              <p className="mt-1 text-sm text-foreground-muted">
                {formatDateTime(shift.opened_at)}
              </p>
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(shift.total_revenue)}
              </p>
              <p className="text-xs text-foreground-muted mt-1">إجمالي الإيرادات</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-surface-page/50 p-3">
              <p className="text-xs text-foreground-muted">وقت الفتح</p>
              <p className="mt-1 text-sm text-foreground font-medium">
                {formatTime(shift.opened_at)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-page/50 p-3">
              <p className="text-xs text-foreground-muted">وقت الإغلاق</p>
              <p className="mt-1 text-sm text-foreground font-medium">
                {formatTime(shift.closed_at)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-page/50 p-3">
              <p className="text-xs text-foreground-muted">المسؤول</p>
              <p className="mt-1 text-sm text-foreground font-medium">
                {shift.responsible_name}
              </p>
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div className="rounded-xl bg-surface-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            الجلسات ({formatCount(shift.sessions.length)})
          </h2>

          {shift.sessions.length === 0 ? (
            <p className="text-sm text-foreground-muted">لا توجد جلسات في هذه الوردية.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground-muted/10">
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">الجهاز</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">النوع</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">الوضع</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">المدة / الجيمات</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">التكلفة</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.sessions.map((session) => (
                    <tr key={session.id} className="border-b border-foreground-muted/5">
                      <td className="py-3 px-2 text-foreground">
                        {session.stations?.name ?? "—"}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {getStationTypeLabel(session.stations?.station_type ?? "")}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {getBillingModeLabel(session.billing_mode)} · {getModeLabel(session.mode)}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {session.billing_mode === "games"
                          ? `${formatCount(session.games_count ?? 0)} جيم`
                          : formatDuration(session.start_time, session.end_time)}
                      </td>
                      <td className="py-3 px-2 text-foreground font-medium">
                        {session.calculated_cost != null
                          ? formatCurrency(Number(session.calculated_cost))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sale Items */}
        <div className="rounded-xl bg-surface-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            المبيعات ({formatCount(shift.sale_items.length)})
          </h2>

          {shift.sale_items.length === 0 ? (
            <p className="text-sm text-foreground-muted">لا توجد مبيعات في هذه الوردية.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground-muted/10">
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">المنتج</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">الكمية</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">السعر</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">الإجمالي</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.sale_items.map((item) => (
                    <tr key={item.id} className="border-b border-foreground-muted/5">
                      <td className="py-3 px-2 text-foreground">
                        {item.products?.name ?? "—"}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {formatCount(item.quantity)}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {formatCurrency(Number(item.unit_price))}
                      </td>
                      <td className="py-3 px-2 text-foreground font-medium">
                        {formatCurrency(Number(item.total_price))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Expenses */}
        <div className="rounded-xl bg-surface-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            المصاريف ({formatCount((shift.expenses ?? []).length)})
          </h2>

          {(shift.expenses ?? []).length === 0 ? (
            <p className="text-sm text-foreground-muted">لا توجد مصاريف في هذه الوردية.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-foreground-muted/10">
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">الوصف</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">الفئة</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">المبلغ</th>
                    <th className="text-right py-3 px-2 text-foreground-muted font-medium">المسؤول</th>
                  </tr>
                </thead>
                <tbody>
                  {(shift.expenses ?? []).map((expense) => (
                    <tr key={expense.id} className="border-b border-foreground-muted/5">
                      <td className="py-3 px-2 text-foreground">
                        {expense.description}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {expense.category || "—"}
                      </td>
                      <td className="py-3 px-2 text-foreground font-medium">
                        {formatCurrency(Number(expense.amount))}
                      </td>
                      <td className="py-3 px-2 text-foreground-muted">
                        {expense.responsible_name || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Total profit */}
        <div className="rounded-xl bg-surface-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            إجمالي الأرباح
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg bg-surface-page/50 p-4">
              <p className="text-xs text-foreground-muted">الإجمالي قبل المصاريف</p>
              <p className="mt-1 text-xl font-bold text-foreground">
                {formatCurrency(shift.total_revenue)}
              </p>
            </div>
            <div className="rounded-lg bg-surface-page/50 p-4">
              <p className="text-xs text-foreground-muted">الإجمالي بعد المصاريف</p>
              <p className="mt-1 text-xl font-bold text-primary">
                {formatCurrency(shift.total_revenue - (shift.expensesTotal ?? 0))}
              </p>
            </div>
          </div>
        </div>

        {/* Total revenue summary card */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-foreground">إجمالي الإيرادات</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(shift.total_revenue)}
            </span>
          </div>
        </div>
      </div>
    </AuthenticatedShell>
  );
}
