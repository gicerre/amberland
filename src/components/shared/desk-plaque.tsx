import { cn } from "@/lib/utils";

interface DeskPlaqueProps {
  /** Occhiello diegetico sopra il titolo (es. "Strumenti del narratore"). */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Header dello Scrittoio — registro di pagina per gli strumenti operativi
 * (Master, Admin, Grafo, Commercio). Obsidian (V3 §9): superficie pulita
 * su hairline, titolo Cinzel, azioni a destra. Niente hero, niente
 * ornamenti.
 */
export function DeskPlaque({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}: DeskPlaqueProps) {
  return (
    <header
      className={cn(
        "elev-1 relative mb-6 overflow-hidden rounded-xl border border-hairline bg-surface-1 sm:mb-8",
        className
      )}
    >
      <div className="relative flex min-h-24 flex-col justify-center gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-7">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold tracking-[0.12em] text-gold/70 uppercase">
              {eyebrow}
            </p>
          )}
          <h1 className="font-heading text-xl font-bold tracking-wide text-parchment sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
