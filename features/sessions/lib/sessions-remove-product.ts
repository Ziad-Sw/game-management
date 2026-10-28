import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";

/**
 * DELETE /api/sessions/remove-product — removes a sale item from an active session
 * Query: ?sale_item_id=xxx
 */
export async function DELETE(request: NextRequest) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const saleItemId = searchParams.get("sale_item_id");

    if (!saleItemId) {
      return NextResponse.json(
        { error: "معرف عنصر البيع مطلوب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify sale item belongs to the shop and is linked to an active session
    const { data: saleItem, error: findError } = await supabase
      .from("sale_items")
      .select(`
        id,
        session_id,
        sessions!inner (
          status
        )
      `)
      .eq("id", saleItemId)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (findError || !saleItem) {
      return NextResponse.json(
        { error: "عنصر البيع غير موجود." },
        { status: 404 }
      );
    }

    if (saleItem.sessions.status !== "active") {
      return NextResponse.json(
        { error: "لا يمكن حذف منتجات من جلسة منتهية." },
        { status: 409 }
      );
    }

    // Hard delete the sale item
    const { error: deleteError } = await supabase
      .from("sale_items")
      .delete()
      .eq("id", saleItemId)
      .eq("shop_id", shopId);

    if (deleteError) {
      console.error("Failed to remove sale item:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove product" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error removing product from session:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
