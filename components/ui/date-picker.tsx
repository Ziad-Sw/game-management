"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const DAYS = ["سبت", "أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة"];

function toDate(value: string): Date {
  if (!value) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function DatePicker({ value, onChange, className = "" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedDate = toDate(value);
  const [viewDate, setViewDate] = useState(selectedDate);

  const close = useCallback(() => {
    setIsOpen(false);
    setPosition(null);
  }, []);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelHeight = 320;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensAbove = spaceBelow < panelHeight + gap;

    setPosition({
      top: opensAbove ? rect.top - panelHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const openPicker = useCallback(() => {
    setViewDate(selectedDate);
    updatePosition();
    setIsOpen(true);
  }, [selectedDate, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsideList = listRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideList) {
        close();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };

    const handleReposition = () => {
      updatePosition();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isOpen, close, updatePosition]);

  const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const startDay = start.getDay(); // 0=Sunday
  const offset = (startDay + 1) % 7; // shift so Saturday=0
  const daysInMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    0
  ).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const cells: (number | null)[] = Array.from({ length: offset }, () => null);
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(i);
  }

  const remaining = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 0; i < remaining; i++) {
    cells.push(null);
  }

  return (
    <div ref={triggerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={openPicker}
        className="w-full min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-right text-foreground outline-none focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30"
        dir="rtl"
        lang="ar"
        style={{ direction: "rtl", textAlign: "right" }}
      >
        {value || "اختر التاريخ"}
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={listRef}
            className="fixed z-[60] w-[300px] rounded-lg border border-foreground-muted/20 bg-surface-card p-3 shadow-2xl"
            style={{ top: position.top, left: position.left }}
            dir="rtl"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                  )
                }
                className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-page hover:text-foreground"
                aria-label="الشهر السابق"
              >
                ‹
              </button>
              <div className="text-sm font-medium text-foreground">
                {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
              </div>
              <button
                type="button"
                onClick={() =>
                  setViewDate(
                    new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                  )
                }
                className="rounded-md p-1 text-foreground-muted transition-colors hover:bg-surface-page hover:text-foreground"
                aria-label="الشهر التالي"
              >
                ›
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-foreground-muted">
              {DAYS.map((day) => (
                <div key={day}>{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {cells.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} />;
                }

                const current = new Date(
                  viewDate.getFullYear(),
                  viewDate.getMonth(),
                  day
                );
                const isSelected = isSameDay(current, selectedDate);
                const isToday = isSameDay(current, today);

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      onChange(toIso(current));
                      close();
                    }}
                    className={[
                      "flex h-9 w-full items-center justify-center rounded-md transition-colors",
                      isSelected
                        ? "bg-primary text-surface-page"
                        : "text-foreground hover:bg-surface-page",
                      isToday && !isSelected ? "border border-primary/40" : "",
                    ].join(" ")}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
