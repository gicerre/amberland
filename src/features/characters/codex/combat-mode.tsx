"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  Flame,
  Heart,
  HeartPulse,
  Package,
  Skull,
  Swords,
  Undo2,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

import { useCodex } from "./codex-context";
import { ArsenalTab, MagicTab, StatsTab, StatusTab } from "./combat-tabs";
import { Corners, Counter } from "./combat-ui";
import { damagePatch, healPatch, toAmount } from "./derive";

/* ============================================================
 * Modalità Combattimento — la scheda in assetto di guerra.
 *
 * Vista temporanea a tutto schermo per giocare il personaggio
 * al tavolo: PF con due inserti (Danno / Cura), poi quattro
 * schede — Arsenale, Magia, Statistiche, Stato.
 *
 * Ogni azione viene SALVATA SUBITO sul personaggio (nessuna
 * bozza): chiudere la vista torna alla scheda, già aggiornata.
 * ============================================================ */

type TabId = "arsenal" | "magic" | "stats" | "status";

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: "arsenal", label: "Arsenale", icon: Swords },
  { id: "magic", label: "Magia", icon: Wand2 },
  { id: "stats", label: "Statistiche", icon: BookOpen },
  { id: "status", label: "Stato", icon: Package },
];

interface UndoStep {
  currentHp: number;
  tempHp: number;
}

/** Sfondo: bagliore cremisi in alto + trama a lame diagonali appena visibili. */
const BACKDROP: React.CSSProperties = {
  backgroundColor: "var(--background)",
  backgroundImage: [
    "radial-gradient(ellipse 90% 45% at 50% 0%, rgba(170,24,36,0.30), transparent 70%)",
    "radial-gradient(ellipse 60% 30% at 100% 100%, rgba(214,120,40,0.10), transparent 70%)",
    "repeating-linear-gradient(135deg, rgba(255,255,255,0.018) 0 2px, transparent 2px 16px)",
  ].join(","),
};

