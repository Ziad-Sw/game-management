"use client";

import type { ReactNode } from "react";

export interface SectionCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
}

/**
 * Shared settings section card — the `rounded-xl bg-surface-card p-6`
 * container with the standard h2 title and muted description row.
 * Sections with non-standard headers (e.g. dynamic counts) stay raw.
 */
export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <div className="rounded-xl bg-surface-card p-6">
      {title && <h2 className="text-lg font-semibold text-foreground">{title}</h2>}
      {description && <p className="mt-1 text-sm text-foreground-muted">{description}</p>}
      {children}
    </div>
  );
}
