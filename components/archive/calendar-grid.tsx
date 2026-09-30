"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatCount, formatCurrency } from "@/lib/format/number";
import { formatDate, formatTime } from "@/lib/format/time";
import type { ArchiveShift } from "@/types/archive";

interface CalendarGridProps {
  shifts: ArchiveShift[];
}

function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function CalendarGrid({ shifts }: CalendarGridProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { days, shiftsByDate } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { number: number; date: Date; dateStr: string }[] = [];

    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ number: i + 1, date: d, dateStr: toDateStr(d) });
    }

    const shiftsByDate = new Map<string, ArchiveShift[]>();
    for (const shift of shifts) {
      const dateStr = toDateStr(new Date(shift.opened_at));
      const existing = shiftsByDate.get(dateStr);
      if (existing) {
        existing.push(shift);
      } else {
        shiftsByDate.set(dateStr, [shift]);
      }
    }

    return { days, shiftsByDate };
  }, [shifts]);

  const selectedDayShifts = shiftsByDate.get(selectedDate ?? "") ?? [];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-foreground-muted leading-relaxed">
          <span className="font-medium text-primary">ملاحظة: </span>
          يتم الاحتفاظ بالبيانات لمدة 30 يومًا فقط. سيتم حذف أي وردية تلقائيًا بعد مرور 30 يومًا من تاريخ إغلاقها.
        </p>
      </div>

      {/* Numbered Grid */}
      <div className="rounded-xl bg-surface-card p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          آخر {formatCount(30)} يوم
        </h2>

        <div className="grid grid-cols-6 gap-2">
          {days.map((day) => {
            const hasShifts = (shiftsByDate.get(day.dateStr)?.length ?? 0) > 0;
            const isSelected = day.dateStr === selectedDate;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => setSelectedDate(day.dateStr)}
                className={`
                  relative flex flex-col items-center justify-center rounded-lg
                  min-h-[52px] p-1 text-sm transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-primary/60
                  ${
                    isSelected
                      ? "bg-primary/20 text-primary ring-2 ring-primary/40"
                      : "text-foreground hover:bg-surface-page"
                  }
                `}
                title={formatDate(day.date)}
              >
                <span className="font-semibold text-base">{formatCount(day.number)}</span>
                {hasShifts && (
                  <span
                    className={`mt-0.5 h-1.5 w-1.5 rounded-full ${
                      isSelected ? "bg-primary" : "bg-primary/60"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Shifts */}
      {selectedDate && (
        <div className="rounded-xl bg-surface-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              الورديات في {formatDate(selectedDate + "T12:00:00")}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              إغلاق
            </button>
          </div>

          {selectedDayShifts.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              لا توجد ورديات في هذا اليوم.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayShifts.map((shift) => (
                <Link
                  key={shift.id}
                  href={`/archive/${shift.id}`}
                  className="block rounded-lg border border-foreground-muted/10 bg-surface-page/50 p-4 transition-colors hover:border-primary/30 hover:bg-surface-page"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-foreground">
                        الوردية #{formatCount(shift.shift_number)}
                      </span>
                      <span className="text-xs text-foreground-muted">
                        {formatTime(shift.opened_at)} — {formatTime(shift.closed_at)}
                      </span>
                      <span className="text-xs text-foreground-muted">
                        {shift.responsible_name}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-primary">
                      {formatCurrency(shift.total_revenue - (shift.expensesTotal ?? 0))}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary: All shifts listed for deep linking */}
      <div className="rounded-xl bg-surface-card p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          جميع الورديات ({formatCount(shifts.length)})
        </h3>

        {shifts.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            لا توجد ورديات مقفولة في آخر 30 يوم.
          </p>
        ) : (
          <div className="space-y-2">
            {shifts.map((shift) => (
              <Link
                key={shift.id}
                href={`/archive/${shift.id}`}
                className="flex items-center justify-between rounded-lg border border-foreground-muted/10 bg-surface-page/30 p-3 transition-colors hover:border-primary/30 hover:bg-surface-page"
              >
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <span className="font-medium text-foreground text-sm whitespace-nowrap">
                    الوردية #{formatCount(shift.shift_number)}
                  </span>
                  <span className="text-xs text-foreground-muted whitespace-nowrap">
                    {formatDate(shift.opened_at)}
                  </span>
                  <span className="text-xs text-foreground-muted whitespace-nowrap">
                    {formatTime(shift.opened_at)} — {formatTime(shift.closed_at)}
                  </span>
                  <span className="text-xs text-foreground-muted truncate">
                    {shift.responsible_name}
                  </span>
                </div>
                <span className="text-sm font-medium text-primary whitespace-nowrap mr-3">
                  {formatCurrency(shift.total_revenue - (shift.expensesTotal ?? 0))}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
