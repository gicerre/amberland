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
        className="size-16 animate-pulse object-contain drop-shadow-[0_0_40px_rgba(212,175,55,0.25)]"
      />
      <p className="font-heading text-sm tracking-[0.3em] text-muted-foreground uppercase">
        Evocazione in corso…
      </p>
    </div>
  );
}
