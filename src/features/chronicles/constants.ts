import {
  BookOpen,
  Church,
  CircleDot,
  Compass,
  Crown,
  Eye,
  File,
  FileText,
  Flag,
  Landmark,
  Mail,
  MapPin,
  ScrollText,
  Sparkles,
  Stars,
  Swords,
  User,
  type LucideIcon,
} from "lucide-react";

import type {
  ChronicleCanonStatus,
  ChronicleCategory,
} from "@/types/chronicles";

/* ============================================================
 * Libro delle Cronache — categorie, etichette narrative e badge.
 * Colori sulla scala materica esistente (ferro → argento → arcano
 * → oro → sangue), un solo segnale colore per card.
 * ============================================================ */

export interface ChronicleCategoryMeta {
  label: string;
  icon: LucideIcon;
  badgeClass: string;
  /** Colore dell'indicatore (nodo timeline, puntina card). */
  accent: string;
}

export const CHRONICLE_CATEGORY_META: Record<
  ChronicleCategory,
  ChronicleCategoryMeta
> = {
  HISTORICAL_EVENT: {
    label: "Evento Storico",
    icon: Landmark,
    badgeClass: "border-gold-light/50 bg-gold-dim/25 text-gold-light",
    accent: "var(--gold-light)",
  },
  QUEST: {
    label: "Missione",
    icon: ScrollText,
    badgeClass: "border-arcane-bright/50 bg-arcane/15 text-arcane-bright",
    accent: "var(--arcane-bright)",
  },
  DIARY: {
    label: "Diario",
    icon: BookOpen,
    badgeClass: "border-silver/50 bg-silver/10 text-silver",
    accent: "var(--silver)",
  },
  LETTER: {
    label: "Lettera",
    icon: Mail,
    badgeClass: "border-parchment/40 bg-parchment/10 text-parchment",
    accent: "var(--parchment-dark)",
  },
  REPORT: {
    label: "Rapporto",
    icon: FileText,
    badgeClass: "border-ash/50 bg-ash/10 text-ash",
    accent: "var(--silver)",
  },
  LEGEND: {
    label: "Leggenda",
    icon: Sparkles,
    badgeClass: "border-gold-bright/50 bg-gold-dim/30 text-gold-light",
    accent: "var(--gold-bright)",
  },
  MYTH: {
    label: "Mito",
    icon: Stars,
    badgeClass: "border-arcane-bright/50 bg-arcane/15 text-arcane-bright",
    accent: "var(--arcane)",
  },
  PROPHECY: {
    label: "Profezia",
    icon: Eye,
    badgeClass: "border-arcane-bright/50 bg-arcane/20 text-arcane-bright",
    accent: "var(--arcane-bright)",
  },
  BATTLE: {
    label: "Battaglia",
    icon: Swords,
    badgeClass: "border-crimson-bright/50 bg-crimson/15 text-crimson-light",
    accent: "var(--crimson-bright)",
  },
  WAR: {
    label: "Guerra",
    icon: Flag,
    badgeClass: "border-crimson-bright/50 bg-crimson/20 text-crimson-light",
    accent: "var(--crimson)",
  },
  POLITICS: {
    label: "Politica",
    icon: Crown,
    badgeClass: "border-gold/50 bg-gold/15 text-gold-bright",
    accent: "var(--gold)",
  },
  RELIGION: {
    label: "Religione",
    icon: Church,
    badgeClass: "border-parchment/40 bg-parchment/10 text-parchment",
    accent: "var(--parchment-dark)",
  },
  EXPLORATION: {
    label: "Esplorazione",
    icon: Compass,
    badgeClass: "border-verdant-bright/50 bg-verdant/10 text-verdant-bright",
    accent: "var(--verdant-bright)",
  },
  PERSON: {
    label: "Personaggio",
    icon: User,
    badgeClass: "border-silver/50 bg-silver/10 text-silver",
    accent: "var(--silver)",
  },
  PLACE: {
    label: "Luogo",
    icon: MapPin,
    badgeClass: "border-brass/60 bg-brass/10 text-gold",
    accent: "var(--brass)",
  },
  DOCUMENT: {
    label: "Documento",
    icon: File,
    badgeClass: "border-ash/50 bg-ash/10 text-ash",
    accent: "var(--silver)",
  },
  OTHER: {
    label: "Altro",
    icon: CircleDot,
    badgeClass: "border-ash/40 bg-ash/10 text-ash",
    accent: "var(--silver)",
  },
};

export const CHRONICLE_CATEGORY_OPTIONS = (
  Object.keys(CHRONICLE_CATEGORY_META) as ChronicleCategory[]
).map((value) => ({ value, label: CHRONICLE_CATEGORY_META[value].label }));

/** Etichette per le relazioni narrative cronaca ↔ cronaca. */
export const CHRONICLE_RELATION_LABELS = [
  "Antefatto di",
  "Seguito di",
  "Conseguenza di",
  "Causa di",
  "Versione alternativa di",
  "Punto di vista su",
  "Approfondimento di",
];

export const CANON_BADGES: Record<
  ChronicleCanonStatus,
  { label: string; className: string }
> = {
  CANON: {
    label: "Canonica",
    className: "border-verdant-bright/50 bg-verdant-deep/40 text-verdant-bright",
  },
  PROPOSED: {
    label: "Proposta",
    className: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  },
};

export const DRAFT_BADGE = {
  label: "Bozza",
  className: "border-ash/50 bg-ash/10 text-ash",
};

/** Etichette italiane per la cronologia modifiche. */
export const CHRONICLE_LOG_LABELS: Record<string, string> = {
  CREATE: "Scritta",
  EDIT: "Modificata",
  VISIBILITY: "Visibilità cambiata",
  CANONIZE: "Canonizzata",
  MIGRATE: "Migrata dagli Eventi",
  AUTO: "Generata automaticamente",
};
