import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import type { Database } from "@/types";

async function getExpenseForShop(
  supabase: ReturnType<typeof createAdminClient>,
  id: string,
  shopId: string
) {
  return supabase
    .from("expenses")
    .select("id, shop_id, shift_id, description, amount, category, expense_date, created_at")
    .eq("id", id)
    .eq("shop_id", shopId)
    .limit(1)
    .maybeSingle();
}

export async function PUT(
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
    const { description, amount, category, expense_date } = body ?? {};

    const supabase = createAdminClient();
    const { data: existing, error: findError } = await getExpenseForShop(supabase, id, shopId);
    if (findError || !existing) {
      return NextResponse.json({ error: "المصروف غير موجود." }, { status: 404 });
    }

    const update: Database["public"]["Tables"]["expenses"]["Update"] = {};

    if (description !== undefined) {
      if (typeof description !== "string" || description.trim().length === 0) {
        return NextResponse.json(
          { error: "الوصف لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }
      update.description = description.trim();
    }

    if (amount !== undefined) {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json(
          { error: "المبلغ يجب أن يكون رقمًا موجبًا." },
          { status: 400 }
        );
      }
      update.amount = amount;
    }

    if (category !== undefined) {
      if (category === null || (typeof category === "string" && category.trim().length === 0)) {
        update.category = null;
      } else if (typeof category === "string") {
        update.category = category.trim();
      }
    }

    if (expense_date !== undefined) {
      if (typeof expense_date !== "string" || expense_date.trim().length === 0) {
        return NextResponse.json(
          { error: "التاريخ غير صالح." },
          { status: 400 }
        );
      }
      update.expense_date = expense_date.trim();
    }

    // shift_id is never updated via client — it was set server-side at creation

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "لم يتم إرسال أي حقل صالح للتحديث." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("expenses")
      .update(update)
      .eq("id", id)
      .eq("shop_id", shopId)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Failed to update expense:", error);
      return NextResponse.json(
        { error: "فشل تحديث المصروف." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      expense: {
        id: data.id,
        shop_id: data.shop_id,
        shift_id: data.shift_id,
        description: data.description,
        amount: Number(data.amount),
        category: data.category,
        expense_date: data.expense_date,
        created_at: data.created_at,
      },
    });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in PUT /api/expenses/[id]:", err);
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
    const { data: existing, error: findError } = await getExpenseForShop(supabase, id, shopId);
    if (findError || !existing) {
      return NextResponse.json({ error: "المصروف غير موجود." }, { status: 404 });
    }

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id)
      .eq("shop_id", shopId);

    if (error) {
      console.error("Failed to delete expense:", error);
      return NextResponse.json(
        { error: "فشل حذف المصروف." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in DELETE /api/expenses/[id]:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
