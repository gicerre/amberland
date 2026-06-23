"use client";

/**
 * Sistema di celebrazioni per momenti epici della campagna.
 * Fornisce CelebrationProvider, useCelebration() e l'overlay animato.
 *
 * Tre eventi:
 *  - level-up      → burst dorato, numero di livello in grande
 *  - quest-complete → burst verde, nome della quest
 *  - item-acquired  → burst colorato per rarità, nome oggetto
 */

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Crown, Gem } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
 * Tipi pubblici
 * ─────────────────────────────────────────────────────────── */

export type CelebrationEvent =
  | { type: "level-up";       characterName: string; level: number }
  | { type: "quest-complete"; questName: string }
  | { type: "item-acquired";  itemName: string; rarity?: string };

interface CelebrationContextValue {
  trigger: (event: CelebrationEvent) => void;
}

/* ────────────────────────────────────────────────────────────
 * Context e hook
 * ─────────────────────────────────────────────────────────── */

const CelebrationContext = createContext<CelebrationContextValue | null>(null);

/**
 * Restituisce `{ trigger }` per avviare una celebrazione.
 * Silent no-op se usato al di fuori del CelebrationProvider.
 */
export function useCelebration(): CelebrationContextValue {
  return useContext(CelebrationContext) ?? { trigger: () => {} };
}

/* ────────────────────────────────────────────────────────────
 * Provider
 * ─────────────────────────────────────────────────────────── */

interface EventSlot {
  data: CelebrationEvent;
  id: number;
}

export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [slot, setSlot] = useState<EventSlot | null>(null);
  const counter = useRef(0);

  const trigger = useCallback((event: CelebrationEvent) => {
    setSlot({ data: event, id: ++counter.current });
  }, []);

  return (
    <CelebrationContext.Provider value={{ trigger }}>
      {children}
      <AnimatePresence>
        {slot && (
          <CelebrationOverlay
            key={slot.id}
            event={slot.data}
            onDismiss={() => setSlot(null)}
          />
        )}
      </AnimatePresence>
    </CelebrationContext.Provider>
  );
}

/* ────────────────────────────────────────────────────────────
 * Configurazione per tipo di evento
 * ─────────────────────────────────────────────────────────── */

interface EventConfig {
  durationMs: number;
  particleCount: number;
  particleColors: string[];
  glowColor: string;
  cardBorderClass: string;
  cardBgClass: string;
  backdropClass: string;
  Icon: typeof Crown;
  iconClass: string;
  label: string;
}

function buildConfig(event: CelebrationEvent): EventConfig {
  switch (event.type) {
    case "level-up":
      return {
        durationMs: 3500,
        particleCount: 32,
        particleColors: ["#c9a227", "#f7e8a0", "#fbbf24", "#fff9e0", "#d4af37"],
        glowColor: "rgba(212,175,55,0.45)",
        cardBorderClass: "border-gold/65",
        cardBgClass: "from-[#130f02] via-stone-mid to-[#0a0c0f]",
        backdropClass: "bg-black/55",
        Icon: Crown,
        iconClass: "text-gold",
        label: "Passaggio di Livello",
      };

    case "quest-complete":
      return {
        durationMs: 2800,
        particleCount: 26,
        particleColors: ["#2ecc71", "#4ade80", "#86efac", "#a7f3d0", "#ffffff"],
        glowColor: "rgba(46,204,113,0.35)",
        cardBorderClass: "border-emerald/65",
        cardBgClass: "from-[#021508] via-stone-mid to-[#0a0c0f]",
        backdropClass: "bg-black/50",
        Icon: CheckCircle2,
        iconClass: "text-emerald-bright",
        label: "Incarico Completato",
      };

    case "item-acquired": {
      const rarityMap: Record<string, Partial<EventConfig>> = {
        LEGENDARY: { particleColors: ["#c9a227", "#f7e8a0", "#fbbf24", "#fff"], glowColor: "rgba(212,175,55,0.5)", cardBorderClass: "border-gold/70", cardBgClass: "from-[#120d00] via-stone-mid to-[#0a0c0f]" },
        ARTIFACT:  { particleColors: ["#c43146", "#ff8a9b", "#fecdd3", "#fff"], glowColor: "rgba(196,49,70,0.5)", cardBorderClass: "border-crimson-bright/65", cardBgClass: "from-[#120003] via-stone-mid to-[#0a0c0f]" },
        MAGIC:     { particleColors: ["#9b59b6", "#c39bd3", "#ede9fe", "#fff"], glowColor: "rgba(155,89,182,0.4)", cardBorderClass: "border-purple-500/65", cardBgClass: "from-[#0d0012] via-stone-mid to-[#0a0c0f]" },
        RARE:      { particleColors: ["#4d72c9", "#7fa3e6", "#bfdbfe", "#fff"], glowColor: "rgba(77,114,201,0.4)", cardBorderClass: "border-arcane-bright/65", cardBgClass: "from-[#010718] via-stone-mid to-[#0a0c0f]" },
      };
      const overrides = rarityMap[event.rarity ?? "RARE"] ?? rarityMap.RARE;
      return {
        durationMs: 2400,
        particleCount: 22,
        particleColors: overrides.particleColors ?? ["#c9a227", "#fff"],
        glowColor: overrides.glowColor ?? "rgba(212,175,55,0.35)",
        cardBorderClass: overrides.cardBorderClass ?? "border-gold/60",
        cardBgClass: overrides.cardBgClass ?? "from-stone-surface to-stone-mid",
        backdropClass: "bg-black/48",
        Icon: Gem,
        iconClass: "text-gold",
        label: "Oggetto Acquisito",
      };
    }
  }
}

