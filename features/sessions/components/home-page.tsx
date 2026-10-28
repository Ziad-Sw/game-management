import Link from "next/link";
import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/shared/authenticated-shell";
import { ShiftControl } from "@/features/shifts/components/shift-control";
import { StationsGrid } from "@/features/sessions/components/stations-grid";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserPermissions } from "@/lib/auth/permissions";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";

async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return null;
  }

  const session = await verifySessionCookieValue(sessionCookie);
  if (!session) {
    return null;
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, login_id, display_name, role, shop_id")
    .eq("id", session.user_id)
    .limit(1)
    .maybeSingle();

  if (error || !user) {
    return null;
  }

  return user;
}

async function getShopName(shopId: string) {
  const supabase = createAdminClient();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("name")
    .eq("id", shopId)
    .limit(1)
    .maybeSingle();

  if (error || !shop) {
    return "المحل";
  }

  return shop.name;
}

async function getOwnerName(shopId: string) {
  const supabase = createAdminClient();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("owner_name")
    .eq("id", shopId)
    .limit(1)
    .maybeSingle();

  if (error || !shop) {
    return null;
  }

  return shop.owner_name;
}

export default async function Home() {
  const user = await getCurrentUser();
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;

  const title = user
    ? `مرحبًا ${user.display_name || "صاحب المحل"}`
    : "مرحبًا بك في نظام إدارة المحل";
  const subtitle = user
    ? `تم تسجيل الدخول بنجاح`
    : "يجب أن تقودك هذه الصفحة بعد تسجيل دخول ناجح إلى النظام.";

  const userPerms = user ? await getUserPermissions(user.id) : null;
  const canManageSessions = userPerms?.role === "owner" || userPerms?.permissions?.manage_sessions === true;
  const canManageShifts = userPerms?.role === "owner" || userPerms?.permissions?.manage_shifts === true;

  const content = (
    <div className="flex flex-1 flex-col px-6 py-6">
      <div className="space-y-6">
        <ShiftControl canManageShifts={canManageShifts} />
        
        {user ? (
          <StationsGrid canManageSessions={canManageSessions} />
        ) : (
          <div className="rounded-xl bg-surface-card p-8 shadow-none">
            <p className="text-sm text-foreground-muted">نظام إدارة المحل</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-4 text-foreground-muted">{subtitle}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-surface-page"
              >
                الانتقال إلى تسجيل الدخول
              </Link>
              <span className="inline-flex h-11 items-center justify-center rounded-lg border border-foreground-muted/30 px-6 text-sm text-foreground-muted">
                Dark mode فقط
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (!user) {
    return content;
  }

  return <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>{content}</AuthenticatedShell>;
}
