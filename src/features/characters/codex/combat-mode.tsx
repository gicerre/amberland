"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Flame,
  Gauge,
  Heart,
  HeartPulse,
  Package,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Undo2,
  Wand2,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { CONDITION_KIND_STYLES, formatModifier } from "../constants";
import { useCodex } from "./codex-context";
import { ArsenalTab, MagicTab, StatsTab, StatusTab } from "./combat-tabs";
import { Counter } from "./combat-ui";
import { damagePatch, healPatch, toAmount } from "./derive";

/* ============================================================
 * Vista da tavolo — il personaggio mentre si gioca.
 *
 * Sempre visibili: PF (con Danno / Cura e Annulla), CA, iniziativa,
 * velocità e condizioni attive. A un tocco: Azioni (armi e oggetti),
 * Magia, Prove (caratteristiche, TS, abilità), Stato (risorse,
 * condizioni, ispirazione).
 *
 * Ogni azione viene SALVATA SUBITO sul personaggio (nessuna bozza).
 * Lo schermo vive in due contenitori:
 *  - la pagina /pg (il proprio PG: stabile, con la scheda nell'URL);
 *  - CombatMode, dialog a tutto schermo aperto dal Codex.
 * ============================================================ */

export type TableTab = "arsenal" | "magic" | "stats" | "status";

export const TABLE_TABS: { id: TableTab; label: string; icon: LucideIcon }[] = [
  { id: "arsenal", label: "Azioni", icon: Swords },
  { id: "magic", label: "Magia", icon: Wand2 },
  { id: "stats", label: "Prove", icon: BookOpen },
  { id: "status", label: "Stato", icon: Package },
];

export function isTableTab(value: string | null): value is TableTab {
  return TABLE_TABS.some((tab) => tab.id === value);
}

interface UndoStep {
  currentHp: number;
  tempHp: number;
}

