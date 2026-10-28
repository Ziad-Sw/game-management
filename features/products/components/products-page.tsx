import { cookies } from "next/headers";

import AuthenticatedShell from "@/components/shared/authenticated-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookieValue,
} from "@/lib/auth/session";
import ProductsSettingsForm from "@/features/products/components/products-settings-form";
import { getUserPermissions } from "@/lib/auth/permissions";
import type { Product } from "@/types";

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

async function getProducts(shopId: string) {
  const supabase = createAdminClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, is_active")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

  if (error) {
    return [];
  }

  return (products as Product[]) || [];
}

export default async function ProductsSettingsPage() {
  const user = await getCurrentUser();
  const userPerms = user ? await getUserPermissions(user.id) : null;
  const shopName = user ? await getShopName(user.shop_id) : "المحل";
  const ownerName = user ? await getOwnerName(user.shop_id) : null;
  const products = user ? await getProducts(user.shop_id) : [];

  if (!user) {
    return <div>Error loading settings</div>;
  }

  return (
    <AuthenticatedShell user={user} shopName={shopName} ownerName={ownerName}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">إدارة المشروبات</h1>
          <p className="mt-2 text-foreground-muted">إضافة وتعديل وحذف المشروبات وأسعارها</p>
        </div>

        <ProductsSettingsForm
          initialProducts={products}
          canEdit={userPerms?.role === "owner" || userPerms?.permissions?.manage_settings === true}
        />
      </div>
    </AuthenticatedShell>
  );
}
