"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// ─── BTN01 — CTA primario (viewBox 0 0 902 232) ──────────────────────────────
// Ali laterali x≈0–154 e x≈748–902 (~17% per lato) → padding generoso
const BTN01 = [
  "M747.74,36.36c-3.31,0-220.56-5.78-229.53,5.78,215.38.03,12.5-.06,224.76.03-.03,3.55.77,8.19,1.66,11.02,6.93,22.15,22.59,41.61,41.14,54.67-.28-2.83-15.07-14.52-27.28-36.1-4.42-7.82-10.63-22.94-10.75-35.4Z",
  "M744.63,53.2c-.03-.09-.12-.36,0,0h0Z",
  "M154.26,36.36c-.12,12.46-6.33,27.59-10.75,35.4-12.21,21.58-27,33.27-27.28,36.1,18.55-13.06,34.21-32.52,41.14-54.67.89-2.84,1.69-7.47,1.66-11.02,212.26-.1,9.38,0,224.76-.03-8.97-11.56-226.22-5.79-229.53-5.78Z",
  "M157.43,53.02s-.04.12-.06.18c.05-.14.06-.18.06-.18Z",
  "M157.43,178.98s-.01-.04-.06-.18c.02.06.06.19.06.18Z",
  "M744.63,178.8c-.89,2.84-1.69,7.47-1.66,11.02-212.26.1-9.38,0-224.76.03,8.97,11.56,226.22,5.79,229.53,5.78.12-12.46,6.33-27.59,10.75-35.4,12.21-21.58,27-33.27,27.28-36.1-18.55,13.06-34.21,32.52-41.14,54.67Z",
  "M744.63,178.8c-.12.36-.03.09,0,0h0Z",
  "M902,116c-11.33-11.31-22.66-22.61-33.99-33.92v.05l-5.26,5.25c-9.34,9.32-23.67,16.78-39.38,10.53-15.7-6.26-45.96-27.1-53.82-51.81-2.66-8.73-2.74-28.96-3.07-28.96l-250.63-.66c-38.71-2.73-64.85-11.97-64.85-16.47,0,4.5-26.14,13.73-64.85,16.47l-250.63.66c-.33,0-.41,20.24-3.07,28.96-7.86,24.72-38.12,45.55-53.82,51.81-15.7,6.26-30.04-1.21-39.38-10.53l-5.26-5.25v-.05c-11.32,11.3-22.66,22.6-33.99,33.92,11.33,11.31,22.66,22.61,33.99,33.92v-.05l5.26-5.25c9.34-9.32,23.67-16.78,39.38-10.53,15.7,6.26,45.96,27.1,53.82,51.81,2.66,8.73,2.74,28.96,3.07,28.96l250.63.66c38.71,2.73,64.85,11.97,64.85,16.47,0-4.5,26.14-13.73,64.85-16.47l250.63-.66c.33,0,.41-20.24,3.07-28.96,7.86-24.72,38.12-45.55,53.82-51.81,15.7-6.26,30.04,1.21,39.38,10.53l5.26,5.25v.05c11.33-11.3,22.66-22.6,33.99-33.92ZM757.52,206.76H144.48c5.43-35.36-35.55-82.24-69.2-90.76,33.65-8.52,74.63-55.4,69.2-90.76h613.03c-5.43,35.36,35.55,82.24,69.2,90.76-33.65,8.52-74.63,55.4-69.2,90.76Z",
  "M159.03,189.82c.03-3.55-.77-8.19-1.66-11.02-6.93-22.15-22.59-41.61-41.14-54.67.28,2.83,15.07,14.52,27.28,36.1,4.42,7.82,10.63,22.94,10.75,35.4,3.31,0,220.56,5.78,229.53-5.78-215.38-.03-12.5.06-224.76-.03Z",
] as const

