"use client";

import { PanelLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface SidebarUser {
  display_name: string | null;
  role: "owner" | "staff";
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onToggle: () => void;
  user: SidebarUser | null;
  shopName: string;
  ownerName: string | null;
  onLogoutClick: () => void;
}

const DESKTOP_BREAKPOINT = 1024;

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="5" rx="1" />
      <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

function ExpensesIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export default function Sidebar({
  isOpen,
  onClose,
  onToggle,
  user,
  shopName,
  ownerName,
  onLogoutClick,
}: SidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  const displayName =
    user?.role === "owner"
      ? ownerName || "صاحب المحل"
      : user?.display_name || "صاحب المحل";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (isOpen && event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const iconBtnClass =
    "flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-foreground transition-colors hover:bg-primary/10";

  return (
    <>
      {isDesktop && !isOpen && (
        <div className="fixed top-[64px] right-0 z-30 flex h-[calc(100vh-64px)] w-[60px] flex-col items-center border-l border-foreground-muted/10 bg-surface-card py-3">
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={onToggle}
              title="فتح القائمة الجانبية"
              className={iconBtnClass}
            >
              <PanelLeft size={20} />
            </button>
            <Link href="/" title="الرئيسية" className={iconBtnClass}>
              <HomeIcon />
            </Link>
            <Link href="/settings" title="الإعدادات" className={iconBtnClass}>
              <SettingsIcon />
            </Link>
            <Link href="/archive" title="أرشيف الورديات" className={iconBtnClass}>
              <ArchiveIcon />
            </Link>
            <Link href="/expenses" title="المصاريف" className={iconBtnClass}>
              <ExpensesIcon />
            </Link>
          </div>
          <div className="flex-1" />
          <button
            type="button"
            title="تسجيل الخروج"
            onClick={onLogoutClick}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogoutIcon />
          </button>
        </div>
      )}

      <div
        ref={sidebarRef}
        className={`fixed top-0 right-0 z-40 flex h-full w-[280px] flex-col border-l border-foreground-muted/10 bg-surface-card shadow-2xl transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal={isOpen}
        aria-label="القائمة الجانبية"
      >
        <div className="flex items-center gap-3 border-b border-foreground-muted/10 px-4 py-5">
          <Image src="/logo-ps.svg" alt="Game Management logo" width={32} height={32} className="h-8 w-8" />
          <span className="text-lg font-semibold text-foreground">
            Game Management
          </span>
        </div>

        <div className="border-b border-foreground-muted/10 px-4 py-4">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-foreground">{displayName}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                user?.role === "owner"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : "bg-blue-500/10 text-blue-400"
              }`}
            >
              {user?.role === "owner" ? "مدير" : "موظف"}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground-muted">{shopName}</p>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-4">
          <div className="space-y-1">
            <button
              type="button"
              onClick={onToggle}
              className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
            >
              <PanelLeft size={20} />
            </button>
            <Link
              href="/"
              onClick={onClose}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
            >
              <HomeIcon />
              <span>الرئيسية</span>
            </Link>
            <Link
              href="/settings"
              onClick={onClose}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
            >
              <SettingsIcon />
              <span>الإعدادات</span>
            </Link>
            <Link
              href="/archive"
              onClick={onClose}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
            >
              <ArchiveIcon />
              <span>أرشيف الورديات</span>
            </Link>
            <Link
              href="/expenses"
              onClick={onClose}
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-primary/10"
            >
              <ExpensesIcon />
              <span>المصاريف</span>
            </Link>
          </div>
        </nav>

        <div className="border-t border-foreground-muted/10 px-2 py-4">
          <button
            type="button"
            onClick={onLogoutClick}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10"
          >
            <LogoutIcon />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </>
  );
}
