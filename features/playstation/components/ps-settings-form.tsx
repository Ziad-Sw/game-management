"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/numeric-input";
import { SectionCard } from "@/components/ui/section-card";
import { useToast } from "@/components/ui/toast";
import { useMutation, errorMessageFrom } from "@/hooks/use-mutation";
import { ENDPOINTS } from "@/lib/constants/endpoints";

interface PricingRule {
  id: string;
  station_type: string;
  mode: string;
  unit: string;
  rate: number;
}

interface PsSettingsFormProps {
  initialPsEnabled: boolean;
  initialPricingRules: PricingRule[];
  initialStationCount: number;
  canEdit?: boolean;
}

export default function PsSettingsForm({
  initialPsEnabled,
  initialPricingRules,
  initialStationCount,
  canEdit = true,
}: PsSettingsFormProps) {
  const { showToast } = useToast();
  const [psEnabled, setPsEnabled] = useState(initialPsEnabled);
  const [singleHourRate, setSingleHourRate] = useState(
    initialPricingRules.find((r) => r.mode === "single" && r.unit === "hour")?.rate ?? 0
  );
  const [multiHourRate, setMultiHourRate] = useState(
    initialPricingRules.find((r) => r.mode === "multi" && r.unit === "hour")?.rate ?? 0
  );
  const [singleGameRate, setSingleGameRate] = useState(
    initialPricingRules.find((r) => r.mode === "single" && r.unit === "game")?.rate ?? 0
  );
  const [multiGameRate, setMultiGameRate] = useState(
    initialPricingRules.find((r) => r.mode === "multi" && r.unit === "game")?.rate ?? 0
  );
  const [stationCount, setStationCount] = useState(initialStationCount ?? 0);
  const { mutate: togglePs, isPending: isSavingToggle } = useMutation();
  const { mutate: saveStationCount, isPending: isSavingStationCount } =
    useMutation();
  const { mutate: savingPricing } = useMutation();
  const [savingMode, setSavingMode] = useState<string | null>(null);

  const handleSaveToggle = async () => {
    await togglePs({
      context: "Error toggling PS",
      successMessage: psEnabled
        ? "تم تعطيل البلايستيشن بنجاح"
        : "تم تفعيل البلايستيشن بنجاح",
      fallbackError: "حدث خطأ أثناء تحديث الإعدادات",
      getErrorMessage: errorMessageFrom,
      onSuccess: () => setPsEnabled(!psEnabled),
      action: async () => {
        const response = await fetch(ENDPOINTS.shops.update, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ps_enabled: !psEnabled }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "حدث خطأ أثناء تحديث الإعدادات");
        }
      },
    });
  };

  const handleSaveStationCount = async () => {
    const count = stationCount;
    if (count < 0) {
      showToast("error", "عدد الأجهزة لا يمكن أن يكون سالباً");
      return;
    }

    await saveStationCount({
      context: "Error saving station count",
      successMessage: "تم حفظ عدد الأجهزة بنجاح",
      fallbackError: "حدث خطأ أثناء حفظ عدد الأجهزة",
      getErrorMessage: errorMessageFrom,
      action: async () => {
        const response = await fetch(ENDPOINTS.shops.update, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ps_station_count: count }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "حدث خطأ أثناء حفظ عدد الأجهزة");
        }
      },
    });
  };

  const handleSavePricing = async (mode: "single" | "multi", unit: "hour" | "game", rate: number) => {
    const key = `${mode}_${unit}`;
    setSavingMode(key);
    await savingPricing({
      context: "Error saving pricing",
      successMessage: "تم حفظ السعر بنجاح",
      fallbackError: "حدث خطأ أثناء حفظ السعر",
      getErrorMessage: errorMessageFrom,
      action: async () => {
        const response = await fetch(ENDPOINTS.pricingRules.upsert, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            station_type: "playstation",
            mode,
            unit,
            rate,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to update pricing");
        }
      },
    });
    setSavingMode(null);
  };

  const StationTypeLabel = "بلايستيشن";

  return (
    <div className="space-y-6">
      {/* Toggle Section */}
      <SectionCard
        title={`تفعيل ${StationTypeLabel}`}
        description={`قم بتفعيل أو تعطيل خدمة ${StationTypeLabel} في المحل`}
      >

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleSaveToggle}
            disabled={!canEdit || isSavingToggle}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              psEnabled
                ? "bg-primary text-surface-page hover:bg-primary/90"
                : "bg-surface-page border border-foreground-muted/20 text-foreground hover:border-primary/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSavingToggle
              ? "جاري الحفظ..."
              : psEnabled
              ? "مفعّل — اضغط للتعطيل"
              : "معطّل — اضغط للتفعيل"}
          </button>
        </div>
      </SectionCard>

      {/* Station Count Section */}
      <SectionCard
        title="عدد الأجهزة"
        description={`حدد عدد أجهزة ${StationTypeLabel} الموجودة في المحل`}
      >

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <NumericInput
            min={0}
            step={1}
            value={stationCount}
            onChange={(v) => setStationCount(v)}
            disabled={!canEdit}
            className="w-full sm:flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="أدخل عدد الأجهزة"
          />
          <button
            onClick={handleSaveStationCount}
            disabled={!canEdit || isSavingStationCount}
            className="w-full sm:w-auto min-h-[44px] sm:min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingStationCount ? "جاري..." : "حفظ"}
          </button>
        </div>
      </SectionCard>

      {/* Pricing Section */}
      <SectionCard
        title={`أسعار ${StationTypeLabel}`}
        description="أسعار اللعب بالساعة وبعدد الجيمات لكل نوع لعب"
      >

        <div className="mt-6 space-y-6">
          {/* Hourly Pricing */}
          <div>
            <h3 className="text-md font-medium text-foreground mb-3">التسعير بالساعة</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  لعب فردي (جنيه/ساعة)
                </label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={singleHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setSingleHourRate(v)}
                    className="flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing("single", "hour", singleHourRate)}
                    disabled={!canEdit || savingMode === "single_hour"}
                    className="min-h-[44px] min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingMode === "single_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  لعب مالتي (جنيه/ساعة)
                </label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={multiHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setMultiHourRate(v)}
                    className="flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing("multi", "hour", multiHourRate)}
                    disabled={!canEdit || savingMode === "multi_hour"}
                    className="min-h-[44px] min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingMode === "multi_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Per-Game Pricing */}
          <div className="border-t border-foreground-muted/20 pt-6">
            <h3 className="text-md font-medium text-foreground mb-3">التسعير بعدد الجيمات</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  لعب فردي (جنيه/جيم)
                </label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={singleGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setSingleGameRate(v)}
                    className="flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing("single", "game", singleGameRate)}
                    disabled={!canEdit || savingMode === "single_game"}
                    className="min-h-[44px] min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingMode === "single_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  لعب مالتي (جنيه/جيم)
                </label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={multiGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setMultiGameRate(v)}
                    className="flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing("multi", "game", multiGameRate)}
                    disabled={!canEdit || savingMode === "multi_game"}
                    className="min-h-[44px] min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingMode === "multi_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
