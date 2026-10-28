"use client";

import type { HTMLAttributes, ReactNode } from "react";

const OVERLAY_CLASSES =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm";

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** Card classes, verbatim from the source implementation. */
  className: string;
}

/**
 * Shared modal — structural extraction only, no visual redesign.
 * Card styling stays at every call site (verbatim strings) because cards
 * intentionally differ across the app (bordered vs shadow-none popups).
 */
export function Modal({
  children,
  className,
  ...cardProps
}: ModalProps) {
  return (
    <div className={OVERLAY_CLASSES}>
      <div className={className} {...cardProps}>
        {children}
      </div>
    </div>
  );
}
