"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { getAsset } from "@/design-system/assets/registry"
import { SvgAssetBase } from "@/design-system/components/svg-asset"

// Shell SVG dal registry asset design system (vedi src/design-system).
// BTN01 = CTA primario, BTN12 = frame secondario (outline/secondary/destructive),
// BTN_ICON = FrameSquare_03 per le varianti icon-size.
const BTN01_ASSET = getAsset("button_01")
const BTN12_ASSET = getAsset("button_12")
const BTN_ICON_ASSET = getAsset("frame_square_03")
// BTN12: viewBox nativo 0 0 762 252 espanso di 2/4px per lato per includere
// le corone ornamentali che sporgono dal rettangolo principale.
const BTN12_VIEWBOX_PAD = { x: 2, y: 4 }

// ─── Padding calibrato per forma SVG ─────────────────────────────────────────
// BTN01: ali ~17% → serve molto spazio orizzontale
const BTN01_PAD: Record<string, string> = {
  default: "px-10 py-2.5",
  sm:      "px-7  py-1.5",
  lg:      "px-12 py-3",
  xs:      "px-5  py-1",
}
// BTN12: frame ~5% → padding standard, non serve coprire ali grandi
const BTN12_PAD: Record<string, string> = {
  default: "px-5 py-2",
  sm:      "px-3 py-1.5",
  lg:      "px-6 py-2.5",
  xs:      "px-2 py-1",
}

// ─── Varianti SVG per BTN12 ───────────────────────────────────────────────────
// shell: colore dell'SVG (currentColor via fill="currentColor")
// text:  colore del testo sopra l'SVG
// Palette definitiva da decidere nella prossima sessione — qui valori corretti ma provvisori
const BTN12_STYLES: Record<string, { shell: string; text: string }> = {
  outline: {
    shell: "text-gold/55 group-hover/button:text-gold/90 group-hover/button:[filter:drop-shadow(0_0_8px_rgba(200,167,93,0.3))]",
    text:  "text-gold/90 hover:text-gold",
  },
  secondary: {
    shell: "text-foreground/30 group-hover/button:text-foreground/55",
    text:  "text-foreground/80 hover:text-foreground",
  },
  destructive: {
    shell: "text-crimson/65 group-hover/button:text-crimson group-hover/button:[filter:drop-shadow(0_0_8px_rgba(185,28,28,0.5))]",
    text:  "text-red-300 hover:text-red-200",
  },
}

// Dimensione fissa per icon-size (niente padding, il bottone è quadrato)
const ICON_SIZE_CLASS: Record<string, string> = {
  "icon":    "size-8",
  "icon-xs": "size-6",
  "icon-sm": "size-7",
  "icon-lg": "size-9",
}

const ICON_SIZES    = new Set(Object.keys(ICON_SIZE_CLASS))
// ghost e link restano CSS: non sono "oggetti fisici", sono azioni testuali
const BTN12_VARIANTS = new Set(["outline", "secondary", "destructive"])

