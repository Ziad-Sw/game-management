import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/shared/authenticated-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import PingpongSettingsForm from "@/components/settings/pingpong-settings-form";
import { getUserPermissions } from "@/lib/auth/permissions";
import type { PricingRule } from "@/types";

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
    .select("id, name, pingpong_enabled, pingpong_table_count")
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

async function getPricingRules(shopId: string) {
  const supabase = createAdminClient();
  const { data: rules, error } = await supabase
    .from("pricing_rules")
    .select("id, station_type, mode, unit, rate")
    .eq("shop_id", shopId)
    .eq("station_type", "pingpong");

  if (error) {
    return [];
  }

  return (rules as PricingRule[]) || [];
}

export default async function PingpongSettingsPage() {
  const user = await getCurrentUser();
  const userPerms = user ? await getUserPermissions(user.id) : null;
  const shopData = user ? await getShopData(user.shop_id) : null;
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;
  const pricingRules = user ? await getPricingRules(user.shop_id) : [];

  if (!user || !shopData) {
    return <div>Error loading settings</div>;
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">إعدادات البينغ بونغ</h1>
          <p className="mt-2 text-foreground-muted">إدارة طاولات البينغ بونغ وتسعيرها</p>
        </div>

        <PingpongSettingsForm
          initialPingpongEnabled={shopData.pingpong_enabled}
          initialPricingRules={pricingRules}
          initialTableCount={shopData.pingpong_table_count || 0}
          canEdit={userPerms?.role === "owner" || userPerms?.permissions?.manage_settings === true}
        />
      </div>
    </AuthenticatedShell>
  );
}