/* ────────────────────────────────────────────────────────────
 * Particle
 * ─────────────────────────────────────────────────────────── */

interface ParticleData {
  id: number;
  dx: number;
  dy: number;
  size: number;
  color: string;
  delay: number;
  rotate: number;
  isSquare: boolean;
}

function buildParticles(count: number, colors: string[]): ParticleData[] {
  return Array.from({ length: count }, (_, i) => {
    /* Distribuzione angolare uniforme con piccolo jitter */
    const baseAngle = (Math.PI * 2 * i) / count;
    const jitter = (Math.random() - 0.5) * 0.6;
    const angle = baseAngle + jitter;
    const distance = 90 + Math.random() * 180;
    return {
      id: i,
      dx: Math.cos(angle) * distance,
      dy: Math.sin(angle) * distance,
      size: 5 + Math.random() * 9,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.12,
      rotate: Math.random() * 360,
      isSquare: Math.random() > 0.55,
    };
  });
}

function Particle({ p }: { p: ParticleData }) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: p.size,
        height: p.isSquare ? p.size * 0.65 : p.size,
        backgroundColor: p.color,
        borderRadius: p.isSquare ? "2px" : "50%",
        boxShadow: `0 0 ${p.size * 1.5}px ${p.color}88`,
      }}
      initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
      animate={{
        x: p.dx,
        y: p.dy,
        scale: [0, 1.3, 0.9, 0],
        opacity: [0, 1, 1, 0],
        rotate: p.rotate,
      }}
      transition={{
        duration: 1.25,
        delay: p.delay,
        ease: "easeOut",
      }}
    />
  );
}

/* ────────────────────────────────────────────────────────────
 * Overlay principale
 * ─────────────────────────────────────────────────────────── */

