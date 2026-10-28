"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { NumericInput } from "@/components/ui/numeric-input";
import { SectionCard } from "@/components/ui/section-card";
import { useMutation, errorMessageFrom } from "@/hooks/use-mutation";
import { ENDPOINTS } from "@/lib/constants/endpoints";

interface ShiftsSettingsFormProps {
  initialShiftsPerDay: number;
  canEdit?: boolean;
}

export default function ShiftsSettingsForm({
  initialShiftsPerDay,
  canEdit = true,
}: ShiftsSettingsFormProps) {
  const { showToast } = useToast();
  const [shiftsPerDay, setShiftsPerDay] = useState(initialShiftsPerDay);
  const { mutate: saveShifts, isPending: isSaving } = useMutation();

  const handleSave = async () => {
    const count = shiftsPerDay;
    if (count < 1 || count > 4) {
      showToast("error", "عدد الورديات يجب أن يكون بين 1 و 4");
      return;
    }

    await saveShifts({
      context: "Error saving shifts per day",
      successMessage: "تم حفظ عدد الورديات بنجاح",
      fallbackError: "حدث خطأ أثناء حفظ الإعدادات",
      getErrorMessage: errorMessageFrom,
      action: async () => {
        const response = await fetch(ENDPOINTS.shops.update, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shifts_per_day: count }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "حدث خطأ أثناء حفظ الإعدادات");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="عدد الورديات اليومية"
        description="حدد الحد الأقصى لعدد الورديات المسموح بها في اليوم الواحد (1-4)"
      >

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <NumericInput
              min={1}
              max={4}
              value={shiftsPerDay}
              placeholder="أدخل عدد الورديات"
              onChange={(v) => setShiftsPerDay(Math.max(1, Math.min(4, v)))}
              disabled={!canEdit}
              className="w-24 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <button
              onClick={handleSave}
              disabled={!canEdit || isSaving || shiftsPerDay === initialShiftsPerDay}
              className="min-h-[44px] min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "جاري الحفظ..." : "حفظ"}
            </button>
          </div>

          <div className="text-sm text-foreground-muted">
            <p>ملاحظات:</p>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>الحد الأدنى: وردية واحدة يوميًا</li>
              <li>الحد الأقصى: 4 ورديات يوميًا</li>
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
