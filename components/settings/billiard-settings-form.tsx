"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { NumericInput } from "@/components/ui/numeric-input";

interface PricingRule {
  id: string;
  station_type: string;
  mode: string;
  unit: string;
  rate: number;
  play_type: string;
  play_subtype: string;
}

interface BilliardSettingsFormProps {
  initialBilliardEnabled: boolean;
  initialPricingRules: PricingRule[];
  initialTableCount: number;
  canEdit?: boolean;
}

export default function BilliardSettingsForm({
  initialBilliardEnabled,
  initialPricingRules,
  initialTableCount,
  canEdit = true,
}: BilliardSettingsFormProps) {
  const { showToast } = useToast();
  const [billiardEnabled, setBilliardEnabled] = useState(
    initialBilliardEnabled
  );
  const findRule = (playType: string, playSubtype: string, unit: string) =>
    initialPricingRules.find(
      (r) => r.play_type === playType && r.play_subtype === playSubtype && r.unit === unit
    );

  // Normal / Single
  const [normalSingleHourRate, setNormalSingleHourRate] = useState(
    findRule("normal", "single", "hour")?.rate ?? 0
  );
  const [normalSingleGameRate, setNormalSingleGameRate] = useState(
    findRule("normal", "single", "game")?.rate ?? 0
  );
  // Normal / Multi
  const [normalMultiHourRate, setNormalMultiHourRate] = useState(
    findRule("normal", "multi", "hour")?.rate ?? 0
  );
  const [normalMultiGameRate, setNormalMultiGameRate] = useState(
    findRule("normal", "multi", "game")?.rate ?? 0
  );
  // Combo / Single
  const [comboSingleHourRate, setComboSingleHourRate] = useState(
    findRule("combo", "single", "hour")?.rate ?? 0
  );
  const [comboSingleGameRate, setComboSingleGameRate] = useState(
    findRule("combo", "single", "game")?.rate ?? 0
  );
  // Combo / Triple
  const [comboTripleHourRate, setComboTripleHourRate] = useState(
    findRule("combo", "triple", "hour")?.rate ?? 0
  );
  const [comboTripleGameRate, setComboTripleGameRate] = useState(
    findRule("combo", "triple", "game")?.rate ?? 0
  );
  // Combo / Quad
  const [comboQuadHourRate, setComboQuadHourRate] = useState(
    findRule("combo", "quad", "hour")?.rate ?? 0
  );
  const [comboQuadGameRate, setComboQuadGameRate] = useState(
    findRule("combo", "quad", "game")?.rate ?? 0
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
        body: JSON.stringify({ billiard_enabled: !billiardEnabled }),
      });

      if (!response.ok) {
        const error = await response.json();
        showToast("error", error.error || "حدث خطأ أثناء تحديث الإعدادات");
        return;
      }

      setBilliardEnabled(!billiardEnabled);
      showToast("success", billiardEnabled
        ? "تم تعطيل البلياردو بنجاح"
        : "تم تفعيل البلياردو بنجاح");
    } catch (err) {
      console.error("Error toggling billiard:", err);
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
        body: JSON.stringify({ billiard_table_count: count }),
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

  interface SavePricingParams {
    playType: "normal" | "combo";
    playSubtype: "single" | "multi" | "triple" | "quad";
    unit: "hour" | "game";
    rate: number;
  }

  const handleSavePricing = async ({ playType, playSubtype, unit, rate }: SavePricingParams) => {
    const key = `${playType}_${playSubtype}_${unit}`;
    setSavingMode(key);
    try {
      const response = await fetch("/api/pricing-rules/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_type: "billiard",
          mode: playSubtype === "multi" || playSubtype === "triple" || playSubtype === "quad" ? "multi" : "single",
          unit,
          rate,
          play_type: playType,
          play_subtype: playSubtype,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update pricing");
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
      <div className="rounded-xl bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-foreground">تفعيل البلياردو</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          قم بتفعيل أو تعطيل خدمة البلياردو في المحل
        </p>

        <div className="mt-4 flex items-center gap-4">
          <button
            onClick={handleSaveToggle}
            disabled={!canEdit || isSavingToggle}
            className={`min-h-[44px] rounded-lg px-6 py-2 text-sm font-medium transition-colors ${
              billiardEnabled
                ? "bg-primary text-surface-page hover:bg-primary/90"
                : "bg-surface-page border border-foreground-muted/20 text-foreground hover:border-primary/50"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSavingToggle
              ? "جاري الحفظ..."
              : billiardEnabled
              ? "مفعّل — اضغط للتعطيل"
              : "معطّل — اضغط للتفعيل"}
          </button>
        </div>
      </div>

      {/* Table Count Section */}
      <div className="rounded-xl bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-foreground">عدد الطاولات</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          حدد عدد طاولات البلياردو الموجودة في المحل
        </p>

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
      </div>

      {/* Pricing Section */}
      <div className="rounded-xl bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-foreground">أسعار البلياردو</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          أسعار اللعب بالساعة وبعدد الجيمات لكل نوع لعب
        </p>

        <div className="mt-6 space-y-8">
          {/* ===== Normal / Single ===== */}
          <div>
            <h3 className="text-md font-medium text-foreground mb-1">عادي — فردي</h3>
            <p className="text-xs text-foreground-muted mb-3">التسعير الأساسي للعب الفردي</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/ساعة</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={normalSingleHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setNormalSingleHourRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "normal", playSubtype: "single", unit: "hour", rate: normalSingleHourRate })}
                    disabled={!canEdit || savingMode === "normal_single_hour"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "normal_single_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/جيم</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={normalSingleGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setNormalSingleGameRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "normal", playSubtype: "single", unit: "game", rate: normalSingleGameRate })}
                    disabled={!canEdit || savingMode === "normal_single_game"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "normal_single_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Normal / Multi ===== */}
          <div className="border-t border-foreground-muted/20 pt-6">
            <h3 className="text-md font-medium text-foreground mb-1">عادي — مالتي</h3>
            <p className="text-xs text-foreground-muted mb-3">التسعير الأساسي للعب الجماعي</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/ساعة</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={normalMultiHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setNormalMultiHourRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "normal", playSubtype: "multi", unit: "hour", rate: normalMultiHourRate })}
                    disabled={!canEdit || savingMode === "normal_multi_hour"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "normal_multi_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/جيم</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={normalMultiGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setNormalMultiGameRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "normal", playSubtype: "multi", unit: "game", rate: normalMultiGameRate })}
                    disabled={!canEdit || savingMode === "normal_multi_game"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "normal_multi_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Combo / Single ===== */}
          <div className="border-t border-foreground-muted/20 pt-6">
            <h3 className="text-md font-medium text-foreground mb-1">كومب — فردي</h3>
            <p className="text-xs text-foreground-muted mb-3">تسعير العروض للاعب واحد. راجعه في /settings/billiard</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/ساعة</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={comboSingleHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setComboSingleHourRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "combo", playSubtype: "single", unit: "hour", rate: comboSingleHourRate })}
                    disabled={!canEdit || savingMode === "combo_single_hour"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "combo_single_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/جيم</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={comboSingleGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setComboSingleGameRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "combo", playSubtype: "single", unit: "game", rate: comboSingleGameRate })}
                    disabled={!canEdit || savingMode === "combo_single_game"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "combo_single_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Combo / Triple ===== */}
          <div className="border-t border-foreground-muted/20 pt-6">
            <h3 className="text-md font-medium text-foreground mb-1">كومب — متولتة</h3>
            <p className="text-xs text-foreground-muted mb-3">تسعير العروض لثلاثة لاعبين. راجعه في /settings/billiard</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/ساعة</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={comboTripleHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setComboTripleHourRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "combo", playSubtype: "triple", unit: "hour", rate: comboTripleHourRate })}
                    disabled={!canEdit || savingMode === "combo_triple_hour"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "combo_triple_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/جيم</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={comboTripleGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setComboTripleGameRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "combo", playSubtype: "triple", unit: "game", rate: comboTripleGameRate })}
                    disabled={!canEdit || savingMode === "combo_triple_game"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "combo_triple_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Combo / Quad ===== */}
          <div className="border-t border-foreground-muted/20 pt-6">
            <h3 className="text-md font-medium text-foreground mb-1">كومب — مربعة</h3>
            <p className="text-xs text-foreground-muted mb-3">تسعير العروض لأربعة لاعبين. راجعه في /settings/billiard</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/ساعة</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={comboQuadHourRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setComboQuadHourRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "combo", playSubtype: "quad", unit: "hour", rate: comboQuadHourRate })}
                    disabled={!canEdit || savingMode === "combo_quad_hour"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "combo_quad_hour" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">جنيه/جيم</label>
                <div className="flex gap-2">
                  <NumericInput
                    min={0}
                    step={1}
                    value={comboQuadGameRate}
                    placeholder="أدخل السعر"
                    onChange={(v) => setComboQuadGameRate(v)}
                    disabled={!canEdit}
                  />
                  <button
                    onClick={() => handleSavePricing({ playType: "combo", playSubtype: "quad", unit: "game", rate: comboQuadGameRate })}
                    disabled={!canEdit || savingMode === "combo_quad_game"}
                    className="min-h-[44px] min-w-[80px] rounded-lg bg-primary px-3 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                  >
                    {savingMode === "combo_quad_game" ? "جاري..." : "حفظ"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
