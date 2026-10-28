import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/shared/authenticated-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import TeamManagementForm from "@/features/team/components/team-form";
import { getUserPermissions } from "@/lib/auth/permissions";
import type { User } from "@/types";

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

async function getTeamMembers(shopId: string) {
  const supabase = createAdminClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, login_id, display_name, email, role, permissions, is_active, created_at")
    .eq("shop_id", shopId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (users as User[]) || [];
}

export default async function TeamSettingsPage() {
  const user = await getCurrentUser();
  const userPerms = user ? await getUserPermissions(user.id) : null;
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;
  const teamMembers = user ? await getTeamMembers(user.shop_id) : [];

  if (!user) {
    return <div>Error loading settings</div>;
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">إدارة الفريق</h1>
          <p className="mt-2 text-foreground-muted">إضافة وتعديل وحذف أعضاء الفريق وصلاحياتهم</p>
        </div>

        <TeamManagementForm
          initialTeamMembers={teamMembers}
          canEdit={userPerms?.role === "owner" || userPerms?.permissions?.manage_team === true}
        />
      </div>
    </AuthenticatedShell>
  );
}
