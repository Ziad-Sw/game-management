"use client";

import type { PricingMode } from "@/types/database";

interface ModeToggleProps {
  value: PricingMode;
  onChange: (mode: PricingMode) => void;
  size?: "md" | "sm";
}

const sizeClasses = {
  md: "px-4 py-3 text-sm",
  sm: "px-3 py-2 text-xs",
};

export function ModeToggle({ value, onChange, size = "md" }: ModeToggleProps) {
  const btnClass = sizeClasses[size];
  const gapClass = size === "sm" ? "gap-2" : "gap-3";

  return (
    <div className={`grid grid-cols-2 ${gapClass}`}>
      <button
        type="button"
        onClick={() => onChange("single")}
        className={`rounded-lg border font-medium transition-colors ${btnClass} ${
          value === "single"
            ? "border-primary bg-primary/10 text-primary"
            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
        }`}
      >
        فردي
      </button>
      <button
        type="button"
        onClick={() => onChange("multi")}
        className={`rounded-lg border font-medium transition-colors ${btnClass} ${
          value === "multi"
            ? "border-primary bg-primary/10 text-primary"
            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
        }`}
      >
        مالتي
      </button>
    </div>
  );
}
