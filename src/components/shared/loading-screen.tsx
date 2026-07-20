import Image from "next/image";

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
      <Image
        src="/logo/logo.png"
        alt="Emblema di Amberland"
        width={72}
        height={72}
        priority
        className="size-16 animate-pulse object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
      />
      <p className="font-heading text-sm tracking-[0.3em] text-muted-foreground uppercase">
        Evocazione in corso…
      </p>
    </div>
  );
}
