import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

/**
 * PATCH  /api/products/[id]  — edit a product (name/price/is_active).
 * DELETE /api/products/[id]  — soft delete (sets is_active = false).
 *
 * Both verify the product belongs to the authenticated shop before mutating.
 */
async function getProductForShop(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  shopId: string
) {
  return supabase
    .from("products")
    .select("id, name, price, is_active")
    .eq("id", id)
    .eq("shop_id", shopId)
    .limit(1)
    .maybeSingle();
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const body = await request.json();
    const { name, price, is_active } = body ?? {};

    const update: Partial<{ name: string; price: number; is_active: boolean }> = {};
    if (typeof name === "string") {
      if (name.trim().length === 0) {
        return NextResponse.json(
          { error: "اسم المشروب لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }
      update.name = name.trim();
    }
    if (price !== undefined) {
      if (typeof price !== "number" || !Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { error: "السعر يجب أن يكون رقمًا موجبًا." },
          { status: 400 }
        );
      }
      update.price = price;
    }
    if (typeof is_active === "boolean") {
      update.is_active = is_active;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "لم يتم إرسال أي حقل صالح للتحديث." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: existing, error: findError } = await getProductForShop(
      supabase,
      id,
      shopId
    );
    if (findError || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("products")
      .update(update)
      .eq("id", id)
      .eq("shop_id", shopId)
      .select("id, name, price, is_active")
      .maybeSingle();

    if (error || !data) {
      console.error("product update failed:", error);
      return NextResponse.json(
        { error: "Failed to update product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, product: data });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error updating product:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const supabase = createAdminClient();
    const { data: existing, error: findError } = await getProductForShop(
      supabase,
      id,
      shopId
    );
    if (findError || !existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Count sale_items linked to this product to decide delete strategy
    const { count, error: countError } = await supabase
      .from("sale_items")
      .select("*", { count: "exact", head: true })
      .eq("product_id", id)
      .eq("shop_id", shopId);

    if (countError) {
      console.error("Failed to count sale items:", countError);
      return NextResponse.json(
        { error: "Failed to check product usage" },
        { status: 500 }
      );
    }

    if (count !== null && count === 0) {
      // Hard delete — no historical data references this product
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("shop_id", shopId);

      if (error) {
        console.error("product hard-delete failed:", error);
        return NextResponse.json(
          { error: "Failed to delete product" },
          { status: 500 }
        );
      }
    } else {
      // Soft delete — preserve rows for historical sale_items integrity
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", id)
        .eq("shop_id", shopId);

      if (error) {
        console.error("product soft-delete failed:", error);
        return NextResponse.json(
          { error: "Failed to delete product" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error deleting product:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
