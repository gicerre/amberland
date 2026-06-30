"use client";

import { ZoomIn } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { FantasyImage } from "./fantasy-image";

/** Converte un esadecimale (#rrggbb) in rgba() con alpha. */
function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Filtro "caduto": l'immagine vira al sangue cupo — calda, desaturata e
 * scura, base per il trattamento dark-horror dei personaggi morti.
 */
export const FALLEN_FILTER =
  "sepia-[0.55] hue-rotate-[-18deg] saturate-[1.7] brightness-[0.62] contrast-[1.15]";

/**
 * Velo dark-horror per un'entità "caduta": tinta di sangue, vignetta rosso
 * scuro che si chiude dai bordi e un alone cremisi in alto che salta all'occhio.
 * Va sovrapposto all'immagine (richiede un contenitore con `isolate` per
 * contenere i mix-blend). Tutto pointer-events-none. Scala col contenitore,
 * quindi è riusabile sia nell'hero sia nelle card di lista.
 */
export function FallenOverlay() {
  return (
    <>
      {/* Macchia di sangue: tinge l'intera scena di rosso cupo */}
      <div className="pointer-events-none absolute inset-0 bg-crimson/35 mix-blend-multiply" />
      {/* Vignetta di sangue che si chiude dai bordi */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_38%,transparent_26%,rgba(58,3,3,0.92)_100%)]" />
      {/* Alone cremisi dall'alto, luminoso, che cattura l'occhio */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-crimson-bright/40 to-transparent mix-blend-screen" />
    </>
  );
}

/**
 * Strati atmosferici sopra un'immagine hero: nebbia che sale dall'abisso,
 * vignetta cinematografica e alone della categoria.
 * Riutilizzabile da hero diversi (entità, personaggi). Tutto pointer-events-none.
 */
export function HeroAtmosphere({ accent }: { accent: string }) {
  return (
    <>
      {/* Nebbia che sale dall'abisso */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/45 to-transparent" />
      {/* Vignetta cinematografica */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,transparent_30%,rgba(6,7,10,0.85))]" />
      {/* Alone della categoria che scende dall'alto */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{ background: `linear-gradient(to bottom, ${hexA(accent, 0.16)}, transparent)` }}
      />
    </>
  );
}

/**
 * Fascia ondulata che chiude l'hero, con lo stemma del regno incastonato
 * al centro — l'elemento-firma ispirato al banner dell'immagine di
 * riferimento. L'alone dello stemma assume il colore della categoria.
 */
function CrestBanner({ accent }: { accent: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20">
      <svg
        viewBox="0 0 1200 90"
        preserveAspectRatio="none"
        className="block h-14 w-full sm:h-20"
        aria-hidden
      >
        {/* L'onda fonde l'hero nello sfondo della pagina */}
        <path d="M0,45 C300,96 900,4 1200,45 L1200,90 L0,90 Z" fill="var(--background)" />
        {/* Filo dorato che disegna la cresta dell'onda */}
        <path
          d="M0,45 C300,96 900,4 1200,45"
          fill="none"
          stroke="rgba(200, 167, 93, 0.5)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Stemma del regno, incastonato e illuminato dal colore della categoria */}
      <span
        className="absolute bottom-1 left-1/2 flex size-14 -translate-x-1/2 items-center justify-center rounded-full sm:size-16"
        style={{ filter: `drop-shadow(0 0 16px ${hexA(accent, 0.4)})` }}
      >
        <Image
          src="/logo/logo.png"
          alt=""
          width={64}
          height={64}
          className="size-12 object-contain sm:size-14"
        />
      </span>
    </div>
  );
}

interface ImmersiveHeroProps {
  src?: string | null;
  alt: string;
  /** Colore della categoria (config.accent del registry): tinge l'atmosfera. */
  accent: string;
  /** Apertura nel lightbox; se assente l'hero non è cliccabile. */
  onOpen?: () => void;
  /** Trattamento "caduto": tinta di sangue dark-horror (es. personaggi morti). */
  fallen?: boolean;
  priority?: boolean;
  className?: string;
  /** Contenuto sovrapposto e centrato (titolo, sottotitolo, azioni). */
  children?: React.ReactNode;
}

/**
 * Hero cinematografico "paesaggio immersivo": immagine + foschia volumetrica,
 * vignetta, alone di categoria e fascia con stemma. Pensato per le single-page
 * delle entità. Gestisce anche il caso senza immagine (pietra).
 */
export function ImmersiveHero({
  src,
  alt,
  accent,
  onOpen,
  fallen,
  priority,
  className,
  children,
}: ImmersiveHeroProps) {
  const interactive = Boolean(onOpen);

  const content = (
    <>
      <FantasyImage
        src={src}
        alt={alt}
        className={cn("h-80 sm:h-[28rem] lg:h-[45rem]", fallen && FALLEN_FILTER)}
        sizes="100vw"
        priority={priority}
      />

      {/* Atmosfera: nebbia, vignetta, alone di categoria */}
      <HeroAtmosphere accent={accent} />

      {/* Trattamento dark-horror per i caduti */}
      {fallen && <FallenOverlay />}

      {interactive && (
        <span className="pointer-events-none absolute top-3 right-3 z-30 flex size-9 items-center justify-center rounded-full border border-gold/40 bg-background/70 text-gold opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
          <ZoomIn className="size-4.5" />
        </span>
      )}

      {/* Contenuto centrato sovrapposto (titolo, sottotitolo, azioni) */}
      {children && (
        <>
          {/* Scrim per la leggibilità del testo sovrapposto */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,7,10,0.62),transparent_72%)]"
          />
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-5 px-6 pb-12 text-center sm:pb-16">
            {children}
          </div>
        </>
      )}

      <CrestBanner accent={accent} />
    </>
  );

  const base = cn(
    "group relative isolate block w-full overflow-hidden rounded-xl border border-gold/15",
    className
  );

  if (interactive) {
    return (
      <button
        type="button"
        onClick={onOpen}
        aria-label={`Apri ${alt} a schermo intero`}
        className={cn(base, "cursor-zoom-in")}
      >
        {content}
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}
