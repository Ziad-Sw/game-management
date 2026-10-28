import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";

/**
 * POST /api/sessions/add-product — adds a product to an active session
 * Body: { session_id: string, product_id: string, quantity?: number }
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
    await assertPermission(userId, "manage_sessions");

    const body = await request.json();
    const { session_id, product_id, quantity = 1 } = body ?? {};

    if (typeof session_id !== "string" || session_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف الجلسة مطلوب." },
        { status: 400 }
      );
    }

    if (typeof product_id !== "string" || product_id.trim().length === 0) {
      return NextResponse.json(
        { error: "معرف المنتج مطلوب." },
        { status: 400 }
      );
    }

    if (typeof quantity !== "number" || quantity < 1) {
      return NextResponse.json(
        { error: "الكمية يجب أن تكون رقمًا موجبًا." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify session belongs to the shop and is active
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, shift_id, status")
      .eq("id", session_id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: "الجلسة غير موجودة." },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { error: "لا يمكن إضافة منتجات على جلسة منتهية." },
        { status: 409 }
      );
    }

    // Verify product belongs to the shop and is active
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("id, price")
      .eq("id", product_id)
      .eq("shop_id", shopId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (productError || !product) {
      return NextResponse.json(
        { error: "المنتج غير موجود أو غير مفعل." },
        { status: 404 }
      );
    }

    // Calculate total price
    const unitPrice = Number(product.price);
    const totalPrice = unitPrice * quantity;

    // Create sale item
    const { data: saleItem, error: saleError } = await supabase
      .from("sale_items")
      .insert({
        shop_id: shopId,
        shift_id: session.shift_id,
        session_id: session_id,
        product_id: product_id,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
      })
      .select()
      .maybeSingle();

    if (saleError || !saleItem) {
      console.error("Failed to add product to session:", saleError);
      return NextResponse.json(
        { error: "Failed to add product to session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, sale_item: saleItem });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error adding product to session:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
