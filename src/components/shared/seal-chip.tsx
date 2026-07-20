"use client";

import { cn } from "@/lib/utils";

/**
 * Chip-filtro Obsidian (V3 §8): pill su hairline, 13px; attivo = fondo
 * tinto d'accento + bordo gold + testo gold-bright. Il nome resta
 * SealChip per continuità API (rinomina in N2).
 */
export function SealChip({
  active,
  label,
  onClick,
  icon,
  className,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  /** Glifo opzionale del tipo (lucide 14px). */
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-150",
        active
          ? "border-gold/60 bg-gold-dim font-semibold text-gold-bright"
          : "border-hairline bg-surface-1 text-muted-foreground hover:border-hairline-strong hover:text-foreground",
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
