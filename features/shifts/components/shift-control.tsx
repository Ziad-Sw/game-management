"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { formatCount } from "@/lib/format/number";
import { formatTime } from "@/lib/format/time";
import { ENDPOINTS } from "@/lib/constants/endpoints";
import { OpenShiftModal } from "./open-shift-modal";
import { CloseShiftModal } from "./close-shift-modal";

interface Shift {
  id: string;
  responsible_name: string;
  shift_number: number;
  opened_at: string;
  status: "open" | "closed";
}

interface ShiftControlProps {
  canManageShifts?: boolean;
}

export function ShiftControl({ canManageShifts = true }: ShiftControlProps) {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [closedShift, setClosedShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closePressedAt, setClosePressedAt] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchCurrentShift = async () => {
    try {
      const response = await fetch(ENDPOINTS.shifts.current);
      const data = await response.json();
      
      if (response.ok) {
        setCurrentShift(data.shift);
      }
    } catch (error) {
      console.error("Failed to fetch current shift:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      await fetchCurrentShift();
    })();
  }, []);

  const handleOpenShift = async (responsibleName: string) => {
    try {
      const response = await fetch(ENDPOINTS.shifts.open, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsible_name: responsibleName }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsCloseModalOpen(false);
        setClosedShift(null);
        await fetchCurrentShift();
      } else {
        showToast("error", data.error || "فشل فتح الوردية");
      }
    } catch (error) {
      console.error("Failed to open shift:", error);
      throw error;
    }
  };

  const handleCloseShift = async (shiftId: string) => {
    try {
      const response = await fetch(ENDPOINTS.shifts.close, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shift_id: shiftId }),
      });

      const data = await response.json();

      if (response.ok) {
        setClosedShift(data.shift);
        await fetchCurrentShift();
        return data.shift;
      } else {
        showToast("error", data.error || "فشل إغلاق الوردية");
        return null;
      }
    } catch (error) {
      console.error("Failed to close shift:", error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface-card rounded-lg p-4 border border-foreground-muted/20">
        <div className="animate-pulse h-6 bg-surface-page rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-surface-card rounded-lg p-4 border border-foreground-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {currentShift ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-green-400 text-sm font-medium">وردية مفتوحة</span>
                  <span className="text-foreground-muted text-sm">•</span>
                  <span className="text-foreground text-sm">
                    {currentShift.responsible_name}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-foreground-muted text-sm">
                  <span>رقم {formatCount(currentShift.shift_number)}</span>
                  <span>•</span>
                  <span>من {formatTime(currentShift.opened_at)}</span>
                </div>
              </div>
            ) : (
              <div className="text-foreground-muted text-sm">لا توجد وردية مفتوحة</div>
            )}
          </div>

          <div>
            {currentShift ? (
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setClosePressedAt(new Date().toISOString());
                setIsCloseModalOpen(true);
              }}
              disabled={!canManageShifts}
            >
              إنهاء وردية
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
              disabled={!canManageShifts}
            >
              فتح وردية
            </Button>
            )}
          </div>
        </div>
      </div>

      <OpenShiftModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onOpenShift={handleOpenShift}
      />

      <CloseShiftModal
        isOpen={isCloseModalOpen}
        onClose={() => {
          setIsCloseModalOpen(false);
          setClosedShift(null);
          setClosePressedAt(null);
        }}
        shift={closedShift ?? currentShift}
        pressedAt={closePressedAt}
        onCloseShift={handleCloseShift}
      />
    </>
  );
}
