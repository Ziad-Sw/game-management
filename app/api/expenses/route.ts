import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import type { Database } from "@/types";

export async function GET() {
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

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("expenses")
      .select(`
        id,
        shop_id,
        shift_id,
        description,
        amount,
        category,
        expense_date,
        created_at,
        shifts ( shift_number, responsible_name )
      `)
      .eq("shop_id", shopId)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch expenses:", error);
      return NextResponse.json(
        { error: "فشل تحميل المصاريف." },
        { status: 500 }
      );
    }

    const expenses = (data ?? []).map(
      (row: Database["public"]["Tables"]["expenses"]["Row"] & { shifts: { shift_number: number; responsible_name: string } | null }) => ({
      id: row.id,
      shop_id: row.shop_id,
      shift_id: row.shift_id,
      description: row.description,
      amount: Number(row.amount),
      category: row.category,
      expense_date: row.expense_date,
      created_at: row.created_at,
      shift_number: row.shifts?.shift_number ?? null,
      responsible_name: row.shifts?.responsible_name ?? null,
    }));

    return NextResponse.json({ expenses });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in GET /api/expenses:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const { description, amount, category, expense_date } = body ?? {};

    if (typeof description !== "string" || description.trim().length === 0) {
      return NextResponse.json(
        { error: "الوصف مطلوب." },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "المبلغ يجب أن يكون رقمًا موجبًا." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Always resolve shift_id server-side; ignore any client value
    const { data: openShift, error: shiftError } = await supabase
      .from("shifts")
      .select("id")
      .eq("shop_id", shopId)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();

    if (shiftError || !openShift) {
      return NextResponse.json(
        { error: "لا يمكن إضافة مصروف خارج الوردية. يرجى فتح وردية أولاً." },
        { status: 400 }
      );
    }

    const insertData: Database["public"]["Tables"]["expenses"]["Insert"] = {
      shop_id: shopId,
      shift_id: openShift.id,
      description: description.trim(),
      amount,
    };

    if (typeof category === "string" && category.trim().length > 0) {
      insertData.category = category.trim();
    }

    if (typeof expense_date === "string" && expense_date.trim().length > 0) {
      insertData.expense_date = expense_date.trim();
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert(insertData)
      .select()
      .maybeSingle();

    if (error || !data) {
      console.error("Failed to create expense:", error);
      return NextResponse.json(
        { error: "فشل إضافة المصروف." },
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
        shift_number: null,
        responsible_name: null,
      },
    });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error in POST /api/expenses:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
