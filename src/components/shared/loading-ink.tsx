import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Caricamento diegetico (DESIGN_SYSTEM_V2 §4.14): l'inchiostro si sta
 * ancora asciugando sulla pagina. Deriva dallo Skeleton base (che già
 * implementa la macchia + respiro `ink-dry`) aggiungendo la cornice di
 * carta. La shape deve ricalcare il contenuto atteso.
 */
export function LoadingInk({ className }: { className?: string }) {
  return (
    <Skeleton
      aria-hidden
      className={cn("rounded-xl border border-gold-dim/25 bg-night", className)}
    />
  );
}

/**
 * Righe di testo in caricamento: larghezze variate deterministiche
 * per una shape fedele ai paragrafi attesi.
 */
export function LoadingInkLines({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["w-11/12", "w-full", "w-4/5", "w-9/12", "w-10/12"];
  return (
    <div aria-hidden className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={cn("h-4 rounded-sm", widths[index % widths.length])}
        />
      ))}
    </div>
  );
}
