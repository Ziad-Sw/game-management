"use client";

import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "link"
  | "toggle"
  | "custom";

export type ButtonSize = "none" | "sm" | "md" | "lg" | "xl";

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Fill a stretched flex parent (flex: 1). */
  fill?: boolean;
  /** Full-row width (w-full). Mutually exclusive with `fill`. */
  fullWidth?: boolean;
  /** font-semibold instead of the default font-medium. */
  bold?: boolean;
  /** Use transition-all instead of transition-colors (login submit pattern). */
  transitionAll?: boolean;
  /** Disables the button and exposes aria-busy. Callers keep their own loading JSX. */
  loading?: boolean;
  /** Only meaningful with variant="toggle". */
  selected?: boolean;
  disabled?: boolean;
}

const VARIANT_CLASSES: Record<Exclude<ButtonVariant, "toggle">, string> = {
  // Token-only. Source pattern: receipt confirm / login submit.
  primary: "bg-primary text-surface-page hover:bg-primary/90",
  // Source pattern: authenticated-shell logout cancel.
  secondary:
    "border border-foreground-muted/20 bg-surface-page text-foreground hover:bg-surface-card",
  // Source pattern: receipt-popup cancel (transparent until hover).
  ghost:
    "border border-foreground-muted/30 text-foreground hover:bg-surface-page",
  // Source pattern: authenticated-shell logout confirm.
  danger:
    "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  // Source pattern: login "forgot ID" text button.
  link: "text-primary hover:text-primary/80",
  // Escape hatch for pre-token legacy colors (shift-control blue-600/red-600).
  // Colors MUST come from className at the call site. Stage 4 replaces these
  // call sites with token variants and then this option stays for emergencies.
  custom: "",
};

function toggleClasses(selected: boolean): string {
  return selected
    ? "border border-primary bg-primary/10 text-primary"
    : "border border-foreground-muted/20 text-foreground-muted hover:border-foreground-muted/40 hover:text-foreground";
}

const SIZE_CLASSES: Record<ButtonSize, string> = {
  none: "",
  // Shift open/close + shift modals padding (no min-height — height changes are Stage 4).
  sm: "px-4 py-2",
  // Logout modal buttons.
  md: "min-h-[44px] px-4 py-2",
  // Receipt popup actions.
  lg: "px-4 py-3",
  // Login submit.
  xl: "h-11 px-4",
};

/**
 * Shared button — structural extraction only, no visual redesign.
 * Every variant/size string above is copied verbatim from an existing
 * call site so migrated buttons render pixel-identical output.
 */
export function Button({
  variant = "primary",
  size = "md",
  fill = false,
  fullWidth = false,
  bold = false,
  transitionAll = false,
  loading = false,
  selected = false,
  disabled = false,
  type = "button",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const colors =
    variant === "toggle" ? toggleClasses(selected) : VARIANT_CLASSES[variant];

  const classes = [
    "inline-flex items-center justify-center rounded-lg text-sm",
    bold ? "font-semibold" : "font-medium",
    transitionAll ? "transition-all duration-150" : "transition-colors",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    colors,
    SIZE_CLASSES[size],
    fill ? "flex-1" : "",
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      aria-disabled={isDisabled || undefined}
      className={classes}
      {...rest}
    >
      {children}
    </button>
  );
}
