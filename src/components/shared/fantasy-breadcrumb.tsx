"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { getAsset } from "@/design-system/assets/registry"
import { SvgAssetBase } from "@/design-system/components/svg-asset"

// ─── Tab_05 SVG shell (registry: tab_05, viewBox 0 0 1296 236) ──────────────
// Bordo sinistro pulito + ala ornata destra → forma ideale per breadcrumb trail.
// Area contenuto sicura: sx ~17.5% (x≈227), dx ~12% (x≈1140)
// → padding px-9 pr-7 copre entrambe le zone decorative per testi 4-20 char
const TAB05_ASSET = getAsset("tab_05")

// ─── BreadcrumbTab — primitiva riutilizzabile ─────────────────────────────────
// Wrappa qualsiasi contenuto nel frame Tab_05. Esportata per componenti custom
// come GeoTrail che hanno step con icona + testo su più righe.
export function BreadcrumbTab({
  isCurrent = false,
  className,
  shellClass,
  py = "py-1.5",
  children,
}: {
  isCurrent?: boolean
  className?: string
  shellClass?: string
  py?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "group/tab relative inline-flex items-center pl-9 pr-7",
        py,
        "transition-[color,filter] duration-150",
        className
      )}
    >
      <SvgAssetBase
        asset={TAB05_ASSET}
        className={cn(
          "size-full transition-[color,filter] duration-150",
          isCurrent
            ? "text-gold/70 [filter:drop-shadow(0_0_6px_rgba(200,167,93,0.35))]"
            : "text-gold/20 group-hover/tab:text-gold/40",
          shellClass
        )}
      />
      <span className="relative z-[1]">{children}</span>
    </span>
  )
}

// ─── BreadcrumbSeparator — glifo tra step ─────────────────────────────────────
export function BreadcrumbSeparator() {
  return (
    <span aria-hidden className="select-none font-heading text-[0.6rem] text-gold/30 px-0.5">
      ›
    </span>
  )
}

export type BreadcrumbStep = {
  label: string
  href?: string
  current?: boolean
}

function BreadcrumbStep({ step }: { step: BreadcrumbStep }) {
  const isCurrent = step.current ?? !step.href
  return (
    <BreadcrumbTab
      isCurrent={isCurrent}
      aria-current={isCurrent ? "page" : undefined}
      className={cn(
        "font-heading text-[0.62rem] sm:text-[0.68rem] font-semibold tracking-[0.07em] uppercase",
        isCurrent ? "text-gold" : "text-gold/55 hover:text-gold/90"
      )}
    >
      {step.href ? (
        <Link href={step.href} className="block max-w-[8rem] truncate sm:max-w-none transition-colors">{step.label}</Link>
      ) : (
        <span className="block max-w-[8rem] truncate sm:max-w-none">{step.label}</span>
      )}
    </BreadcrumbTab>
  )
}

export function FantasyBreadcrumb({
  steps,
  className,
}: {
  steps: BreadcrumbStep[]
  className?: string
}) {
  return (
    <nav
      aria-label="Percorso"
      className={cn("flex min-w-0 flex-wrap items-center gap-y-1 overflow-hidden", className)}
    >
      {steps.map((step, i) => (
        <span key={i} className="inline-flex items-center">
          <BreadcrumbStep step={step} />
          {i < steps.length - 1 && <BreadcrumbSeparator />}
        </span>
      ))}
    </nav>
  )
}
