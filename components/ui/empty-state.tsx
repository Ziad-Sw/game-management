"use client";

export interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="rounded-xl bg-surface-card p-8 text-center">
      <p className="text-foreground-muted">{message}</p>
    </div>
  );
}