// ─── BTN12 — frame secondario (viewBox -2 -4 766 260) ────────────────────────
// FIX: viewBox espanso di 4px top/bottom per includere le corone ornamentali
// che escono dal rettangolo principale (top peak y≈0, bottom peak y≈252)
// Inner frame x≈38–723 su 758 totali (~5% per lato) → padding minimo sufficiente
const BTN12 = [
  "M30.57,205.92h700.86V46.08H30.57v159.84ZM38.58,54.07h684.84v143.85H38.58V54.07Z",
  "M3.71,126c5.19,0,16.83,11.12,16.83,26.53v-53.05c0,15.41-11.64,26.53-16.83,26.53Z",
  "M20.54,165.72s-4.81,8.42-4.81,16.58v2.74c0,.28,0,.37,0,.37v6.88c0,14.03-4.22,21.17-15.72,25.51,6.65,1.53,11.82,6.82,11.82,6.82,0,0,5.3,5.16,6.84,11.8,4.35-11.48,11.5-15.69,25.56-15.69h260.32c8.18,0,16.62-4.8,16.62-4.8H20.54v-50.2Z",
  "M746.28,192.29v-6.88s0-.09,0-.37v-2.74c0-8.16-4.81-16.58-4.81-16.58v50.2h-300.62s8.44,4.8,16.62,4.8h260.32c14.06,0,21.22,4.21,25.56,15.69,1.53-6.63,6.84-11.8,6.84-11.8,0,0,5.18-5.29,11.82-6.82-11.5-4.34-15.72-11.48-15.72-25.51Z",
  "M15.72,59.71v6.88s0,.09,0,.37v2.74c0,8.16,4.81,16.58,4.81,16.58v-50.2h300.62s-8.44-4.8-16.62-4.8H44.22c-14.06,0-21.22-4.21-25.56-15.69-1.53,6.63-6.84,11.8-6.84,11.8,0,0-5.18,5.29-11.82,6.82,11.5,4.34,15.72,11.48,15.72,25.51Z",
  "M741.46,99.47v53.05c0-15.41,11.64-26.53,16.83-26.53-5.19,0-16.83-11.12-16.83-26.53Z",
  "M741.46,86.28s4.81-8.42,4.81-16.58v-2.74c0-.28,0-.37,0-.37v-6.88c0-14.03,4.22-21.17,15.72-25.51-6.65-1.53-11.82-6.82-11.82-6.82,0,0-5.3-5.16-6.84-11.8-4.35,11.48-11.5,15.69-25.56,15.69h-260.32c-8.18,0-16.62,4.8-16.62,4.8h300.62v50.2Z",
  "M381,19.28c0,5.18,11.14,16.79,26.58,16.79h30.54c-33.18,0-57.12-24.95-57.12-36.08,0,11.13-23.94,36.08-57.12,36.08h30.54c15.44,0,26.58-11.61,26.58-16.79Z",
  "M381,232.72c0-5.18-11.14-16.79-26.58-16.79h-30.54c33.18,0,57.12,24.95,57.12,36.08,0-11.13,23.93-36.08,57.12-36.08h-30.54c-15.44,0-26.58,11.61-26.58,16.79Z",
] as const

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
    shell: "text-gold/55 group-hover/button:text-gold/90 group-hover/button:[filter:drop-shadow(0_0_8px_rgba(184,144,24,0.3))]",
    text:  "text-gold/90 hover:text-gold",
  },
  secondary: {
    shell: "text-foreground/30 group-hover/button:text-foreground/55",
    text:  "text-foreground/80 hover:text-foreground",
  },
  destructive: {
    shell: "text-crimson/65 group-hover/button:text-crimson group-hover/button:[filter:drop-shadow(0_0_8px_rgba(104,14,28,0.5))]",
    text:  "text-red-300 hover:text-red-200",
  },
}