// ─── CVA fallback (ghost, link, asChild, icon) ───────────────────────────────
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-1 focus-visible:ring-offset-background active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-gold/90 to-gold border-gold/40 text-[#181102] text-[0.78rem] font-heading font-bold tracking-[0.08em] uppercase shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gold-bright hover:to-gold hover:border-gold-bright/60 hover:shadow-[0_0_18px_rgba(212,175,55,0.4),0_2px_8px_rgba(0,0,0,0.4)]",
        outline:
          "border-gold/28 bg-stone-surface/50 text-foreground/85 text-sm hover:bg-stone-highlight/70 hover:border-gold/50 hover:text-foreground aria-expanded:bg-stone-highlight aria-expanded:border-gold/40",
        secondary:
          "bg-stone-surface border-iron-dark text-foreground/80 text-sm hover:bg-stone-highlight hover:border-iron-mid hover:text-foreground aria-expanded:bg-stone-highlight",
        ghost:
          "text-sm hover:bg-stone-highlight/60 hover:text-foreground aria-expanded:bg-stone-highlight/60",
        destructive:
          "border-crimson/40 bg-crimson/10 text-red-300 text-sm hover:bg-crimson/20 hover:border-crimson/60 hover:text-red-200 focus-visible:ring-crimson/50",
        link: "text-gold underline-offset-4 hover:underline hover:text-gold-bright text-sm",
      },
      size: {
        default:
          "h-8 gap-1.5 px-3 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.78rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {

  const sizeKey  = size    ?? "default"
  const variantKey = variant ?? "default"
  const isSvgSize  = !ICON_SIZES.has(sizeKey)

  // ── BTN01 — CTA principale ─────────────────────────────────────────────────
  if (variantKey === "default" && !asChild && isSvgSize) {
    const pad = BTN01_PAD[sizeKey] ?? BTN01_PAD.default
    return (
      <button
        data-slot="button"
        data-variant="default"
        data-size={sizeKey}
        className={cn(
          "group/button relative inline-flex shrink-0 items-center justify-center",
          "whitespace-nowrap select-none cursor-pointer",
          "bg-transparent border-0 rounded-none",
          pad,
          // testo oro → diventa oro brillante su hover (stessa transizione dell'SVG)
          "text-gold hover:text-gold-bright",
          "font-heading font-bold tracking-[0.08em] uppercase text-[0.78rem]",
          "transition-[color,transform] duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:translate-y-px",
          "disabled:pointer-events-none disabled:opacity-40",
          "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        {...props}
      >
        {/* size-full evita il selettore [&_svg:not([class*='size-'])]:size-4 */}
        <SvgAssetBase
          asset={BTN01_ASSET}
          className="size-full text-gold transition-[color,filter] duration-150 group-hover/button:text-gold-bright group-hover/button:[filter:drop-shadow(0_0_12px_rgba(200,167,93,0.55))] group-active/button:brightness-90"
        />
        <span className="relative z-[1] inline-flex items-center gap-1.5">{children}</span>
      </button>
    )
  }

  // ── BTN12 — frame secondario (outline / secondary / destructive) ───────────
  if (BTN12_VARIANTS.has(variantKey) && !asChild && isSvgSize) {
    const pad    = BTN12_PAD[sizeKey] ?? BTN12_PAD.default
    const styles = BTN12_STYLES[variantKey] ?? BTN12_STYLES.outline
    return (
      <button
        data-slot="button"
        data-variant={variantKey}
        data-size={sizeKey}
        className={cn(
          "group/button relative inline-flex shrink-0 items-center justify-center",
          "whitespace-nowrap select-none cursor-pointer",
          "bg-transparent border-0 rounded-none",
          pad,
          "font-medium text-sm",
          // text color: impostato qui, ereditato dallo span figlio
          styles.text,
          "transition-[color,transform] duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:translate-y-px",
          "disabled:pointer-events-none disabled:opacity-40",
          "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        {...props}
      >
        <SvgAssetBase
          asset={BTN12_ASSET}
          viewBoxPad={BTN12_VIEWBOX_PAD}
          className={cn(
            "size-full transition-[color,filter] duration-150 group-active/button:brightness-90",
            styles.shell
          )}
        />
        <span className="relative z-[1] inline-flex items-center gap-1.5">{children}</span>
      </button>
    )
  }

  // ── BTN_ICON — FrameSquare_03 per icon-size outline/secondary/destructive ──
  if (BTN12_VARIANTS.has(variantKey) && !asChild && ICON_SIZES.has(sizeKey)) {
    const szClass = ICON_SIZE_CLASS[sizeKey] ?? "size-8"
    const styles  = BTN12_STYLES[variantKey] ?? BTN12_STYLES.outline
    return (
      <button
        data-slot="button"
        data-variant={variantKey}
        data-size={sizeKey}
        className={cn(
          "group/button relative inline-flex shrink-0 items-center justify-center",
          "select-none cursor-pointer",
          "bg-transparent border-0 rounded-none",
          szClass,
          styles.text,
          "transition-[color,transform] duration-150 outline-none",
          "focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "active:translate-y-px",
          "disabled:pointer-events-none disabled:opacity-40",
          "[&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
          className
        )}
        {...props}
      >
        <SvgAssetBase
          asset={BTN_ICON_ASSET}
          preserveAspectRatio="xMidYMid meet"
          className={cn(
            "size-full transition-[color,filter] duration-150 group-active/button:brightness-90",
            styles.shell
          )}
        />
        <span className="relative z-[1]">{children}</span>
      </button>
    )
  }

  // ── CSS fallback: ghost / link / asChild / default-icon ───────────────────
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