function CelebrationOverlay({
  event,
  onDismiss,
}: {
  event: CelebrationEvent;
  onDismiss: () => void;
}) {
  const cfg = useMemo(() => buildConfig(event), [event]);
  const particles = useMemo(
    () => buildParticles(cfg.particleCount, cfg.particleColors),
    [cfg.particleCount, cfg.particleColors]
  );

  /* Auto-dismiss */
  useEffect(() => {
    const timer = setTimeout(onDismiss, cfg.durationMs);
    return () => clearTimeout(timer);
  }, [cfg.durationMs, onDismiss]);

  const Icon = cfg.Icon;

  return (
    <motion.div
      className={cn(
        "fixed inset-0 z-[200] flex cursor-pointer items-center justify-center px-6",
        cfg.backdropClass
      )}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onDismiss}
    >
      {/* Radial glow centrato */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${cfg.glowColor}, transparent 65%)`,
        }}
      />

      {/* Particelle */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        {particles.map((p) => (
          <Particle key={p.id} p={p} />
        ))}
      </div>

      {/* Card principale */}
      <motion.div
        className={cn(
          "relative w-full max-w-sm overflow-hidden rounded-2xl border bg-gradient-to-b px-8 py-10 text-center",
          "shadow-[0_0_80px_rgba(0,0,0,0.8)]",
          cfg.cardBorderClass,
          cfg.cardBgClass
        )}
        style={{ boxShadow: `0 0 60px ${cfg.glowColor}, 0 0 120px rgba(0,0,0,0.7)` }}
        initial={{ scale: 0.5, opacity: 0, y: 48 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.85, opacity: 0, y: -24 }}
        transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.05 }}
      >
        {/* Striscia superiore ornamentale */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${cfg.particleColors[0]}, transparent)` }}
        />

        {/* Angoli ornamentali */}
        {(["tl", "tr", "bl", "br"] as const).map((corner) => (
          <OrnamentCorner key={corner} corner={corner} color={cfg.particleColors[0]} />
        ))}

        {/* Etichetta evento */}
        <p
          className="mb-6 font-heading text-[9px] font-bold tracking-[0.4em] uppercase"
          style={{ color: `${cfg.particleColors[0]}aa` }}
        >
          ✦ {cfg.label} ✦
        </p>

        {/* Icona animata */}
        <motion.div
          className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border"
          style={{
            borderColor: `${cfg.particleColors[0]}60`,
            backgroundColor: `${cfg.particleColors[0]}12`,
            boxShadow: `0 0 24px ${cfg.particleColors[0]}40`,
          }}
          initial={{ scale: 0.6, rotate: -10 }}
          animate={{ scale: [0.6, 1.15, 1.0], rotate: [-10, 8, 0] }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        >
          <Icon className={cn("size-8", cfg.iconClass)} />
        </motion.div>

        {/* Contenuto specifico per tipo */}
        <EventContent event={event} cfg={cfg} />

        {/* Hint dismiss */}
        <motion.p
          className="mt-6 text-[10px] text-muted-foreground/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          tocca per chiudere
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────
 * Contenuto specifico per tipo di evento
 * ─────────────────────────────────────────────────────────── */

function EventContent({ event, cfg }: { event: CelebrationEvent; cfg: EventConfig }) {
  if (event.type === "level-up") {
    return (
      <>
        {/* Numero di livello in grande */}
        <motion.p
          className="font-display leading-none"
          style={{
            fontSize: "clamp(4rem, 16vw, 6rem)",
            background: `linear-gradient(180deg, ${cfg.particleColors[0]}, ${cfg.particleColors[1] ?? cfg.particleColors[0]})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: [0.4, 1.1, 1], opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {event.level}
        </motion.p>

        <motion.p
          className="mt-3 font-heading text-lg font-semibold tracking-wider text-foreground"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          {event.characterName}
        </motion.p>
        <motion.p
          className="mt-1 font-heading text-[11px] tracking-[0.2em] text-muted-foreground uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
        >
          ha raggiunto il livello {event.level}
        </motion.p>
      </>
    );
  }

  if (event.type === "quest-complete") {
    return (
      <>
        <motion.p
          className="font-heading text-2xl font-bold tracking-wide text-emerald-bright"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          Completata!
        </motion.p>
        <motion.p
          className="mt-3 font-heading text-base font-semibold italic text-foreground/90"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          &ldquo;{event.questName}&rdquo;
        </motion.p>
        <motion.p
          className="mt-2 font-heading text-[10px] tracking-[0.25em] text-emerald/70 uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          con onore
        </motion.p>
      </>
    );
  }

  /* item-acquired */
  return (
    <>
      {event.rarity && (
        <motion.span
          className="mb-3 inline-block rounded border px-3 py-0.5 font-heading text-[10px] font-bold uppercase tracking-widest"
          style={{
            borderColor: `${cfg.particleColors[0]}60`,
            backgroundColor: `${cfg.particleColors[0]}18`,
            color: cfg.particleColors[0],
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          {RARITY_LABELS[event.rarity] ?? event.rarity}
        </motion.span>
      )}
      <motion.p
        className="font-heading text-xl font-bold tracking-wide text-foreground"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {event.itemName}
      </motion.p>
      <motion.p
        className="mt-2 font-heading text-[10px] tracking-[0.25em] text-muted-foreground uppercase"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.48 }}
      >
        aggiunto all&rsquo;inventario
      </motion.p>
    </>
  );
}

/* ────────────────────────────────────────────────────────────
 * Helpers
 * ─────────────────────────────────────────────────────────── */

const RARITY_LABELS: Record<string, string> = {
  COMMON:    "Comune",
  RARE:      "Raro",
  MAGIC:     "Magico",
  LEGENDARY: "Leggendario",
  ARTIFACT:  "Artefatto",
  STORY:     "Oggetto di trama",
};

type Corner = "tl" | "tr" | "bl" | "br";

function OrnamentCorner({ corner, color }: { corner: Corner; color: string }) {
  const positions: Record<Corner, string> = {
    tl: "left-2.5 top-2.5 border-l border-t",
    tr: "right-2.5 top-2.5 border-r border-t",
    bl: "bottom-2.5 left-2.5 border-b border-l",
    br: "bottom-2.5 right-2.5 border-b border-r",
  };
  return (
    <span
      aria-hidden
      className={cn("pointer-events-none absolute size-4", positions[corner])}
      style={{ borderColor: `${color}55` }}
    />
  );
}
