import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import type { StaffPermissions, UserRole } from "@/types";

/**
 * GET /api/team/[id] — returns a team member's details.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shopId = await getShopIdFromRequest();
    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const supabase = createAdminClient();
    const { data: user, error } = await supabase
      .from("users")
      .select("id, login_id, display_name, email, role, permissions, is_active, created_at")
      .eq("id", id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("Error fetching user:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/team/[id] — updates a team member's login_id, display_name, email, role, or permissions.
 * Body: { login_id?, display_name?, email?, role?, permissions? }
 */
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
    await assertPermission(userId, "manage_team");

    const { id } = await params;
    const body = await request.json();

    const supabase = createAdminClient();

    // Verify user belongs to the shop
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "المستخدم غير موجود." },
        { status: 404 }
      );
    }

    const update: Partial<{
      login_id: string;
      display_name: string;
      email: string;
      role: UserRole;
      permissions: StaffPermissions;
    }> = {};

    if (body.login_id !== undefined) {
      if (typeof body.login_id !== "string" || body.login_id.trim().length === 0) {
        return NextResponse.json(
          { error: "معرّف الدخول لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }

      // Check uniqueness
      const { data: conflict } = await supabase
        .from("users")
        .select("id")
        .eq("shop_id", shopId)
        .eq("login_id", body.login_id.trim())
        .neq("id", id)
        .limit(1)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: "معرّف الدخول مستخدم بالفعل." },
          { status: 409 }
        );
      }

      update.login_id = body.login_id.trim();
    }

    if (body.display_name !== undefined) {
      if (typeof body.display_name !== "string" || body.display_name.trim().length === 0) {
        return NextResponse.json(
          { error: "الاسم لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }
      update.display_name = body.display_name.trim();
    }

    if (body.email !== undefined) {
      if (typeof body.email !== "string" || body.email.trim().length === 0) {
        return NextResponse.json(
          { error: "البريد الإلكتروني لا يمكن أن يكون فارغًا." },
          { status: 400 }
        );
      }

      const trimmedEmail = body.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        return NextResponse.json(
          { error: "صيغة البريد الإلكتروني غير صالحة." },
          { status: 400 }
        );
      }

      // Check uniqueness
      const { data: conflict } = await supabase
        .from("users")
        .select("id")
        .eq("shop_id", shopId)
        .eq("email", trimmedEmail)
        .neq("id", id)
        .limit(1)
        .maybeSingle();

      if (conflict) {
        return NextResponse.json(
          { error: "البريد الإلكتروني مستخدم بالفعل." },
          { status: 409 }
        );
      }

      update.email = trimmedEmail;
    }

    if (body.role !== undefined) {
      if (body.role !== "owner" && body.role !== "staff") {
        return NextResponse.json(
          { error: "الدور غير صالح." },
          { status: 400 }
        );
      }
      update.role = body.role;
    }

    if (body.permissions !== undefined) {
      const perms = body.permissions as StaffPermissions;
      if (typeof perms !== "object" || perms === null) {
        return NextResponse.json(
          { error: "الصلاحيات غير صالحة." },
          { status: 400 }
        );
      }
      update.permissions = perms;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "لم يتم إرسال أي حقل صالح للتحديث." },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update(update)
      .eq("id", id)
      .eq("shop_id", shopId)
      .select("id, login_id, display_name, email, role, permissions, is_active, created_at")
      .maybeSingle();

    if (updateError || !updated) {
      console.error("Failed to update user:", updateError);
      return NextResponse.json(
        { error: "فشل تحديث المستخدم." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, user: updated });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error updating user:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/team/[id] — soft-deletes a team member (sets is_active = false).
 */
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
    await assertPermission(userId, "manage_team");

    const { id } = await params;

    const supabase = createAdminClient();

    // Verify user exists and belongs to the shop
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("id", id)
      .eq("shop_id", shopId)
      .limit(1)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { error: "المستخدم غير موجود." },
        { status: 404 }
      );
    }

    // Soft delete — set is_active false + record the exact moment
    const { error: updateError } = await supabase
      .from("users")
      .update({ is_active: false, deactivated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("shop_id", shopId);

    if (updateError) {
      console.error("Failed to deactivate user:", updateError);
      return NextResponse.json(
        { error: "فشل حذف المستخدم." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error deleting user:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
