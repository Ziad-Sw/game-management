"use client";

import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from "react";

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function NumericInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder = "أدخل القيمة",
  required = false,
  disabled = false,
  className = "",
}: NumericInputProps) {
  const [mobileInput, setMobileInput] = useState(() =>
    value === 0 ? "" : String(value)
  );
  const prevValueRef = useRef(value);

  const isTouch = useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(pointer: coarse)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );

  useEffect(() => {
    if (!isTouch) return;
    prevValueRef.current = value;
    const expected = value === 0 ? "" : String(value);
    setMobileInput((current) => (current === expected ? current : expected));
  }, [value, isTouch]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      if (isTouch) {
        if (raw !== "" && !/^\d*$/.test(raw)) return;
        setMobileInput(raw);
      }
      const parsed = parseInt(raw, 10);
      let num = isNaN(parsed) ? 0 : parsed;
      if (min !== undefined) num = Math.max(num, min);
      if (max !== undefined) num = Math.min(num, max);
      onChange(num);
    },
    [onChange, min, max, isTouch]
  );

  const baseClass =
    "w-full rounded-lg bg-surface-page px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary";

  if (isTouch) {
    return (
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        lang="en"
        value={mobileInput}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-required={required}
        style={{ fontSize: '16px' }}
        className={`${baseClass} ${className}`}
      />
    );
  }

  return (
    <input
      type="number"
      value={value}
      onChange={handleChange}
      min={min}
      max={max}
      step={step}
      lang="en"
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      aria-required={required}
      className={`${baseClass} ${className}`}
    />
  );
}
