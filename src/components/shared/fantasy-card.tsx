import { cn } from "@/lib/utils";

type OrnamentSize = "xs" | "sm" | "md" | "lg";

/**
 * Config per variante di ornamento.
 * IMPORTANTE: non usare `border` shorthand perché renderebbe visibili tutti
 * e 4 i lati. Si usano solo le utility dei lati specifici (border-l, border-t…).
 */
const ORNAMENT: Record<OrnamentSize, {
  sz: string;
  /* posizioni assolute per ogni angolo */
  tl: string; tr: string; bl: string; br: string;
  /* lati visibili + spessore per ogni angolo */
  tlB: string; trB: string; blB: string; brB: string;
}> = {
  xs: {
    sz: "size-2.5",
    tl: "left-1.5 top-1.5", tr: "right-1.5 top-1.5",
    bl: "bottom-1.5 left-1.5", br: "bottom-1.5 right-1.5",
    tlB: "border-l border-t", trB: "border-r border-t",
    blB: "border-b border-l", brB: "border-b border-r",
  },
  sm: {
    sz: "size-4",
    tl: "left-2 top-2", tr: "right-2 top-2",
    bl: "bottom-2 left-2", br: "bottom-2 right-2",
    tlB: "border-l border-t", trB: "border-r border-t",
    blB: "border-b border-l", brB: "border-b border-r",
  },
  md: {
    sz: "size-5",
    tl: "left-2.5 top-2.5", tr: "right-2.5 top-2.5",
    bl: "bottom-2.5 left-2.5", br: "bottom-2.5 right-2.5",
    tlB: "border-l-2 border-t-2", trB: "border-r-2 border-t-2",
    blB: "border-b-2 border-l-2", brB: "border-b-2 border-r-2",
  },
  lg: {
    sz: "size-7",
    tl: "left-3 top-3", tr: "right-3 top-3",
    bl: "bottom-3 left-3", br: "bottom-3 right-3",
    tlB: "border-l-2 border-t-2", trB: "border-r-2 border-t-2",
    blB: "border-b-2 border-l-2", brB: "border-b-2 border-r-2",
  },
};

/**
 * Quattro angoli ornamentali dorati.
 * size: xs | sm (default) | md | lg
 * className: applicato a tutti gli angoli (colore bordo, z-index, ecc.).
 * Retrocompatibile: i vecchi chiamanti possono passare size via className.
 */
export function CornerOrnaments({
  className,
  size = "sm",
}: {
  className?: string;
  size?: OrnamentSize;
}) {
  const c = ORNAMENT[size];
  const base = cn("pointer-events-none absolute border-gold/35", c.sz);

  return (
    <>
      <span aria-hidden className={cn(base, c.tl, c.tlB, className)} />
      <span aria-hidden className={cn(base, c.tr, c.trB, className)} />
      <span aria-hidden className={cn(base, c.bl, c.blB, className)} />
      <span aria-hidden className={cn(base, c.br, c.brB, className)} />
    </>
  );
}

/** Divisore decorativo: linea dorata con gemma centrale. */
export function SectionDivider({
  className,
  variant = "gem",
}: {
  className?: string;
  variant?: "gem" | "rune" | "line";
}) {
  if (variant === "line") {
    return (
      <div aria-hidden className={cn("h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent", className)} />
    );
  }

  if (variant === "rune") {
    return (
      <div aria-hidden className={cn("flex items-center gap-2", className)}>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/35 to-gold/50" />
        <span className="font-heading text-[8px] tracking-[0.4em] text-gold/40 uppercase select-none">✦</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/35 to-gold/50" />
      </div>
    );
  }

  /* default: gem */
  return (
    <div aria-hidden className={cn("flex items-center gap-3", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/35 to-gold/55" />
      <span className="relative flex size-2 items-center justify-center">
        <span className="absolute size-2 rotate-45 border border-gold/55 bg-gold/15" />
      </span>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/35 to-gold/55" />
    </div>
  );
}

/**
 * Card "pergamena scura" standard con bordo dorato e angoli ornamentali.
 * La striscia superiore sottile è il segno distintivo di una voce del tomo.
 */
export function FantasyCard({
  className,
  children,
  stripe = true,
  ...props
}: React.ComponentProps<"div"> & { stripe?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gold/18 bg-gradient-to-b from-stone-surface via-card to-stone-mid/80 p-6",
        "shadow-[0_12px_48px_-18px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(212,175,55,0.07)]",
        "transition-[border-color,box-shadow] duration-200",
        className
      )}
      {...props}
    >
      {stripe && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent"
        />
      )}
      <CornerOrnaments size="sm" />
      {children}
    </div>
  );
}

/**
 * Pannello "featured" — versione più elaborata di FantasyCard
 * con bordo più luminoso, angoli grandi e glow permanente.
 * Usato per hero sections e pannelli importanti.
 */
export function FantasyPanel({
  className,
  children,
  glow = false,
  ...props
}: React.ComponentProps<"div"> & { glow?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-br from-stone-surface via-card to-stone-mid/90 p-6",
        "shadow-[0_16px_56px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(212,175,55,0.1)]",
        glow && "shadow-[0_0_40px_rgba(212,175,55,0.08),0_16px_56px_-20px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(212,175,55,0.12)]",
        className
      )}
      {...props}
    >
      {/* Striscia superiore più luminosa */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />
      {/* Bagliore angolo top-left */}
      <span
        aria-hidden
        className="pointer-events-none absolute -left-8 -top-8 size-32 rounded-full bg-gold/[0.04] blur-2xl"
      />
      <CornerOrnaments size="md" />
      {children}
    </div>
  );
}

/**
 * Intestazione di sezione: titolo + divisore ornamentale.
 */
export function SectionTitle({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("mb-5 flex items-center gap-4", className)}>
      <h2 className="font-heading text-xl font-semibold tracking-wider text-foreground whitespace-nowrap">
        {title}
      </h2>
      <SectionDivider className="flex-1" />
      {children}
    </div>
  );
}
