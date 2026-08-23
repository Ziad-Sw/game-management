"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ToastProvider, useToast } from "@/components/ui/toast";

function LoginForm() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ login_id: loginId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "تعذر تسجيل الدخول. يرجى المحاولة مرة أخرى.");
        setIsLoading(false);
        return;
      }

      // Login successful, redirect to dashboard/home page
      router.refresh();
      router.push("/");
    } catch (err) {
      console.error("Login submission error:", err);
      setError("حدث خطأ في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.");
      setIsLoading(false);
    }
  };

  const handleForgotId = () => {
    showToast("warning", "إذا نسيت معرف الدخول، يرجى التواصل مع الدعم للحصول على معرف جديد.");
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-xl bg-surface-card p-8 border border-foreground-muted/10 shadow-xl">
        <div className="flex flex-col items-center mb-6">
          <Image src="/logo-ps.svg" alt="Game Management logo" width={56} height={56} className="h-14 w-14 mb-3" />
          <h1 className="text-2xl font-bold text-foreground text-center">Game Management</h1>
          <p className="mt-2 text-sm text-foreground-muted text-center">
            نظام إدارة محلات الألعاب والترفيه
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-950/30 border border-red-500/30 px-4 py-3 text-sm text-red-400 flex items-start gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5 shrink-0 mt-0.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="loginId"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              تسجيل الدخول
            </label>
            <input
              id="loginId"
              type="text"
              required
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              disabled={isLoading}
              placeholder="أدخل معرف الدخول الخاص بك"
              className="w-full h-11 px-4 rounded-lg bg-surface-page border border-foreground-muted/20 text-foreground placeholder:text-foreground-muted/40 focus:border-primary focus:outline-none transition-colors duration-150 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-foreground-muted">
              للتجربة، استخدم ID:{" "}
              <span className="font-semibold text-primary" dir="ltr">
                DEMO2026
              </span>
            </p>
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotId}
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              هل نسيت ال-ID؟
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading || !loginId.trim()}
            className="w-full h-11 inline-flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 text-surface-page font-semibold text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-5 w-5 text-surface-page"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span>جاري تسجيل الدخول...</span>
              </div>
            ) : (
              "دخول"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}