// ─── BTN_ICON — FrameSquare_03 (viewBox 0 0 362 362) ────────────────────────
// Stessa famiglia ornamentale di BTN12 ma quadrata → usata per size="icon*"
// Corone top/bottom (y≈3.7 e y≈358.3) rientrano nel viewBox nativo senza espansione
const BTN_ICON = [
  "M30.61,331.39h300.77V30.61H30.61v300.79ZM38.63,38.63h284.73v284.75H38.63V38.63Z",
  "M3.71,181c5.2,0,16.85,11.16,16.85,26.62v-53.25c0,15.47-11.65,26.62-16.85,26.62Z",
  "M20.56,240.92s-4.82,8.45-4.82,16.64v60.16c0,14.08-4.22,21.25-15.74,25.6,6.66,1.54,11.84,6.85,11.84,6.85,0,0,5.31,5.18,6.85,11.84,4.35-11.52,11.52-15.74,25.6-15.74h60.15c8.19,0,16.64-4.82,16.64-4.82H20.56v-100.52Z",
  "M154.38,341.44c15.47,0,26.62,11.65,26.62,16.85,0-5.2,11.16-16.85,26.62-16.85h-53.24Z",
  "M346.26,317.71v-60.16c0-8.19-4.82-16.64-4.82-16.64v100.52h-100.51s8.45,4.82,16.64,4.82h60.15c14.08,0,21.25,4.22,25.6,15.74,1.54-6.66,6.85-11.84,6.85-11.84,0,0,5.18-5.31,11.84-6.85-11.52-4.35-15.74-11.52-15.74-25.6Z",
  "M15.74,44.29v60.16c0,8.19,4.82,16.64,4.82,16.64V20.56h100.51s-8.45-4.82-16.64-4.82h-60.15c-14.08,0-21.25-4.22-25.6-15.74-1.54,6.66-6.85,11.84-6.85,11.84,0,0-5.18,5.31-11.84,6.85,11.52,4.35,15.74,11.52,15.74,25.6Z",
  "M341.44,154.38v53.25c0-15.47,11.65-26.62,16.85-26.62-5.2,0-16.85-11.16-16.85-26.62Z",
  "M341.44,121.08s4.82-8.45,4.82-16.64v-60.16c0-14.08,4.22-21.25,15.74-25.6-6.66-1.54-11.84-6.85-11.84-6.85,0,0-5.31-5.18-6.85-11.84-4.35,11.52-11.52,15.74-25.6,15.74h-60.15c-8.19,0-16.64,4.82-16.64,4.82h100.51v100.52Z",
  "M207.62,20.56c-15.47,0-26.62-11.65-26.62-16.85,0,5.2-11.16,16.85-26.62,16.85h53.24Z",
] as const

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
          "bg-gradient-to-b from-gold/90 to-gold border-gold/40 text-[#181102] text-[0.78rem] font-heading font-bold tracking-[0.08em] uppercase shadow-[0_2px_8px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] hover:from-gold-bright hover:to-gold hover:border-gold-bright/60 hover:shadow-[0_0_18px_rgba(201,162,39,0.4),0_2px_8px_rgba(0,0,0,0.4)]",
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
        <svg
          aria-hidden
          viewBox="0 0 902 232"
          preserveAspectRatio="none"
          fill="currentColor"
          className="size-full pointer-events-none absolute inset-0 text-gold transition-[color,filter] duration-150 group-hover/button:text-gold-bright group-hover/button:[filter:drop-shadow(0_0_12px_rgba(184,144,24,0.55))] group-active/button:brightness-90"
        >
          {BTN01.map((d, i) => <path key={i} d={d} />)}
        </svg>
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
        {/* FIX viewBox: -2 -4 766 260 include le corone top/bottom di BTN12 */}
        <svg
          aria-hidden
          viewBox="-2 -4 766 260"
          preserveAspectRatio="none"
          fill="currentColor"
          className={cn(
            "size-full pointer-events-none absolute inset-0 transition-[color,filter] duration-150 group-active/button:brightness-90",
            styles.shell
          )}
        >
          {BTN12.map((d, i) => <path key={i} d={d} />)}
        </svg>
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
        <svg
          aria-hidden
          viewBox="0 0 362 362"
          preserveAspectRatio="xMidYMid meet"
          fill="currentColor"
          className={cn(
            "size-full pointer-events-none absolute inset-0 transition-[color,filter] duration-150 group-active/button:brightness-90",
            styles.shell
          )}
        >
          {BTN_ICON.map((d, i) => <path key={i} d={d} />)}
        </svg>
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
