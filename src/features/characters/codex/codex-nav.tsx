"use client";

import { Search, X, type LucideIcon } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

import { SKILLS } from "../constants";
import { useCodex, type InspectorTarget } from "./codex-context";
import { normalizeName } from "./derive";

/* ============================================================
 * CodexNav — la barra di comando della scheda.
 *
 * Sticky su vetro sotto l'hero: sezioni con scroll-spy, ricerca
 * interna (oggetti, incantesimi, abilità, effetti…) e scorciatoie
 * da tastiera: 1–9 salta alla sezione, "/" apre la ricerca.
 * ============================================================ */

export interface CodexSection {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface SearchHit {
  key: string;
  label: string;
  sublabel: string;
  sectionId: string;
  target?: InspectorTarget;
}

function scrollToSection(id: string) {
  document
    .getElementById(`codex-${id}`)
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** True se il focus è dentro un campo di testo (le scorciatoie tacciono). */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

export function CodexNav({ sections }: { sections: CodexSection[] }) {
  const { sheet, hasSheet, inspect } = useCodex();
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const suppressSpy = useRef<number>(0);

  /* ── Scroll-spy sulle sezioni ── */
  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(`codex-${section.id}`))
      .filter((element): element is HTMLElement => element !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (Date.now() < suppressSpy.current) return;
        // La sezione attiva è la prima visibile partendo dall'alto.
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top
          )[0];
        if (visible) {
          const id = visible.target.getAttribute("data-codex-section");
          if (id) setActive(id);
        }
      },
      { rootMargin: "-25% 0px -65% 0px" }
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  /* ── Scorciatoie da tastiera ── */
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        setSearchOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
        return;
      }
      const digit = Number(event.key);
      if (digit >= 1 && digit <= sections.length) {
        event.preventDefault();
        const section = sections[digit - 1];
        setActive(section.id);
        suppressSpy.current = Date.now() + 800;
        scrollToSection(section.id);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [sections]);

  /* ── Ricerca interna sulla scheda ── */
  const hits = useMemo<SearchHit[]>(() => {
    const needle = normalizeName(query);
    if (!needle || needle.length < 2) return [];
    const results: SearchHit[] = [];
    const matches = (value: string) => normalizeName(value).includes(needle);

    if (hasSheet) {
      for (const item of sheet.equipment) {
        if (matches(item.name)) {
          results.push({
            key: `item-${item.id}`,
            label: item.name,
            sublabel: item.equipped ? "Equipaggiato" : "Zaino",
            sectionId: "inventario",
            target: { type: "item", id: item.id },
          });
        }
      }
      for (const spell of sheet.spells) {
        if (matches(spell.name)) {
          results.push({
            key: `spell-${spell.id}`,
            label: spell.name,
            sublabel:
              spell.level === 0 ? "Trucchetto" : `Incantesimo liv. ${spell.level}`,
            sectionId: "magie",
            target: { type: "spell", id: spell.id },
          });
        }
      }
      for (const cantrip of sheet.cantrips) {
        if (matches(cantrip)) {
          results.push({
            key: `cantrip-${cantrip}`,
            label: cantrip,
            sublabel: "Trucchetto",
            sectionId: "magie",
          });
        }
      }
      for (const key of Object.keys(SKILLS)) {
        if (matches(SKILLS[key].label)) {
          results.push({
            key: `skill-${key}`,
            label: SKILLS[key].label,
            sublabel: "Abilità",
            sectionId: "caratteristiche",
            target: { type: "skill", key },
          });
        }
      }
      for (const condition of sheet.conditions) {
        if (matches(condition.name)) {
          results.push({
            key: `condition-${condition.id}`,
            label: condition.name,
            sublabel: "Effetto attivo",
            sectionId: "risorse",
            target: { type: "condition", id: condition.id },
          });
        }
      }
      for (const resource of sheet.resources) {
        if (matches(resource.name)) {
          results.push({
            key: `resource-${resource.id}`,
            label: resource.name,
            sublabel: "Risorsa",
            sectionId: "risorse",
            target: { type: "resource", id: resource.id },
          });
        }
      }
      for (const companion of sheet.companions) {
        if (matches(companion.name)) {
          results.push({
            key: `companion-${companion.id}`,
            label: companion.name,
            sublabel: "Compagno",
            sectionId: "compagni",
          });
        }
      }
      for (const entry of sheet.classes) {
        if (matches(entry.className) || matches(entry.subclass)) {
          results.push({
            key: `class-${entry.id}`,
            label: `${entry.className} ${entry.level}`,
            sublabel: entry.subclass || "Classe",
            sectionId: "caratteristiche",
            target: { type: "class", id: entry.id },
          });
        }
      }
    }
    return results.slice(0, 10);
  }, [query, sheet, hasSheet]);

  const selectHit = (hit: SearchHit) => {
    setQuery("");
    setSearchOpen(false);
    suppressSpy.current = Date.now() + 800;
    scrollToSection(hit.sectionId);
    if (hit.target) inspect(hit.target);
  };

  return (
    <nav
      aria-label="Sezioni della scheda"
      className="glass sticky top-12 z-30 rounded-xl px-1.5 py-1.5 sm:top-13 lg:top-2"
    >
      <div className="flex items-center gap-1">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
          {sections.map((section, index) => {
            const isActive = section.id === active;
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => {
                  setActive(section.id);
                  suppressSpy.current = Date.now() + 800;
                  scrollToSection(section.id);
                }}
                aria-current={isActive ? "true" : undefined}
                title={`${section.label} (${index + 1})`}
                className={cn(
                  "relative flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-surface-3 text-gold-bright"
                    : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                <span className="hidden sm:inline">{section.label}</span>
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-gold"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Ricerca interna */}
        {hasSheet && (
          <div className="relative shrink-0">
            {searchOpen ? (
              <div className="flex items-center gap-1">
                <Search aria-hidden className="size-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setQuery("");
                      setSearchOpen(false);
                    }
                    if (event.key === "Enter" && hits[0]) selectHit(hits[0]);
                  }}
                  placeholder="Cerca nella scheda…"
                  aria-label="Cerca nella scheda"
                  className="field-engraved h-9 w-40 rounded-lg px-2.5 text-sm outline-none sm:w-52"
                />
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSearchOpen(false);
                  }}
                  aria-label="Chiudi la ricerca"
                  className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchOpen(true);
                  requestAnimationFrame(() => searchRef.current?.focus());
                }}
                aria-label="Cerca nella scheda (/)"
                title="Cerca nella scheda (/)"
                className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <Search className="size-4" />
              </button>
            )}

            {/* Risultati */}
            {searchOpen && query.trim().length >= 2 && (
              <div className="glass elev-3 absolute top-full right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl">
                {hits.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground italic">
                    Nessun risultato per «{query}».
                  </p>
                ) : (
                  <ul className="max-h-80 overflow-y-auto py-1.5">
                    {hits.map((hit) => (
                      <li key={hit.key}>
                        <button
                          type="button"
                          onClick={() => selectHit(hit)}
                          className="flex w-full items-baseline justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-surface-2"
                        >
                          <span className="min-w-0 truncate text-sm text-foreground">
                            {hit.label}
                          </span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {hit.sublabel}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
