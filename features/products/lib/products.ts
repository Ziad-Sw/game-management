import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

/**
 * Returns all active products (drinks) for the authenticated shop.
 */
export async function GET() {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("id, name, price, is_active")
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Failed to fetch products:", error);
      return NextResponse.json(
        { error: "Failed to fetch products" },
        { status: 500 }
      );
    }

    return NextResponse.json({ products: products || [] });
  } catch (err) {
    console.error("Error fetching products:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Creates a new product (drink) for the authenticated shop.
 *
 * Body: { name: string, price: number }
 */
export async function POST(request: NextRequest) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = await getUserIdFromRequest();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await assertPermission(userId, "manage_settings");

    const body = await request.json();
    const { name, price } = body ?? {};

    if (typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "اسم المشروب مطلوب." },
        { status: 400 }
      );
    }

    if (
      typeof price !== "number" ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      return NextResponse.json(
        { error: "السعر يجب أن يكون رقمًا موجبًا." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        shop_id: shopId,
        name: name.trim(),
        price,
        is_active: true,
      })
      .select("id, name, price, is_active")
      .maybeSingle();

    if (error || !data) {
      console.error("product create failed:", error);
      return NextResponse.json(
        { error: "Failed to create product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, product: data });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error creating product:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
