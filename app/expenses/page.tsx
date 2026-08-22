import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/layout/authenticated-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import { getUserPermissions } from "@/lib/auth/permissions";
import type { Database } from "@/types";
import ExpensesList from "@/components/expenses/expenses-list";

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

async function getExpenses(shopId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("expenses")
    .select(`
      id,
      shop_id,
      shift_id,
      description,
      amount,
      category,
      expense_date,
      created_at,
      shifts ( shift_number, responsible_name )
    `)
    .eq("shop_id", shopId)
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });

  return (data ?? []).map(
    (row: Database["public"]["Tables"]["expenses"]["Row"] & { shifts: { shift_number: number; responsible_name: string } | null }) => ({
      id: row.id,
      shop_id: row.shop_id,
      shift_id: row.shift_id,
      description: row.description,
      amount: Number(row.amount),
      category: row.category,
      expense_date: row.expense_date,
      created_at: row.created_at,
      shift_number: row.shifts?.shift_number ?? null,
      responsible_name: row.shifts?.responsible_name ?? null,
    })
  );
}

export default async function ExpensesPage() {
  const user = await getCurrentUser();
  const userPerms = user ? await getUserPermissions(user.id) : null;
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;
  const canManageSettings = userPerms?.role === "owner" || userPerms?.permissions?.manage_settings === true;
  const expenses = user && canManageSettings ? await getExpenses(user.shop_id) : [];

  if (!user) {
    return <div>Error loading page</div>;
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">المصاريف</h1>
          <p className="mt-2 text-foreground-muted">تسجيل ومتابعة مصاريف المحل اليومية</p>
        </div>

        {!canManageSettings ? (
          <div className="rounded-xl bg-surface-card p-8 text-center">
            <p className="text-foreground-muted">ليس لديك صلاحية لعرض المصاريف.</p>
          </div>
        ) : (
          <ExpensesList initialExpenses={expenses} canEdit={canManageSettings} />
        )}
      </div>
    </AuthenticatedShell>
  );
}
