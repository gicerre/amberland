"use client";

import { useId } from "react";

import { cn } from "@/lib/utils";

export interface LeverOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

/**
 * Segmented control Obsidian (V3 §8): contenitore pill su surface-0,
 * indicatore surface-3 che scivola con `--ease-in-out` (200ms).
 * Il nome resta LeverToggle per continuità API (rinomina in N2).
 * Accessibile come radiogroup.
 */
export function LeverToggle<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: LeverOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Etichetta per gli screen reader (es. "Vista dell'archivio"). */
  label: string;
  className?: string;
}) {
  const groupId = useId();
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "relative inline-grid auto-cols-fr grid-flow-col rounded-full border border-hairline bg-surface-0 p-1",
        className
      )}
    >
      {/* Indicatore che scivola tra le posizioni */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-full border border-hairline-strong bg-surface-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-transform duration-200 ease-[var(--ease-in-out)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            id={`${groupId}-${option.value}`}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
              isActive
                ? "font-semibold text-parchment"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
