import { Castle } from "lucide-react";

import { cn } from "@/lib/utils";

/** Schermata di caricamento a tema, usata da guardie e Suspense. */
export function LoadingScreen({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-svh flex-col items-center justify-center gap-5",
        className
      )}
    >
      <div className="flex size-16 animate-pulse items-center justify-center rounded-full border border-gold/40 bg-gold/10 shadow-[0_0_40px_rgba(212,175,55,0.18)]">
        <Castle className="size-7 text-gold" />
      </div>
      <p className="font-heading text-sm tracking-[0.3em] text-muted-foreground uppercase">
        Evocazione in corso…
      </p>
    </div>
  );
}
