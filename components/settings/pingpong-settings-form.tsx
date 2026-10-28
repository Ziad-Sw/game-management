"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { NumericInput } from "@/components/ui/numeric-input";
import { SectionCard } from "@/components/ui/section-card";

interface PricingRule {
  id: string;
  station_type: string;
  mode: string;
  unit: string;
  rate: number;
}

interface PingpongSettingsFormProps {
  initialPingpongEnabled: boolean;
  initialPricingRules: PricingRule[];
  initialTableCount: number;
  canEdit?: boolean;
}

export default function PingpongSettingsForm({
  initialPingpongEnabled,
  initialPricingRules,
  initialTableCount,
  canEdit = true,
}: PingpongSettingsFormProps) {
  const { showToast } = useToast();
  const [pingpongEnabled, setPingpongEnabled] = useState(
    initialPingpongEnabled
  );
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
  const [tableCount, setTableCount] = useState(initialTableCount ?? 0);
  const [isSavingToggle, setIsSavingToggle] = useState(false);
  const [savingMode, setSavingMode] = useState<string | null>(null);
  const [isSavingTableCount, setIsSavingTableCount] = useState(false);

  const handleSaveToggle = async () => {
    setIsSavingToggle(true);
    try {
      const response = await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pingpong_enabled: !pingpongEnabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast("error", error.error || "حدث خطأ أثناء تحديث الإعدادات");
        return;
      }

      setPingpongEnabled(!pingpongEnabled);
      showToast("success", pingpongEnabled
        ? "تم تعطيل البينغ بونغ بنجاح"
        : "تم تفعيل البينغ بونغ بنجاح");
    } catch (err) {
      console.error("Error toggling pingpong:", err);
      showToast("error", "حدث خطأ أثناء تحديث الإعدادات");
    } finally {
      setIsSavingToggle(false);
    }
  };

  const handleSaveTableCount = async () => {
    const count = tableCount;
    if (count < 0) {
      showToast("error", "عدد الطاولات لا يمكن أن يكون سالباً");
      return;
    }

    setIsSavingTableCount(true);
    try {
      const response = await fetch("/api/shops/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pingpong_table_count: count }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast("error", error.error || "حدث خطأ أثناء حفظ عدد الطاولات");
        return;
      }

      showToast("success", "تم حفظ عدد الطاولات بنجاح");
    } catch (err) {
      console.error("Error saving table count:", err);
      showToast("error", "حدث خطأ أثناء حفظ عدد الطاولات");
    } finally {
      setIsSavingTableCount(false);
    }
  };

  const handleSavePricing = async (mode: "single" | "multi", unit: "hour" | "game", rate: number) => {
    const key = `${mode}_${unit}`;
    setSavingMode(key);
    try {
      const response = await fetch("/api/pricing-rules/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_type: "pingpong",
          mode,
          unit,
          rate,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast("error", error.error || "فشل حفظ السعر");
        return;
      }

      showToast("success", "تم حفظ السعر بنجاح");
    } catch (err) {
      console.error("Error saving pricing:", err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء حفظ السعر";
      showToast("error", errorMessage);
    } finally {
      setSavingMode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toggle Section */}
      <SectionCard
        title="تفعيل البينغ بونغ"
        description="قم بتفعيل أو تعطيل خدمة البينغ بونغ في المحل"
      >

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleSaveToggle}
            disabled={!canEdit || isSavingToggle}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              pingpongEnabled
                ? "bg-primary text-surface-page hover:bg-primary/90"
                : "bg-surface-page border border-foreground-muted/20 text-foreground hover:border-primary/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSavingToggle
              ? "جاري الحفظ..."
              : pingpongEnabled
              ? "مفعّل — اضغط للتعطيل"
              : "معطّل — اضغط للتفعيل"}
          </button>
        </div>
      </SectionCard>

      {/* Table Count Section */}
      <SectionCard
        title="عدد الطاولات"
        description="حدد عدد طاولات البينغ بونغ الموجودة في المحل"
      >

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <NumericInput
            min={0}
            step={1}
            value={tableCount}
            onChange={(v) => setTableCount(v)}
            placeholder="أدخل عدد الطاولات"
            disabled={!canEdit}
          />
          <button
            onClick={handleSaveTableCount}
            disabled={!canEdit || isSavingTableCount}
            className="w-full sm:w-auto min-h-[44px] sm:min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSavingTableCount ? "جاري..." : "حفظ"}
          </button>
        </div>
      </SectionCard>

      {/* Pricing Section */}
      <SectionCard
        title="أسعار البينغ بونغ"
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
