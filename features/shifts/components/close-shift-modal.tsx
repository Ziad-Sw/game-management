"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { formatCount } from "@/lib/format/number";
import { formatTime } from "@/lib/format/time";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface CloseShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: {
    id: string;
    responsible_name: string;
    shift_number: number;
    opened_at: string;
  } | null;
  pressedAt?: string | null;
  onCloseShift: (shiftId: string) => Promise<{
    closed_at: string | null;
  } | null>;
}

export function CloseShiftModal({
  isOpen,
  onClose,
  shift,
  pressedAt,
  onCloseShift,
}: CloseShiftModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [closedAt, setClosedAt] = useState<string | null>(null);
  const { showToast } = useToast();

  const handleSubmit = async () => {
    if (!shift) return;

    setIsSubmitting(true);
    try {
      const result = await onCloseShift(shift.id);
      if (result) {
        setClosedAt(result.closed_at);
        setIsClosed(true);
        showToast("success", "تم إغلاق الوردية بنجاح");
      }
    } catch (error) {
      console.error("Failed to close shift:", error);
      showToast("error", "فشل إغلاق الوردية");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsClosed(false);
    setClosedAt(null);
    onClose();
  };

  if (!isOpen || !shift) return null;

  return (
    <Modal className="bg-surface-card mx-4 w-full max-w-md rounded-xl border border-foreground-muted/20 p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-foreground mb-4">
        {isClosed ? "تم إغلاق الوردية" : "إنهاء الوردية"}
      </h2>

      <div className="mb-6 space-y-3">
          <div className="flex justify-between text-foreground-muted">
            <span>اسم المسؤول:</span>
            <span className="text-foreground font-medium">{shift.responsible_name}</span>
          </div>
          <div className="flex justify-between text-foreground-muted">
            <span>رقم الوردية:</span>
            <span className="text-foreground font-medium">{formatCount(shift.shift_number)}</span>
          </div>
          <div className="flex justify-between text-foreground-muted">
            <span>وقت الفتح:</span>
            <span className="text-foreground font-medium">{formatTime(shift.opened_at)}</span>
          </div>
          {(isClosed && closedAt) || pressedAt ? (
            <div className="flex justify-between text-foreground-muted">
              <span>وقت الإغلاق:</span>
              <span className="text-foreground font-medium">
                {formatTime(isClosed && closedAt ? closedAt : (pressedAt ?? shift.opened_at))}
              </span>
            </div>
          ) : null}
      </div>

      <div className="flex gap-3 justify-end">
        {isClosed ? (
          <Button variant="secondary" size="sm" onClick={handleDismiss}>
            تم
          </Button>
        ) : (
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الإغلاق..." : "إنهاء وردية"}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
