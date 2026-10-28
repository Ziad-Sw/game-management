import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";

export async function GET(request: NextRequest) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const session_id = searchParams.get("session_id");

    if (!session_id) {
      return NextResponse.json(
        { error: "معرف الجلسة مطلوب." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("sale_items")
      .select(`
        id,
        quantity,
        unit_price,
        total_price,
        products!inner (
          name
        )
      `)
      .eq("session_id", session_id)
      .eq("shop_id", shopId);

    if (error) {
      console.error("Failed to fetch sale items:", error);
      return NextResponse.json(
        { error: "Failed to fetch sale items" },
        { status: 500 }
      );
    }

    const items = (data || []).map((item) => ({
      id: item.id,
      product_name: item.products.name,
      quantity: item.quantity,
      unit_price: Number(item.unit_price),
      total_price: Number(item.total_price),
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("Error fetching sale items:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
