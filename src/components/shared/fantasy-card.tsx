import { cn } from "@/lib/utils";

/** Quattro angoli ornamentali dorati, da inserire in un contenitore relative. */
export function CornerOrnaments({ className }: { className?: string }) {
  const base = "pointer-events-none absolute size-3.5 border-gold/40";
  return (
    <>
      <span aria-hidden className={cn(base, "left-2 top-2 border-l border-t", className)} />
      <span aria-hidden className={cn(base, "right-2 top-2 border-r border-t", className)} />
      <span aria-hidden className={cn(base, "bottom-2 left-2 border-b border-l", className)} />
      <span aria-hidden className={cn(base, "bottom-2 right-2 border-b border-r", className)} />
    </>
  );
}

/** Card "pergamena scura" con bordo dorato e angoli ornamentali. */
export function FantasyCard({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gold/20 bg-gradient-to-b from-card via-card to-night/70 p-6",
        "shadow-[0_10px_40px_-18px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(212,175,55,0.08)]",
        className
      )}
      {...props}
    >
      <CornerOrnaments />
      {children}
    </div>
  );
}

/** Divisore decorativo: linea dorata con gemma centrale. */
export function SectionDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/40 to-gold/60" />
      <span className="size-1.5 rotate-45 border border-gold/60 bg-gold/20" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/40 to-gold/60" />
    </div>
  );
}
