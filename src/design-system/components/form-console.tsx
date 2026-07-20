"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Console di creazione/modifica in stile world-building AAA: nav delle sezioni
 * a sinistra (segnalibri incisi), pannello centrale scorrevole, rotaia di
 * anteprima a destra. Si comprime con grazia: l'anteprima sparisce sotto lg,
 * la nav diventa una barra orizzontale sotto md.
 */
export function FormConsole({
  nav,
  aside,
  children,
  className,
}: {
  nav: React.ReactNode;
  /** Rotaia anteprima (mostrata solo da lg in su). */
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[13rem_minmax(0,1fr)]",
        aside && "lg:grid-cols-[13rem_minmax(0,1fr)_19rem]",
        className
      )}
    >
      {nav}
      <div className="min-h-0 overflow-y-auto px-5 py-5 md:px-6">{children}</div>
      {aside && (
        <aside className="hidden min-h-0 overflow-y-auto border-l border-hairline bg-black/25 p-4 lg:block">
          {aside}
        </aside>
      )}
    </div>
  );
}

export interface ConsoleSection {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
}

/** Barra di navigazione delle sezioni (segnalibri/targhette incise). */
export function ConsoleNav({
  sections,
  active,
  onChange,
  className,
}: {
  sections: ConsoleSection[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <nav
      className={cn(
        "flex shrink-0 gap-1 overflow-x-auto border-b border-hairline bg-black/25 p-2",
        "md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-r md:border-b-0",
        className
      )}
    >
      {sections.map((section) => {
        const isActive = section.id === active;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onChange(section.id)}
            aria-current={isActive}
            className={cn(
              "group/plaque relative flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-all md:w-full",
              isActive
                ? "bg-gradient-to-r from-gold/20 via-gold/8 to-transparent text-gold-bright shadow-[inset_0_1px_0_rgba(212,175,55,0.18)]"
                : "text-foreground/55 hover:bg-stone-highlight/40 hover:text-foreground"
            )}
          >
            {isActive && (
              <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold-bright" />
            )}
            {section.icon && (
              <span className="flex size-4 shrink-0 items-center justify-center [&_svg]:size-4">
                {section.icon}
              </span>
            )}
            <span className="flex-1 truncate font-heading tracking-wide">
              {section.label}
            </span>
            {section.badge}
          </button>
        );
      })}
    </nav>
  );
}

/** Pannello di una sezione: anima l'ingresso come una pagina girata. */
export function ConsolePanel({
  sectionKey,
  children,
  className,
}: {
  /** Cambia quando si cambia sezione: ri-triggera l'animazione di "pagina". */
  sectionKey: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      key={sectionKey}
      className={cn(
        "animate-[console-page-in_280ms_cubic-bezier(0.22,1,0.36,1)_both] space-y-5",
        className
      )}
    >
      {children}
    </div>
  );
}

/** Intestazione di sezione — Targa incisa con divisore dorato. */
export function ConsoleSectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-gold [&_svg]:size-5">{icon}</span>}
        <h3 className="text-gold-gradient font-heading text-lg tracking-wide">
          {title}
        </h3>
      </div>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      <div className="rule-gold mt-3 w-full" />
    </div>
  );
}

/** Campo del modulo: etichetta incisa (oro, maiuscoletto) + controllo + nota. */
export function ConsoleField({
  label,
  hint,
  required,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <span className="flex items-center gap-1.5 font-heading text-[0.7rem] font-semibold tracking-[0.14em] text-gold/75 uppercase">
        {label}
        {required && <span className="text-crimson-bright">✦</span>}
      </span>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Controllo segmentato materico (toggle a pillole incise) — riutilizzabile
 * per scelte binarie/ternarie nei flussi di creazione.
 */
export function ConsoleSegmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: React.ReactNode }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex w-full gap-1 rounded-md border border-hairline-strong bg-black/40 p-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={cn(
              "flex-1 rounded-[6px] px-3 py-1.5 text-sm font-medium transition-all",
              isActive
                ? "bg-gradient-to-b from-gold/25 to-gold/10 text-gold-bright shadow-[inset_0_1px_0_rgba(212,175,55,0.25),0_0_12px_rgba(200,167,93,0.18)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
