"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { useMutation } from "@/hooks/use-mutation";

interface ShopData {
  id: string;
  name: string;
  owner_name: string | null;
  ps_enabled: boolean;
  billiard_enabled: boolean;
  shifts_per_day: number;
}

interface SettingsFormProps {
  initialShopData: ShopData;
  canEdit?: boolean;
}

export default function SettingsForm({ initialShopData, canEdit = true }: SettingsFormProps) {
  const { showToast } = useToast();
  const [shopName, setShopName] = useState(initialShopData.name);
  const [ownerName, setOwnerName] = useState(initialShopData.owner_name || "");
  const { mutate: saveShopName, isPending: isSavingShopName } = useMutation();
  const { mutate: saveOwnerName, isPending: isSavingOwnerName } = useMutation();

  const handleSaveShopName = async () => {
    if (!shopName.trim()) {
      showToast("error", "يجب إدخال اسم للمحل");
      return;
    }

    await saveShopName({
      context: "Error saving shop name",
      successMessage: "تم حفظ اسم المحل بنجاح",
      fallbackError: "حدث خطأ أثناء حفظ اسم المحل",
      action: async () => {
        const response = await fetch("/api/shops/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: shopName.trim() }),
        });

        if (!response.ok) {
          throw new Error("Failed to update shop name");
        }
      },
    });
  };

  const handleSaveOwnerName = async () => {
    if (!ownerName.trim()) {
      showToast("error", "يجب إدخال اسم صاحب المحل");
      return;
    }

    await saveOwnerName({
      context: "Error saving owner name",
      successMessage: "تم حفظ اسم صاحب المحل بنجاح",
      fallbackError: "حدث خطأ أثناء حفظ اسم صاحب المحل",
      action: async () => {
        const response = await fetch("/api/shops/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner_name: ownerName.trim() }),
        });

        if (!response.ok) {
          throw new Error("Failed to update owner name");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Shop Name Section */}
      <SectionCard
        title="اسم المحل"
        description="غيّر اسم المحل الذي يظهر في الشريط العلوي"
      >

        <div className="mt-4 space-y-3">
          <Input
            type="text"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            disabled={!canEdit}
            placeholder="مثال: محل البلايستيشن"
          />

          <button
            onClick={handleSaveShopName}
            disabled={!canEdit || isSavingShopName || shopName === initialShopData.name}
            className="min-h-[44px] w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingShopName ? "جاري الحفظ..." : "حفظ اسم المحل"}
          </button>
        </div>
      </SectionCard>

      {/* Owner Name Section */}
      <SectionCard
        title="اسم صاحب المحل"
        description="غيّر اسم صاحب المحل الذي يظهر في القائمة المنسدلة"
      >

        <div className="mt-4 space-y-3">
          <Input
            type="text"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            disabled={!canEdit}
            placeholder="مثال: محمد أحمد"
          />

          <button
            onClick={handleSaveOwnerName}
            disabled={!canEdit || isSavingOwnerName || ownerName === (initialShopData.owner_name || "")}
            className="min-h-[44px] w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingOwnerName ? "جاري الحفظ..." : "حفظ اسم صاحب المحل"}
          </button>
        </div>
      </SectionCard>

      {/* PlayStation Settings Card */}
      <Link
        href="/settings/ps"
        className="block rounded-xl bg-surface-card p-6 transition-colors hover:border-primary/50 hover:bg-surface-card/90 border border-transparent"
      >
        <h2 className="text-lg font-semibold text-foreground">البلايستيشن</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          إدارة أجهزة البلايستيشن وتسعيرها
        </p>
        <div className="mt-3 text-sm text-primary">إعدادات ←</div>
      </Link>

      {/* Billiard Settings Card */}
      <Link
        href="/settings/billiard"
        className="block rounded-xl bg-surface-card p-6 transition-colors hover:border-primary/50 hover:bg-surface-card/90 border border-transparent"
      >
        <h2 className="text-lg font-semibold text-foreground">البلياردو</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          إدارة طاولات البلياردو وتسعيرها
        </p>
        <div className="mt-3 text-sm text-primary">إعدادات ←</div>
      </Link>

      {/* Ping Pong Settings Card */}
      <Link
        href="/settings/pingpong"
        className="block rounded-xl bg-surface-card p-6 transition-colors hover:border-primary/50 hover:bg-surface-card/90 border border-transparent"
      >
        <h2 className="text-lg font-semibold text-foreground">البينغ بونغ</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          إدارة طاولات البينغ بونغ وتسعيرها
        </p>
        <div className="mt-3 text-sm text-primary">إعدادات ←</div>
      </Link>

      {/* Products Settings Card */}
      <Link
        href="/settings/products"
        className="block rounded-xl bg-surface-card p-6 transition-colors hover:border-primary/50 hover:bg-surface-card/90 border border-transparent"
      >
        <h2 className="text-lg font-semibold text-foreground">المشروبات</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          إضافة وتعديل وحذف المشروبات وأسعارها
        </p>
        <div className="mt-3 text-sm text-primary">إعدادات ←</div>
      </Link>

      {/* Team Management Card */}
      <Link
        href="/settings/team"
        className="block rounded-xl bg-surface-card p-6 transition-colors hover:border-primary/50 hover:bg-surface-card/90 border border-transparent"
      >
        <h2 className="text-lg font-semibold text-foreground">الفريق والصلاحيات</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          إضافة وتعديل وحذف أعضاء الفريق وتحديد صلاحيات كل عضو
        </p>
        <div className="mt-3 text-sm text-primary">إعدادات ←</div>
      </Link>

      {/* Shifts Settings Card */}
      <Link
        href="/settings/shifts"
        className="block rounded-xl bg-surface-card p-6 transition-colors hover:border-primary/50 hover:bg-surface-card/90 border border-transparent"
      >
        <h2 className="text-lg font-semibold text-foreground">الورديات</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          تحديد عدد الورديات اليومية المسموح بها
        </p>
        <div className="mt-3 text-sm text-primary">إعدادات ←</div>
      </Link>
    </div>
  );
}
