import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/shared/authenticated-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import ShiftsSettingsForm from "@/features/settings/components/shifts-settings-form";
import { getUserPermissions } from "@/lib/auth/permissions";

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

async function getShopData(shopId: string) {
  const supabase = createAdminClient();
  const { data: shop, error } = await supabase
    .from("shops")
    .select("id, name, shifts_per_day")
    .eq("id", shopId)
    .limit(1)
    .maybeSingle();

  if (error || !shop) {
    return null;
  }

  return shop;
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

export default async function ShiftsSettingsPage() {
  const user = await getCurrentUser();
  const userPerms = user ? await getUserPermissions(user.id) : null;
  const shopData = user ? await getShopData(user.shop_id) : null;
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;

  if (!user || !shopData) {
    return <div>Error loading settings</div>;
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">إعدادات الورديات</h1>
          <p className="mt-2 text-foreground-muted">تحديد عدد الورديات اليومية المسموح بها</p>
        </div>

        <ShiftsSettingsForm
          initialShiftsPerDay={shopData.shifts_per_day}
          canEdit={userPerms?.role === "owner" || userPerms?.permissions?.manage_settings === true}
        />
      </div>
    </AuthenticatedShell>
  );
}
