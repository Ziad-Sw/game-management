"use client";

import { Button } from "./button";
import { Modal } from "./modal";

export interface ConfirmDialogProps {
  title: string;
  message: string;
  /** Caller computes dynamic labels (e.g. "جاري الحذف..." while loading). */
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
}

/**
 * Shared confirmation dialog — the pattern used by logout and all
 * delete confirmations: centered max-w-sm card, title, message,
 * and a cancel/danger Button pair (secondary + danger, md, fill).
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  confirmDisabled = false,
  cancelDisabled = false,
}: ConfirmDialogProps) {
  return (
    <Modal className="bg-surface-card mx-4 w-full max-w-sm rounded-xl border border-foreground-muted/20 p-6 shadow-2xl">
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mb-6 text-sm text-foreground-muted">{message}</p>
      <div className="flex gap-3">
        <Button
          variant="secondary"
          size="md"
          fill
          onClick={onCancel}
          disabled={cancelDisabled}
        >
          إلغاء
        </Button>
        <Button
          variant="danger"
          size="md"
          fill
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
