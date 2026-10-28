import { NextResponse } from "next/server";

import {
  createSessionCookieValue,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";

interface LoginRequestBody {
  login_id?: unknown;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: LoginRequestBody;

  try {
    body = (await request.json()) as LoginRequestBody;
  } catch {
    return jsonError("صيغة الطلب غير صحيحة.", 400);
  }

  const loginId =
    typeof body.login_id === "string" ? body.login_id.trim() : "";

  if (!loginId) {
    return jsonError("برجاء إدخال معرّف الدخول.", 400);
  }

  const supabase = createAdminClient();
  const { data: user, error } = await supabase
    .from("users")
    .select("id, shop_id, role, is_active")
    .eq("login_id", loginId)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Login lookup failed", error);
    return jsonError("تعذر تسجيل الدخول الآن. حاول مرة أخرى.", 500);
  }

  if (!user) {
    return jsonError("معرّف الدخول غير صحيح.", 401);
  }

  const sessionCookieValue = await createSessionCookieValue({
    user_id: user.id,
    shop_id: user.shop_id,
    role: user.role,
  });
  const response = NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      shop_id: user.shop_id,
      role: user.role,
    },
  });

  response.cookies.set(
    SESSION_COOKIE_NAME,
    sessionCookieValue,
    getSessionCookieOptions()
  );

  return response;
}
