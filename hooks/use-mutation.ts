"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export interface MutationConfig<TResult> {
  /** Exact per-call async work (fetch + state-dependent throws). */
  action: () => Promise<TResult>;
  /** Toast context prefix for console.error (verbatim from the source handler). */
  context: string;
  /** Success toast (omitted = silent success). */
  successMessage?: string;
  /** Toast shown when no specific error message is available. */
  fallbackError: string;
  /** Optional specific-message extraction; returning null/empty falls back. */
  getErrorMessage?: (error: unknown) => string | null;
  /** Runs after action resolves, before the success toast. */
  onSuccess?: (result: TResult) => void;
}

/** Extracts the thrown Error's message; sites whose catch shows a fixed
 *  message simply omit this option. */
export function errorMessageFrom(error: unknown): string | null {
  if (error instanceof Error && error.message) return error.message;
  return null;
}

export function useMutation() {
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  const mutate = async <TResult>(
    config: MutationConfig<TResult>
  ): Promise<TResult | null> => {
    setIsPending(true);
    try {
      const result = await config.action();
      config.onSuccess?.(result);
      if (config.successMessage) showToast("success", config.successMessage);
      return result;
    } catch (error) {
      const specific = config.getErrorMessage?.(error) ?? null;
      showToast("error", specific || config.fallbackError);
      console.error(config.context, error);
      return null;
    } finally {
      setIsPending(false);
    }
  };

  return { isPending, mutate };
}
