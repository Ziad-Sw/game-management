"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatCount } from "@/lib/format/number";
import { formatTime } from "@/lib/format/time";
import { Station, Session } from "@/types/database";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useMutation, errorMessageFrom } from "@/components/ui/use-mutation";
import { calculateGameEntrySubtotal } from "@/lib/pricing/calculation";

interface ReceiptPopupProps {
  session: Session;
  station: Station;
  onClose: () => void;
  onConfirm: () => void;
}

interface BilliardGameEntryShape {
  id: string;
  entry_type: "billiard";
  play_type: "normal" | "combo";
  play_subtype: "single" | "multi" | "triple" | "quad";
  games_count: number;
  price_per_game: number;
  mode?: never;
}

interface StationGameEntryShape {
  id: string;
  entry_type: "station";
  mode: "single" | "multi";
  games_count: number;
  price_per_game: number;
  play_type?: never;
  play_subtype?: never;
}

type GameEntry = BilliardGameEntryShape | StationGameEntryShape;

interface ReceiptData {
  duration_hours: number;
  duration_formatted: string;
  time_cost: number;
  drinks_cost: number;
  game_entries_cost: number;
  total_cost: number;
  items: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  game_entries: GameEntry[];
  start_time: string;
  end_time: string;
  unit: "hour" | "game";
  games_count: number | null;
}

export function ReceiptPopup({
  session,
  station,
  onClose,
  onConfirm,
}: ReceiptPopupProps) {
  const { showToast } = useToast();
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);
  const confirmMutation = useMutation();

  const fetchReceiptData = useCallback(async () => {
    try {
      const response = await fetch("/api/sessions/preview-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setReceiptData(data);
      } else {
        showToast("error", data.error || "فشل حساب الإيصال");
        onClose();
      }
    } catch (error) {
      console.error("Failed to fetch receipt data:", error);
      showToast("error", "حدث خطأ أثناء حساب الإيصال");
      onClose();
    }
  }, [session.id, onClose, showToast]);

  // Fetch receipt data on mount
  useEffect(() => {
    const loadReceipt = () => fetchReceiptData();
    loadReceipt();
  }, [fetchReceiptData]);

  const handleConfirm = () => {
    void confirmMutation.mutate({
      action: async () => {
        const response = await fetch("/api/sessions/confirm-close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: session.id,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "فشل قفل الجلسة");
        }
      },
      context: "Failed to confirm close:",
      successMessage: "تم قفل الجلسة بنجاح",
      fallbackError: "حدث خطأ أثناء قفل الجلسة",
      getErrorMessage: errorMessageFrom,
      onSuccess: () => onConfirm(),
    });
  };

  if (!receiptData) {
    return (
      <Modal className="rounded-xl bg-surface-card p-6">
        <div className="text-center text-foreground-muted">جاري حساب الإيصال...</div>
      </Modal>
    );
  }

  return (
    <Modal
      dir="ltr"
      className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-surface-card shadow-none scrollbar-dark"
    >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-surface-card px-6 pt-6 pb-0 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">إيصال الدفع</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-page hover:text-foreground"
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
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div dir="rtl" className="px-6 pb-6">
        {/* Station Info */}
        <div className="mt-4 mb-6 rounded-lg bg-surface-page/50 p-4">
          <div className="text-sm text-foreground-muted">
            {station.station_type === "billiard"
              ? "بلياردو"
              : station.station_type === "playstation"
                ? "بلايستيشن"
                : "بينغ بونغ"}
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">{station.name}</div>
          {receiptData.unit === "game" ? (
            <div className="mt-2 text-sm text-foreground-muted">
              عدد الجيمات: {formatCount(receiptData.games_count ?? 0)}
            </div>
          ) : (
            <>
              <div className="mt-2 text-sm text-foreground-muted">
                المدة: {receiptData.duration_formatted}
              </div>
              <div className="text-sm text-foreground-muted">
                من {formatTime(receiptData.start_time)} إلى {formatTime(receiptData.end_time)}
              </div>
            </>
          )}
        </div>

        {/* Items */}
        <div className="mb-6 space-y-3">
          {/* Session Cost — suppressed for billiard+games (game_entries_cost covers it) */}
          {receiptData.unit === "hour" || receiptData.game_entries_cost === 0 ? (
            <div className="flex justify-between text-sm">
              <span className="text-foreground-muted">
                {receiptData.unit === "game" ? "تكلفة اللعب" : "تكلفة الوقت"}
              </span>
              <span className="text-foreground">{formatCurrency(receiptData.time_cost)}</span>
            </div>
          ) : null}

          {/* Game Entries (billiard+games and PS/pingpong+games) */}
          {receiptData.game_entries.length > 0 && (
            <div className="border-t border-foreground-muted/20 pt-3">
              <div className="text-sm font-medium text-foreground mb-2">الجيمات المسجلة</div>
              {receiptData.game_entries.map((entry) => (
                <div key={entry.id} className="flex justify-between text-sm py-1">
                  {entry.entry_type === "billiard" ? (
                    <span className="text-foreground-muted">
                      {entry.play_type === "combo" ? "كومب" : "عادي"} /{" "}
                      {entry.play_subtype === "single"
                        ? "فردي"
                        : entry.play_subtype === "multi"
                          ? "مالتي"
                          : entry.play_subtype === "triple"
                            ? "متولتة"
                            : "مربعة"}{" "}
                      × {formatCount(entry.games_count)}
                    </span>
                  ) : (
                    <span className="text-foreground-muted">
                      {entry.mode === "single" ? "فردي" : "مالتي"} × {formatCount(entry.games_count)}
                    </span>
                  )}
                  <span className="text-foreground">
                    {formatCurrency(calculateGameEntrySubtotal(entry.games_count, entry.price_per_game))}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1">
                <span className="text-foreground-muted">إجمالي الجيمات</span>
                <span className="text-foreground">{formatCurrency(receiptData.game_entries_cost)}</span>
              </div>
            </div>
          )}

          {/* Products */}
          {receiptData.items.length > 0 && (
            <div className="border-t border-foreground-muted/20 pt-3">
              <div className="text-sm font-medium text-foreground mb-2">المشروبات</div>
              {receiptData.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm py-1">
                  <span className="text-foreground-muted">
                    {item.product_name} × {formatCount(item.quantity)}
                  </span>
                  <span className="text-foreground">{formatCurrency(item.total_price)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-1">
                <span className="text-foreground-muted">إجمالي المشروبات</span>
                <span className="text-foreground">{formatCurrency(receiptData.drinks_cost)}</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-foreground-muted/20 pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-foreground">الإجمالي</span>
              <span className="text-primary">{formatCurrency(receiptData.total_cost)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" fill onClick={onClose}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            size="lg"
            fill
            onClick={handleConfirm}
            disabled={confirmMutation.isPending}
          >
            {confirmMutation.isPending ? "جاري القفل..." : "تأكيد القفل"}
          </Button>
        </div>
        </div>
      </Modal>
  );
}
