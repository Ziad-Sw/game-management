"use client";

import { useState } from "react";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";

interface AuthenticatedUser {
  login_id: string;
  display_name: string | null;
  role: "owner" | "staff";
}

interface AuthenticatedShellProps {
  user: AuthenticatedUser | null;
  shopName: string;
  ownerName: string | null;
  children: React.ReactNode;
}

function AuthenticatedShellContent({
  user,
  shopName,
  ownerName,
  children,
}: AuthenticatedShellProps) {
  const { showToast } = useToast();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
    setIsSidebarOpen(false);
  };

  const handleLogoutConfirm = async () => {
    setShowLogoutConfirm(false);
    showToast("warning", "جاري تسجيل الخروج...");

    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      showToast("error", "حدث خطأ أثناء تسجيل الخروج");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1000);
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface-page text-foreground">
        <header className="sticky top-0 z-20 border-b border-foreground-muted/10 bg-surface-page/95 backdrop-blur supports-[backdrop-filter]:bg-surface-page/80">
          <div className="mx-auto flex min-h-[64px] max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-foreground-muted/20 bg-surface-card px-3 py-2 text-foreground transition-colors duration-150 hover:border-primary/50 hover:bg-surface-card/90 focus:outline-none focus:ring-2 focus:ring-primary/60 lg:hidden"
              aria-label="فتح القائمة الجانبية"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <span className="text-lg font-semibold text-foreground">
              {shopName}
            </span>
          </div>
        </header>

        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onToggle={() => setIsSidebarOpen((value) => !value)}
          user={user}
          shopName={shopName}
          ownerName={ownerName}
          onLogoutClick={handleLogoutClick}
        />

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        {showLogoutConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-surface-card mx-4 w-full max-w-sm rounded-xl border border-foreground-muted/20 p-6 shadow-2xl">
              <h3 className="mb-2 text-lg font-semibold text-foreground">تأكيد تسجيل الخروج</h3>
              <p className="mb-6 text-sm text-foreground-muted">
                هل أنت متأكد من تسجيل الخروج؟ مع تسجيل الخروج سيتم نقلك إلى صفحة تسجيل الدخول.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  size="md"
                  fill
                  onClick={handleLogoutCancel}
                >
                  إلغاء
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  fill
                  onClick={handleLogoutConfirm}
                >
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}

export default function AuthenticatedShell(props: AuthenticatedShellProps) {
  return (
    <ToastProvider>
      <AuthenticatedShellContent {...props} />
    </ToastProvider>
  );
}