export function CombatScreen({
  tab,
  onTabChange,
  stickyClassName = "top-0",
  exit,
  renderTitle,
}: {
  tab: TableTab;
  onTabChange: (tab: TableTab) => void;
  /** Offset della testata sticky (sotto la topbar mobile nella pagina). */
  stickyClassName?: string;
  /** Azione in alto a destra (chiudi / apri la scheda completa). */
  exit?: React.ReactNode;
  /** Titolo (nel dialog serve un DialogTitle per l'accessibilità). */
  renderTitle?: (name: string) => React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const { entity, sheet, patchSheet, saving } = useCodex();
  const { currentHp, maxHp, tempHp } = sheet;

  const [damage, setDamage] = useState("");
  const [heal, setHeal] = useState("");
  const [last, setLast] = useState<{
    id: number;
    kind: "damage" | "heal";
    amount: number;
  } | null>(null);
  // Pila di annullamento in memoria: solo i PF (ciò che si sbaglia più spesso).
  const undoStack = useRef<UndoStep[]>([]);
  const [undoCount, setUndoCount] = useState(0);

  // Direzione dell'ultimo cambiamento dei PF (per il lampo sul numero).
  const [prevHp, setPrevHp] = useState(currentHp);
  const [direction, setDirection] = useState<"damage" | "heal" | null>(null);
  if (currentHp !== prevHp) {
    setDirection(currentHp < prevHp ? "damage" : "heal");
    setPrevHp(currentHp);
  }

  const pct = maxHp > 0 ? Math.max(0, Math.min(100, (currentHp / maxHp) * 100)) : 0;
  const low = pct <= 25;
  const mid = pct > 25 && pct <= 50;
  const down = currentHp <= 0 && maxHp > 0;

  const push = (cur: UndoStep) => {
    undoStack.current.push({ currentHp: cur.currentHp, tempHp: cur.tempHp });
    setUndoCount(undoStack.current.length);
  };

  const applyDamage = () => {
    const amount = toAmount(damage);
    if (amount === 0) return;
    patchSheet((cur) => {
      push(cur);
      return damagePatch(cur, amount);
    });
    setLast({ id: Date.now(), kind: "damage", amount });
    setDamage("");
  };

  const applyHeal = () => {
    const amount = toAmount(heal);
    if (amount === 0) return;
    patchSheet((cur) => {
      push(cur);
      return healPatch(cur, amount);
    });
    setLast({ id: Date.now(), kind: "heal", amount });
    setHeal("");
  };

  const undo = () => {
    const step = undoStack.current.pop();
    setUndoCount(undoStack.current.length);
    if (!step) return;
    patchSheet({ currentHp: step.currentHp, tempHp: step.tempHp });
    setLast(null);
  };

  const setTemp = (next: number) =>
    patchSheet({ tempHp: Math.max(0, Math.floor(next)) });

  const addTo = (value: string, set: (next: string) => void, delta: number) =>
    set(String(toAmount(value) + delta));

  const scrollToId = (id: string) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });

  const barColor = low
    ? "bg-crimson-bright"
    : mid
      ? "bg-ember-bright"
      : "bg-verdant-bright";

  const title = renderTitle ? (
    renderTitle(entity.name)
  ) : (
    <h1 className="mt-0.5 truncate font-heading text-xl font-bold tracking-wider text-foreground sm:text-2xl">
      {entity.name}
    </h1>
  );

  return (
    <div>
      {/* ════ Testata sticky: identità, PF, difese, condizioni, schede ════ */}
      <header
        className={cn(
          "glass sticky z-30 -mx-3 border-x-0 border-t-0 border-b border-hairline sm:-mx-5 lg:mx-0 lg:rounded-b-xl lg:border-x",
          stickyClassName
        )}
      >
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              Al tavolo
              {saving && (
                <span className="font-normal tracking-normal normal-case">
                  {" "}
                  · salvataggio…
                </span>
              )}
            </p>
            {title}
          </div>

          {/* PF compatti sempre visibili: un tocco riporta agli inserti */}
          <button
            type="button"
            onClick={() => scrollToId("combat-hp")}
            aria-label={`Punti ferita ${currentHp} su ${maxHp}: vai a danno e cura`}
            className="flex min-h-11 min-w-24 flex-col items-end justify-center gap-1 rounded-lg px-2 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
          >
            <span className="flex items-center gap-1.5 font-heading text-lg leading-none font-bold text-foreground tabular-nums">
              <Heart className={cn("size-3.5", low ? "text-crimson-bright" : "text-muted-foreground")} />
              {currentHp}
              <span className="text-sm text-muted-foreground">/{maxHp}</span>
              {tempHp > 0 && <span className="text-sm text-arcane-bright">+{tempHp}</span>}
            </span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-3 sm:w-28">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                  barColor
                )}
                style={{ width: `${pct}%` }}
              />
            </span>
          </button>

          {exit}
        </div>

        <DefenseStrip onConditions={() => onTabChange("status")} />

        {/* Schede */}
        <div
          role="tablist"
          aria-label="Sezioni della vista da tavolo"
          className="mx-auto flex w-full max-w-3xl gap-1 px-3 pb-2 sm:px-5"
        >
          {TABLE_TABS.map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`table-tab-${id}`}
                aria-selected={active}
                aria-controls="table-tabpanel"
                onClick={() => {
                  onTabChange(id);
                  requestAnimationFrame(() => scrollToId("table-tabpanel"));
                }}
                className={cn(
                  "relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold tracking-[0.06em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none sm:text-[13px]",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="table-tab-pill"
                    aria-hidden
                    className="absolute inset-0 rounded-lg border border-hairline-strong bg-surface-2"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "tween", duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }
                    }
                  />
                )}
                <Icon aria-hidden className={cn("relative size-4", active && "text-gold")} />
                <span className="relative">{label}</span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-4 py-4 sm:py-6">
        {/* ════ Punti ferita ════ */}
        <section
          id="combat-hp"
          aria-label="Punti ferita"
          className={cn(
            "relative scroll-mt-48 rounded-xl border bg-surface-1 p-4 sm:p-5",
            down ? "border-crimson" : low ? "border-crimson/60" : "border-hairline"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              <Heart aria-hidden className="size-4 text-crimson-bright" />
              Punti Ferita
            </span>
            {tempHp > 0 && (
              <span className="rounded border border-arcane-bright/40 px-2 py-0.5 text-xs font-semibold text-arcane-bright">
                +{tempHp} temporanei
              </span>
            )}
          </div>

          {/* Numero grande + cifra che sale a ogni colpo */}
          <div className="relative mt-2 flex justify-center">
            <motion.p
              key={currentHp}
              aria-live="polite"
              className="font-heading text-6xl leading-none font-bold text-foreground tabular-nums sm:text-7xl"
              animate={
                reduce || !direction
                  ? undefined
                  : direction === "damage"
                    ? { x: [0, -6, 5, -2, 0] }
                    : { scale: [1.06, 1] }
              }
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {currentHp}
              <span className="text-3xl text-muted-foreground sm:text-4xl"> / {maxHp}</span>
            </motion.p>

            <AnimatePresence>
              {last && !reduce && (
                <motion.span
                  key={last.id}
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute -top-1 right-[12%] font-heading text-3xl font-bold",
                    last.kind === "damage" ? "text-crimson-bright" : "text-verdant-bright"
                  )}
                  initial={{ opacity: 1, y: 0 }}
                  animate={{ opacity: 0, y: -30 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                >
                  {last.kind === "damage" ? "−" : "+"}
                  {last.amount}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          <div
            role="meter"
            aria-label="Punti ferita"
            aria-valuemin={0}
            aria-valuemax={maxHp}
            aria-valuenow={currentHp}
            className="relative mt-4 h-3 overflow-hidden rounded-full bg-surface-3"
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                barColor
              )}
              style={{ width: `${pct}%` }}
            />
          </div>

          {down && (
            <p className="mt-3 flex items-center justify-center gap-2 rounded-md border border-crimson/60 bg-crimson/15 py-2 text-sm font-semibold tracking-[0.1em] text-crimson-light uppercase">
              <Skull aria-hidden className="size-4" />A terra — tiri salvezza contro la morte
            </p>
          )}

          {/* ── I due inserti: Danno e Cura ── */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Insert
              tone="damage"
              label="Danno subìto"
              actionLabel="Subisci"
              icon={Flame}
              value={damage}
              onChange={setDamage}
              onApply={applyDamage}
              onQuick={(delta) => addTo(damage, setDamage, delta)}
              quick={[1, 5, 10]}
            />
            <Insert
              tone="heal"
              label="Cura ricevuta"
              actionLabel="Cura"
              icon={HeartPulse}
              value={heal}
              onChange={setHeal}
              onApply={applyHeal}
              onQuick={(delta) => addTo(heal, setHeal, delta)}
              quick={[1, 5, 10]}
            />
          </div>

          <div className="mt-3 flex min-h-11 items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground" aria-live="polite">
              {last
                ? last.kind === "damage"
                  ? `Ultimo: −${last.amount} PF`
                  : `Ultimo: +${last.amount} PF`
                : "Scrivi la cifra e premi Invio."}
            </p>
            <button
              type="button"
              onClick={undo}
              disabled={undoCount === 0}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-hairline-strong px-3 text-foreground/90 transition-colors hover:bg-surface-2 disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
            >
              <Undo2 aria-hidden className="size-4" />
              Annulla
            </button>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 border-t border-hairline pt-3">
            <span className="text-sm text-muted-foreground">PF temporanei</span>
            <Counter value={tempHp} onChange={setTemp} min={0} label="PF temporanei" tone="arcane" />
          </div>
        </section>

        {/* ════ Scheda attiva ════ */}
        <div
          role="tabpanel"
          id="table-tabpanel"
          aria-labelledby={`table-tab-${tab}`}
          className="scroll-mt-48"
        >
          <motion.div
            key={tab}
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {tab === "arsenal" && <ArsenalTab />}
            {tab === "magic" && <MagicTab />}
            {tab === "stats" && <StatsTab />}
            {tab === "status" && <StatusTab />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

/** CA, iniziativa, velocità, ispirazione e condizioni attive: sempre a vista. */
function DefenseStrip({ onConditions }: { onConditions: () => void }) {
  const { sheet } = useCodex();
  const chips: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: Shield, label: "CA", value: String(sheet.armorClass || "—") },
    { icon: Zap, label: "Iniz.", value: formatModifier(sheet.initiative) },
    { icon: Gauge, label: "Vel.", value: sheet.speed || "—" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6">
      {chips.map(({ icon: Icon, label, value }) => (
        <span
          key={label}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-surface-1 px-2 py-1 text-xs text-muted-foreground"
        >
          <Icon aria-hidden className="size-3.5" />
          {label}
          <strong className="font-heading text-sm text-foreground tabular-nums">{value}</strong>
        </span>
      ))}
      {sheet.inspiration && (
        <span className="flex shrink-0 items-center gap-1 rounded-md border border-gold/50 bg-gold-dim px-2 py-1 text-xs font-semibold text-gold-bright">
          <Sparkles aria-hidden className="size-3.5" />
          Ispirazione
        </span>
      )}
      {sheet.exhaustion > 0 && (
        <button
          type="button"
          onClick={onConditions}
          className="shrink-0 rounded-md border border-ember/50 px-2 py-1 text-xs font-semibold text-ember-bright"
        >
          Indebolimento {sheet.exhaustion}
        </button>
      )}
      {sheet.conditions.map((condition) => (
        <button
          key={condition.id}
          type="button"
          onClick={onConditions}
          className={cn(
            "shrink-0 rounded-md border px-2 py-1 text-xs font-semibold",
            CONDITION_KIND_STYLES[condition.kind]
          )}
        >
          {condition.name}
        </button>
      ))}
    </div>
  );
}

/**
 * La vista da tavolo in un dialog a tutto schermo: usata dal Codex
 * (es. il Master che segue il PG di un altro giocatore).
 */
export function CombatMode({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [tab, setTab] = useState<TableTab>("arsenal");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 content-start gap-0 overflow-y-auto rounded-none border-0 bg-background p-0 px-3 sm:max-w-none sm:px-5"
      >
        <DialogDescription className="sr-only">
          Punti ferita, azioni, incantesimi, prove e stato. Le modifiche vengono
          salvate subito sul personaggio.
        </DialogDescription>
        <CombatScreen
          tab={tab}
          onTabChange={setTab}
          renderTitle={(name) => (
            <DialogTitle className="mt-0.5 truncate font-heading text-xl font-bold tracking-wider text-foreground sm:text-2xl">
              {name}
            </DialogTitle>
          )}
          exit={
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-hairline-strong px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
            >
              <X aria-hidden className="size-4" />
              <span className="hidden sm:inline">Chiudi</span>
              <span className="sr-only sm:hidden">Chiudi la vista da tavolo</span>
            </button>
          }
        />
      </DialogContent>
    </Dialog>
  );
}

/** Inserto dinamico: cifra + scorciatoie (sommano nel campo) + conferma. */
function Insert({
  tone,
  label,
  actionLabel,
  icon: Icon,
  value,
  onChange,
  onApply,
  onQuick,
  quick,
}: {
  tone: "damage" | "heal";
  label: string;
  actionLabel: string;
  icon: LucideIcon;
  value: string;
  onChange: (next: string) => void;
  onApply: () => void;
  onQuick: (delta: number) => void;
  quick: number[];
}) {
  const damage = tone === "damage";
  const disabled = toAmount(value) === 0;
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface-0 p-3",
        damage ? "border-crimson/40" : "border-verdant/40"
      )}
    >
      <label
        className={cn(
          "mb-2 flex flex-wrap items-center gap-1.5 text-xs font-semibold tracking-[0.12em] uppercase",
          damage ? "text-crimson-light" : "text-verdant-bright"
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        {label}
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          enterKeyHint="done"
          value={value}
          placeholder="0"
          aria-label={label}
          onChange={(event) =>
            onChange(event.target.value.replace(/[^0-9]/g, "").slice(0, 4))
          }
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onApply();
            }
          }}
          className="mt-1 block h-14 w-full basis-full rounded-md border border-hairline-strong bg-surface-1 px-3 text-center font-heading text-3xl font-bold text-foreground tabular-nums normal-case outline-none placeholder:text-muted-foreground/40 focus-visible:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/40"
        />
      </label>
      <div className="flex items-center gap-2">
        {quick.map((delta) => (
          <button
            key={delta}
            type="button"
            onClick={() => onQuick(delta)}
            aria-label={`Aggiungi ${delta} alla cifra`}
            className="min-h-11 flex-1 rounded-md border border-hairline-strong bg-surface-2/50 text-sm font-semibold text-foreground/90 transition-colors hover:bg-surface-2 focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:outline-none"
          >
            +{delta}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onApply}
        disabled={disabled}
        className={cn(
          "mt-2 min-h-12 w-full rounded-lg border text-sm font-bold tracking-[0.12em] uppercase transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none",
          damage
            ? "border-crimson/60 bg-crimson/20 text-crimson-light hover:bg-crimson/30"
            : "border-verdant/60 bg-verdant/20 text-verdant-bright hover:bg-verdant/30"
        )}
      >
        {actionLabel}
      </button>
    </div>
  );
}