export function CombatMode({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const { entity, sheet, patchSheet, saving } = useCodex();
  const { currentHp, maxHp, tempHp } = sheet;

  const [tab, setTab] = useState<TabId>("arsenal");
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
    ? "bg-gradient-to-r from-crimson to-crimson-bright"
    : mid
      ? "bg-gradient-to-r from-ember to-ember-bright"
      : "bg-gradient-to-r from-verdant to-verdant-bright";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        style={BACKDROP}
        className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 content-start gap-0 overflow-y-auto rounded-none border-0 p-0 backdrop-blur-none! sm:max-w-none"
      >
        {/* ════ Testata sticky: nome, PF compatti, uscita, schede ════ */}
        <header className="sticky top-0 z-20 border-b border-crimson/40 bg-background/92 backdrop-blur-md">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pt-3 sm:px-6">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.22em] text-crimson-light uppercase">
                <motion.span
                  aria-hidden
                  className="size-2 rounded-full bg-crimson-bright"
                  animate={reduce ? undefined : { opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
                In combattimento
                {saving && (
                  <span className="font-normal tracking-normal text-muted-foreground normal-case">
                    · salvataggio…
                  </span>
                )}
              </p>
              <DialogTitle className="text-gold-gradient mt-0.5 truncate font-heading text-xl font-bold tracking-wider sm:text-2xl">
                {entity.name}
              </DialogTitle>
              <DialogDescription className="sr-only">
                Gestisci punti ferita, armi, incantesimi, statistiche e stato. Le
                modifiche vengono salvate subito sul personaggio.
              </DialogDescription>
            </div>

            {/* PF compatti sempre visibili: un tocco riporta agli inserti */}
            <button
              type="button"
              onClick={() => scrollToId("combat-hp")}
              aria-label={`Punti ferita ${currentHp} su ${maxHp}: vai agli inserti di danno e cura`}
              className="flex min-h-11 min-w-24 flex-col items-end justify-center gap-1 rounded-lg px-2 transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
            >
              <span className="flex items-center gap-1.5 font-heading text-lg leading-none font-bold text-parchment tabular-nums">
                <Heart className="size-3.5 text-crimson-bright" />
                {currentHp}
                <span className="text-sm text-muted-foreground">/{maxHp}</span>
                {tempHp > 0 && (
                  <span className="text-sm text-arcane-bright">+{tempHp}</span>
                )}
              </span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-black/60 sm:w-28">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none",
                    barColor
                  )}
                  style={{ width: `${pct}%` }}
                />
              </span>
            </button>

            <DialogClose asChild>
              <button
                type="button"
                className="flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-crimson/60 bg-crimson/20 px-4 text-sm font-bold tracking-wide text-crimson-light uppercase transition-colors hover:bg-crimson/30 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none"
              >
                <X aria-hidden className="size-4" />
                <span className="hidden sm:inline">Termina</span>
                <span className="sr-only sm:hidden">Termina combattimento</span>
              </button>
            </DialogClose>
          </div>

          {/* Schede */}
          <div
            role="tablist"
            aria-label="Sezioni del combattimento"
            className="mx-auto mt-2 flex w-full max-w-3xl gap-1 px-3 pb-2 sm:px-5"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`combat-tab-${id}`}
                  aria-selected={active}
                  aria-controls="combat-tabpanel"
                  onClick={() => {
                    setTab(id);
                    // Il contenuto parte subito sotto la testata, senza scorrere.
                    requestAnimationFrame(() => scrollToId("combat-tabpanel"));
                  }}
                  className={cn(
                    "relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold tracking-[0.08em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none sm:text-[13px]",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="combat-tab-pill"
                      aria-hidden
                      className="absolute inset-0 rounded-lg border border-crimson/60 bg-gradient-to-b from-crimson/30 to-crimson/10"
                      transition={
                        reduce
                          ? { duration: 0 }
                          : { type: "tween", duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }
                      }
                    />
                  )}
                  <Icon aria-hidden className="relative size-4" />
                  <span className="relative">{label}</span>
                </button>
              );
            })}
          </div>

          {/* Lama a righe: bordo di allarme della testata */}
          <div
            aria-hidden
            className="relative h-1 overflow-hidden bg-[repeating-linear-gradient(135deg,rgba(190,30,44,0.85)_0_10px,transparent_10px_20px)]"
          >
            {!reduce && (
              <motion.span
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                initial={{ left: "-35%" }}
                animate={{ left: "105%" }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
              />
            )}
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-4 sm:px-6 sm:py-6">
          {/* ════ Punti ferita ════ */}
          <motion.section
            id="combat-hp"
            aria-label="Punti ferita"
            className={cn(
              "relative scroll-mt-40 rounded-xl border bg-surface-1/90 p-4 sm:p-5",
              down ? "border-crimson" : low ? "border-crimson/70" : "border-hairline-strong"
            )}
            animate={
              reduce || !low
                ? { boxShadow: "0 0 0 0 rgba(220,50,60,0)" }
                : {
                    boxShadow: [
                      "0 0 0 0 rgba(220,50,60,0)",
                      "0 0 26px 0 rgba(220,50,60,0.38)",
                      "0 0 0 0 rgba(220,50,60,0)",
                    ],
                  }
            }
            transition={
              reduce || !low
                ? { duration: 0 }
                : { duration: down ? 1 : 1.8, repeat: Infinity, ease: "easeInOut" }
            }
          >
            <Corners />

            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-bold tracking-[0.2em] text-foreground/80 uppercase">
                <Heart aria-hidden className="size-4 text-crimson-bright" />
                Punti Ferita
              </span>
              {tempHp > 0 && (
                <span className="rounded border border-arcane-bright/40 bg-arcane-blue/60 px-2 py-0.5 text-xs font-semibold text-arcane-bright">
                  +{tempHp} temporanei
                </span>
              )}
            </div>

            {/* Numero grande + cifra che sale a ogni colpo */}
            <div className="relative mt-2 flex justify-center">
              <motion.p
                key={currentHp}
                aria-live="polite"
                className="font-heading text-6xl leading-none font-bold text-parchment tabular-nums sm:text-7xl"
                animate={
                  reduce || !direction
                    ? undefined
                    : direction === "damage"
                      ? { x: [0, -7, 6, -3, 0], filter: ["brightness(2.2) saturate(2)", "brightness(1) saturate(1)"] }
                      : { scale: [1.08, 1], filter: ["brightness(1.8)", "brightness(1)"] }
                }
                transition={{ duration: 0.38, ease: "easeOut" }}
              >
                {currentHp}
                <span className="text-3xl text-muted-foreground sm:text-4xl">
                  {" "}
                  / {maxHp}
                </span>
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
                    animate={{ opacity: 0, y: -34 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  >
                    {last.kind === "damage" ? "−" : "+"}
                    {last.amount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>

            {/* Barra con scia del danno */}
            <div
              role="meter"
              aria-label="Punti ferita"
              aria-valuemin={0}
              aria-valuemax={maxHp}
              aria-valuenow={currentHp}
              className="relative mt-4 h-4 overflow-hidden rounded-sm border border-hairline-strong bg-black/70 shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)]"
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-white/45 transition-[width] delay-300 duration-[900ms] ease-out motion-reduce:transition-none"
                style={{ width: `${pct}%` }}
              />
              <div
                className={cn(
                  "relative h-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
                  barColor
                )}
                style={{ width: `${pct}%` }}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 right-0 w-0.5 bg-white/60"
                />
              </div>
              {/* Segni ogni 25% */}
              {[25, 50, 75].map((mark) => (
                <span
                  key={mark}
                  aria-hidden
                  className="absolute inset-y-0 w-px bg-black/50"
                  style={{ left: `${mark}%` }}
                />
              ))}
            </div>

            {down && (
              <p className="mt-3 flex items-center justify-center gap-2 rounded-md border border-crimson/60 bg-crimson/15 py-2 text-sm font-bold tracking-[0.14em] text-crimson-light uppercase">
                <Skull aria-hidden className="size-4" />A terra — tiri salvezza
                contro la morte
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
                autoFocus
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
              <Counter
                value={tempHp}
                onChange={setTemp}
                min={0}
                label="PF temporanei"
                tone="arcane"
              />
            </div>
          </motion.section>

          {/* ════ Scheda attiva ════ */}
          <div
            role="tabpanel"
            id="combat-tabpanel"
            aria-labelledby={`combat-tab-${tab}`}
            className="scroll-mt-40"
          >
            <motion.div
              key={tab}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0.7, 0.2, 1] }}
            >
              {tab === "arsenal" && <ArsenalTab />}
              {tab === "magic" && <MagicTab />}
              {tab === "stats" && <StatsTab />}
              {tab === "status" && <StatusTab />}
            </motion.div>
          </div>
        </div>
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
  autoFocus,
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
  autoFocus?: boolean;
}) {
  const damage = tone === "damage";
  const disabled = toAmount(value) === 0;
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        damage
          ? "border-crimson/50 bg-gradient-to-b from-crimson/14 to-crimson/4"
          : "border-verdant/50 bg-gradient-to-b from-verdant/14 to-verdant/4"
      )}
    >
      <label
        className={cn(
          "mb-2 flex flex-wrap items-center gap-1.5 text-xs font-bold tracking-[0.14em] uppercase",
          damage ? "text-crimson-light" : "text-verdant-bright"
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        {label}
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
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
          className="mt-1 block h-14 w-full basis-full rounded-md border border-hairline-strong bg-black/50 px-3 text-center font-heading text-3xl font-bold text-parchment tabular-nums normal-case outline-none placeholder:text-muted-foreground/40 focus-visible:border-gold/60 focus-visible:ring-2 focus-visible:ring-gold/40"
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
          "mt-2 min-h-12 w-full rounded-lg border text-sm font-bold tracking-[0.14em] uppercase transition-colors disabled:opacity-40 focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:outline-none",
          damage
            ? "border-crimson/70 bg-crimson/30 text-crimson-light hover:bg-crimson/45"
            : "border-verdant/70 bg-verdant/30 text-verdant-bright hover:bg-verdant/45"
        )}
      >
        {actionLabel}
      </button>
    </div>
  );
}
