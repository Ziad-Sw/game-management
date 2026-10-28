import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getShopIdFromRequest } from "@/lib/auth/require-shop";
import { assertPermission, PermissionError, getUserIdFromRequest } from "@/lib/auth/permissions";
import { DEFAULT_STAFF_PERMISSIONS } from "@/types";

/**
 * Generates a random 6-character alphanumeric login_id.
 * Excludes ambiguous characters (I, O, 0, 1).
 */
function generateLoginId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

/**
 * POST /api/team/invite — invites a new staff member by email.
 * Body: { email: string }
 * System auto-generates login_id, derives display_name from email prefix.
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
    await assertPermission(userId, "manage_team");

    const body = await request.json();
    const { email } = body ?? {};

    if (typeof email !== "string" || email.trim().length === 0) {
      return NextResponse.json(
        { error: "البريد الإلكتروني مطلوب." },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: "صيغة البريد الإلكتروني غير صالحة." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check for duplicate email within the same shop
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("shop_id", shopId)
      .eq("email", trimmedEmail)
      .limit(1)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: "هذا البريد الإلكتروني مستخدم بالفعل في المحل." },
        { status: 409 }
      );
    }

    // Generate a unique login_id
    let loginId: string;
    let isUnique = false;
    let attempts = 0;

    do {
      loginId = generateLoginId();
      const { data: conflict } = await supabase
        .from("users")
        .select("id")
        .eq("shop_id", shopId)
        .eq("login_id", loginId)
        .limit(1)
        .maybeSingle();

      isUnique = !conflict;
      attempts++;

      if (attempts > 10) {
        return NextResponse.json(
          { error: "تعذر إنشاء معرّف دخول فريد. حاول مرة أخرى." },
          { status: 500 }
        );
      }
    } while (!isUnique);

    // Derive display_name from email prefix
    const displayName = trimmedEmail.split("@")[0];

    // Create the user
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        shop_id: shopId,
        login_id: loginId,
        display_name: displayName,
        role: "staff",
        email: trimmedEmail,
        permissions: DEFAULT_STAFF_PERMISSIONS,
        is_active: true,
      })
      .select("id, login_id, display_name, email, role, permissions, is_active, created_at")
      .maybeSingle();

    if (createError || !newUser) {
      console.error("Failed to create user:", createError);
      return NextResponse.json(
        { error: "فشل إنشاء المستخدم." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, user: newUser });
  } catch (err) {
    if (err instanceof PermissionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error inviting user:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
