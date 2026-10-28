"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

interface OpenShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShift: (responsibleName: string) => Promise<void>;
}

export function OpenShiftModal({
  isOpen,
  onClose,
  onOpenShift,
}: OpenShiftModalProps) {
  const [responsibleName, setResponsibleName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!responsibleName.trim()) {
      showToast("error", "اسم المسؤول مطلوب");
      return;
    }

    setIsSubmitting(true);
    try {
      await onOpenShift(responsibleName.trim());
      setResponsibleName("");
      onClose();
      showToast("success", "تم فتح الوردية بنجاح");
    } catch (error) {
      console.error("Failed to open shift:", error);
      showToast("error", "فشل فتح الوردية");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal className="bg-surface-card mx-4 w-full max-w-md rounded-xl border border-foreground-muted/20 p-6 shadow-2xl">
      <h2 className="text-xl font-bold text-foreground mb-4">فتح وردية جديدة</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="responsibleName" className="block text-foreground-muted mb-2">
              اسم المسؤول
            </label>
            <Input
              type="text"
              id="responsibleName"
              value={responsibleName}
              onChange={(e) => setResponsibleName(e.target.value)}
              placeholder="أدخل اسم المسؤول"
              autoFocus
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الفتح..." : "فتح وردية"}
            </Button>
          </div>
        </form>
    </Modal>
  );
}
