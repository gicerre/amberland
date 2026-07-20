import { cn } from "@/lib/utils";

type OrnamentSize = "xs" | "sm" | "md" | "lg";

/**
 * DEPRECATO (Obsidian, Constitution v2): gli ornamenti d'angolo sono
 * dismessi — il componente non renderizza nulla; i call site verranno
 * rimossi in N5. Firma invariata per compatibilità.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function CornerOrnaments(props: {
  className?: string;
  size?: OrnamentSize;
}) {
  return null;
}

/**
 * Divisore di sezione Obsidian: sempre una hairline quieta.
 * Le varianti "gem"/"rune" sono dismesse (Constitution v2) e rendono
 * la stessa linea; il parametro resta per compatibilità.
 */
export function SectionDivider({
  className,
}: {
  className?: string;
  variant?: "gem" | "rune" | "line";
}) {
  return <div aria-hidden className={cn("h-px bg-hairline", className)} />;
}

/**
 * Card base Obsidian (V3 §8): surface-1 su hairline, elevazione E1.
 * `stripe` è deprecato e ignorato (niente strisce dorate).
 */
export function FantasyCard({
  className,
  children,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stripe,
  ...props
}: React.ComponentProps<"div"> & { stripe?: boolean }) {
  return (
    <div
      className={cn(
        "elev-1 relative overflow-hidden rounded-xl border border-hairline bg-surface-1 p-6",
        "transition-[border-color,box-shadow] duration-200",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Pannello in evidenza: come FantasyCard ma su surface-2 con hairline
 * più netta; `glow` accende il micro-highlight superiore.
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
        "elev-1 relative overflow-hidden rounded-xl border border-hairline-strong bg-surface-2 p-6",
        glow && "shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_1px_2px_rgba(0,0,0,0.4)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Intestazione di sezione: titolo + hairline.
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
      <h2 className="font-heading text-xl font-semibold tracking-wide text-parchment whitespace-nowrap">
        {title}
      </h2>
      <SectionDivider className="flex-1" />
      {children}
    </div>
  );
}
