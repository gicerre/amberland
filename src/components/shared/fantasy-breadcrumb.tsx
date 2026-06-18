"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

// ─── Tab_05 SVG shell (viewBox 0 0 1296 236) ─────────────────────────────────
// Bordo sinistro pulito + ala ornata destra → forma ideale per breadcrumb trail.
// Area contenuto sicura: sx ~17.5% (x≈227), dx ~12% (x≈1140)
// → padding px-9 pr-7 copre entrambe le zone decorative per testi 4-20 char
const TAB05 = [
  "M183.2,51.64c0-3.79,18.39-12.29,43.88-12.29h-87.77c25.49,0,43.88,8.5,43.88,12.29Z",
  "M1141.47,51.97c-1.58-4.79-2.02-10.18-2.35-14.98-3.37,0-10.11,0-13.59,0-92.92,0-248.5,0-342.79,0-23.71,2.28-405.89-5.88-415.01,5.88,219.04.03,550.67-.06,766.54.03-.03,3.61.78,8.33,1.69,11.21,7.05,22.53,22.97,42.33,41.84,55.61-.28-2.88-21.56-24.54-24.99-33.08-4.56-7.96-8.54-15.88-11.28-24.44l.04.11-.1-.35Z",
  "M1135.96,54.12c-.03-.09-.13-.37,0,0h0Z",
  "M227.08,196.65c-25.49,0-43.88-8.5-43.88-12.29,0,3.79-18.39,12.29-43.88,12.29h87.77Z",
  "M782.74,199.01c94.29,0,249.87,0,342.79,0,3.48,0,10.22,0,13.59,0,.33-4.81.77-10.19,2.35-14.98l.1-.35-.04.11c2.74-8.56,6.73-16.48,11.28-24.44,3.42-8.54,24.71-30.2,24.99-33.08-18.87,13.28-34.79,33.08-41.84,55.61-.9,2.89-1.72,7.6-1.69,11.21-215.87.1-547.49,0-766.54.03,9.12,11.76,391.3,3.6,415.01,5.88Z",
  "M1135.96,181.88c-.13.37-.03.09,0,0h0Z",
  "M1296,118c-11.52-11.51-23.05-23-34.56-34.5v.05l-5.35,5.34c-9.5,9.48-22.99,13.94-36.21,11.69-1.67-.29-3.01-.62-3.83-.98-24.64-8.5-46.74-27.56-54.74-52.7-2.71-8.88-2.79-29.46-3.12-29.46l-791.54-.59c-40.08-2.66-67.26-12.21-67.26-16.84,0,4.57-26.48,13.94-65.72,16.74l-213.9-.16L0,25.33l1149.06.35.06,2.01c.38,41.98,37.72,71.08,70.32,90.31-32.6,19.23-69.94,48.34-70.32,90.31l-.06,2.01L0,210.67l19.75,8.75,213.9-.16c39.24,2.8,65.72,12.17,65.72,16.74,0-4.63,27.18-14.17,67.26-16.84l791.54-.59c.33,0,.41-20.58,3.12-29.46,8-25.14,30.1-44.21,54.74-52.7.82-.36,2.16-.69,3.83-.98,13.23-2.25,26.72,2.21,36.21,11.69l5.35,5.34v.05c11.52-11.5,23.05-22.99,34.56-34.5Z",
] as const

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
      <svg
        aria-hidden
        viewBox="0 0 1296 236"
        preserveAspectRatio="none"
        fill="currentColor"
        className={cn(
          "size-full pointer-events-none absolute inset-0 transition-[color,filter] duration-150",
          isCurrent
            ? "text-gold/70 [filter:drop-shadow(0_0_6px_rgba(184,144,24,0.35))]"
            : "text-gold/20 group-hover/tab:text-gold/40",
          shellClass
        )}
      >
        {TAB05.map((d, i) => (
          <path key={i} d={d} />
        ))}
      </svg>
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
