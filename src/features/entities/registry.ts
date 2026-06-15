import {
  BookOpen,
  CalendarDays,
  Castle,
  CheckCircle2,
  EyeOff,
  Flag,
  Gem,
  Globe,
  Hourglass,
  Map,
  MapPin,
  ScrollText,
  Skull,
  Swords,
  User,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type {
  CharacterKind,
  CharacterStatus,
  Entity,
  EntityType,
  Visibility,
} from "@/types/entities";

import {
  CHARACTER_KIND_SHORT,
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
  CHARACTER_STATUS_OPTIONS,
} from "@/features/characters/constants";

/* ============================================================
 * Registro dei tipi di entità — unico punto di verità.
 * Aggiungere un nuovo tipo = aggiungere una voce qui (+ il tipo
 * in ENTITY_TYPES): form, card, liste, grafo e ricerca si
 * adattano automaticamente.
 * ============================================================ */

export type FieldKind = "text" | "textarea" | "number" | "select" | "switch";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

export interface CardMeta {
  subtitle?: string;
  badge?: { label: string; className: string };
}

export interface EntityTypeConfig {
  type: EntityType;
  label: string;
  plural: string;
  icon: LucideIcon;
  /** Classi badge (liste, pagina, ricerca). */
  badgeClass: string;
  /** Colore nodo nella vista grafo. */
  accent: string;
  /** Gerarchia geografica (solo world/region/city/location). */
  parentType: EntityType | null;
  childType: EntityType | null;
  /** Campi specifici mostrati nel form e nella scheda. */
  fields: FieldDef[];
  defaultVisibility: Visibility;
  /** Meta opzionali per le card (sottotitolo/badge dipendenti dai dati). */
  cardMeta?: (entity: Entity) => CardMeta;
  flavor: string;
}

const ALIGNMENTS = [
  "Legale Buono",
  "Neutrale Buono",
  "Caotico Buono",
  "Legale Neutrale",
  "Neutrale Puro",
  "Caotico Neutrale",
  "Legale Malvagio",
  "Neutrale Malvagio",
  "Caotico Malvagio",
].map((value) => ({ value, label: value }));

export const QUEST_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Disponibile" },
  { value: "NEXT", label: "Prossima" },
  { value: "ACTIVE", label: "Attiva" },
  { value: "COMPLETED", label: "Completata" },
  { value: "FAILED", label: "Fallita" },
  { value: "SECRET", label: "Segreta" },
];

/**
 * Stile degli eventi-quest nel Diario: icona e colore dedicati per ogni
 * stato della missione (presa in carico, completata, fallita…).
 */
export const QUEST_EVENT_STYLE: Record<
  string,
  { icon: LucideIcon; label: string; iconWrap: string; stripe: string }
> = {
  AVAILABLE: {
    icon: ScrollText,
    label: "Disponibile",
    iconWrap: "bg-slate-500 text-white",
    stripe: "border-l-slate-400",
  },
  NEXT: {
    icon: Hourglass,
    label: "Prossima",
    iconWrap: "bg-amber-600 text-white",
    stripe: "border-l-amber-500",
  },
  ACTIVE: {
    icon: Swords,
    label: "In corso",
    iconWrap: "bg-emerald-600 text-white",
    stripe: "border-l-emerald-500",
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: "Completata",
    iconWrap: "bg-teal-600 text-white",
    stripe: "border-l-teal-500",
  },
  FAILED: {
    icon: XCircle,
    label: "Fallita",
    iconWrap: "bg-red-600 text-white",
    stripe: "border-l-red-500",
  },
  SECRET: {
    icon: EyeOff,
    label: "Segreta",
    iconWrap: "bg-purple-600 text-white",
    stripe: "border-l-purple-500",
  },
};

export const QUEST_STATUS_BADGES: Record<string, string> = {
  AVAILABLE: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  NEXT: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  ACTIVE: "border-gold/50 bg-gold/15 text-gold-bright",
  COMPLETED: "border-emerald-600/50 bg-emerald-900/30 text-emerald-300",
  FAILED: "border-red-500/50 bg-red-500/10 text-red-300",
  SECRET: "border-purple-500/50 bg-purple-500/10 text-purple-300",
};

export const ITEM_CATEGORY_OPTIONS = [
  { value: "COMMON", label: "Comune" },
  { value: "RARE", label: "Raro" },
  { value: "MAGIC", label: "Magico" },
  { value: "LEGENDARY", label: "Leggendario" },
  { value: "ARTIFACT", label: "Artefatto" },
  { value: "STORY", label: "Oggetto di trama" },
];

export const ITEM_CATEGORY_BADGES: Record<string, string> = {
  COMMON: "border-zinc-500/50 bg-zinc-500/10 text-zinc-300",
  RARE: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  MAGIC: "border-purple-500/50 bg-purple-500/10 text-purple-300",
  LEGENDARY: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  ARTIFACT: "border-red-500/50 bg-red-500/10 text-red-300",
  STORY: "border-gold/50 bg-gold/15 text-gold-bright",
};

function optionLabel(
  options: { value: string; label: string }[],
  value: unknown
): string | undefined {
  return options.find((option) => option.value === value)?.label;
}

export const ENTITY_REGISTRY: Record<EntityType, EntityTypeConfig> = {
  world: {
    type: "world",
    label: "Mondo",
    plural: "Mondi",
    icon: Globe,
    badgeClass: "border-gold/50 bg-gold/15 text-gold-bright",
    accent: "#d4af37",
    parentType: null,
    childType: "region",
    defaultVisibility: "PUBLIC",
    flavor: "Il piano d'esistenza che contiene tutte le terre della campagna.",
    fields: [
      { key: "genre", label: "Genere / Tono", kind: "text", placeholder: "Dark fantasy, alta magia…" },
    ],
  },
  region: {
    type: "region",
    label: "Regione",
    plural: "Regioni",
    icon: Map,
    badgeClass: "border-emerald-500/50 bg-emerald-500/10 text-emerald-300",
    accent: "#5b9c6a",
    parentType: "world",
    childType: "city",
    defaultVisibility: "PUBLIC",
    flavor: "Una vasta area del mondo: catene montuose, regni, distese selvagge.",
    fields: [
      { key: "climate", label: "Clima / Territorio", kind: "text", placeholder: "Tundra battuta dai venti…" },
    ],
  },
  city: {
    type: "city",
    label: "Città",
    plural: "Città",
    icon: Castle,
    badgeClass: "border-sky-500/50 bg-sky-500/10 text-sky-300",
    accent: "#4f86c6",
    parentType: "region",
    childType: "location",
    defaultVisibility: "PUBLIC",
    flavor: "Insediamenti, capitali e villaggi dove pulsa la vita del regno.",
    fields: [
      { key: "population", label: "Popolazione", kind: "text", placeholder: "~12.000 anime" },
      { key: "government", label: "Governo", kind: "text", placeholder: "Consiglio dei mercanti" },
    ],
  },
  location: {
    type: "location",
    label: "Luogo",
    plural: "Luoghi",
    icon: MapPin,
    badgeClass: "border-teal-500/50 bg-teal-500/10 text-teal-300",
    accent: "#3a9d9b",
    parentType: "city",
    childType: null,
    defaultVisibility: "PUBLIC",
    flavor: "Taverne, dungeon, templi: i palcoscenici delle scene di gioco.",
    fields: [
      {
        key: "locationType",
        label: "Tipologia",
        kind: "select",
        options: [
          "Taverna",
          "Negozio",
          "Tempio",
          "Dungeon",
          "Rovina",
          "Palazzo",
          "Natura",
          "Altro",
        ].map((value) => ({ value, label: value })),
      },
    ],
    cardMeta: (entity) => ({
      subtitle: typeof entity.fields.locationType === "string" ? entity.fields.locationType : undefined,
    }),
  },
  character: {
    type: "character",
    label: "Personaggio",
    plural: "Personaggi",
    icon: User,
    badgeClass: "border-parchment/40 bg-parchment/10 text-parchment",
    accent: "#e8dcc0",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "PNG e protagonisti: volti, ambizioni e segreti del regno.",
    fields: [
      { key: "race", label: "Razza", kind: "text", placeholder: "Mezzelfo" },
      { key: "class", label: "Classe / Mestiere", kind: "text", placeholder: "Ramingo" },
      { key: "age", label: "Età", kind: "text", placeholder: "47 anni" },
      { key: "alignment", label: "Allineamento", kind: "select", options: ALIGNMENTS },
      {
        key: "status",
        label: "Stato",
        kind: "select",
        options: CHARACTER_STATUS_OPTIONS,
      },
      { key: "partyMember", label: "Membro del party", kind: "switch" },
    ],
    cardMeta: (entity) => {
      const kind = entity.fields.kind as CharacterKind | undefined;
      const race = entity.fields.race;
      const klass = entity.fields.class;
      const level = entity.fields.level;
      const klassLabel =
        klass && level ? `${klass} ${level}` : klass || undefined;
      const subtitle =
        [kind ? CHARACTER_KIND_SHORT[kind] : null, race, klassLabel]
          .filter(Boolean)
          .join(" • ") || undefined;
      const status = entity.fields.status as CharacterStatus | undefined;
      if (status && status !== "ALIVE") {
        return {
          subtitle,
          badge: {
            label: CHARACTER_STATUS_LABELS[status],
            className: CHARACTER_STATUS_BADGES[status],
          },
        };
      }
      return { subtitle };
    },
  },
  faction: {
    type: "faction",
    label: "Fazione",
    plural: "Fazioni",
    icon: Flag,
    badgeClass: "border-crimson-bright/50 bg-crimson/20 text-red-300",
    accent: "#c43146",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "Regni, gilde, culti e casate che muovono i fili del mondo.",
    fields: [
      {
        key: "factionType",
        label: "Tipologia",
        kind: "select",
        options: [
          "Regno",
          "Casata",
          "Clan",
          "Gilda",
          "Chiesa",
          "Organizzazione criminale",
          "Ordine cavalleresco",
          "Altro",
        ].map((value) => ({ value, label: value })),
      },
      {
        key: "influence",
        label: "Influenza",
        kind: "select",
        options: ["Locale", "Regionale", "Nazionale", "Continentale"].map(
          (value) => ({ value, label: value })
        ),
      },
      { key: "goals", label: "Obiettivi", kind: "textarea" },
    ],
    cardMeta: (entity) => ({
      subtitle:
        [entity.fields.factionType, entity.fields.influence]
          .filter(Boolean)
          .join(" • ") || undefined,
    }),
  },
  quest: {
    type: "quest",
    label: "Quest",
    plural: "Quest",
    icon: ScrollText,
    badgeClass: "border-purple-500/50 bg-purple-500/10 text-purple-300",
    accent: "#9b59b6",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "Le imprese del party: incarichi, misteri e chiamate all'avventura.",
    fields: [
      { key: "status", label: "Stato", kind: "select", options: QUEST_STATUS_OPTIONS },
      { key: "objectives", label: "Obiettivi", kind: "textarea", placeholder: "• Trovare l'erede scomparso…" },
      { key: "rewards", label: "Ricompense", kind: "textarea", placeholder: "500 mo, il favore della gilda…" },
    ],
    cardMeta: (entity) => {
      const status = String(entity.fields.status ?? "AVAILABLE");
      const label = optionLabel(QUEST_STATUS_OPTIONS, status);
      return label
        ? { badge: { label, className: QUEST_STATUS_BADGES[status] ?? "" } }
        : {};
    },
  },
  item: {
    type: "item",
    label: "Oggetto",
    plural: "Oggetti",
    icon: Gem,
    badgeClass: "border-orange-500/50 bg-orange-500/10 text-orange-300",
    accent: "#e67e22",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "Tesori, reliquie e manufatti: il bottino e i perni della trama.",
    fields: [
      { key: "category", label: "Categoria", kind: "select", options: ITEM_CATEGORY_OPTIONS },
      { key: "requiresAttunement", label: "Richiede sintonia", kind: "switch" },
      { key: "conservabile", label: "Conservabile (Borsa del Party)", kind: "switch" },
      { key: "value", label: "Valore (mo)", kind: "number" },
      { key: "effects", label: "Effetti", kind: "textarea" },
    ],
    cardMeta: (entity) => {
      if (entity.fields.approvalStatus === "PENDING_APPROVAL") {
        return {
          badge: {
            label: "In approvazione",
            className: "border-amber-500/50 bg-amber-500/10 text-amber-300",
          },
        };
      }
      const category = String(entity.fields.category ?? "");
      const label = optionLabel(ITEM_CATEGORY_OPTIONS, category);
      return label
        ? { badge: { label, className: ITEM_CATEGORY_BADGES[category] ?? "" } }
        : {};
    },
  },
  creature: {
    type: "creature",
    label: "Creatura",
    plural: "Bestiario",
    icon: Skull,
    badgeClass: "border-rose-500/50 bg-rose-500/10 text-rose-300",
    accent: "#b03a2e",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "Mostri e bestie che popolano le terre selvagge del regno.",
    fields: [
      {
        key: "creatureType",
        label: "Tipo",
        kind: "select",
        options: [
          "Aberrazione",
          "Bestia",
          "Celestiale",
          "Costrutto",
          "Drago",
          "Elementale",
          "Fata",
          "Immondo",
          "Gigante",
          "Umanoide",
          "Mostruosità",
          "Melma",
          "Pianta",
          "Non morto",
        ].map((value) => ({ value, label: value })),
      },
      { key: "cr", label: "Grado Sfida (CR)", kind: "text", placeholder: "5 (1.800 PE)" },
      { key: "habitat", label: "Habitat", kind: "text", placeholder: "Paludi e rovine" },
      { key: "loot", label: "Bottino", kind: "textarea" },
    ],
    cardMeta: (entity) => {
      const cr = entity.fields.cr;
      return {
        subtitle: typeof entity.fields.creatureType === "string" ? entity.fields.creatureType : undefined,
        badge: cr
          ? { label: `CR ${cr}`, className: "border-rose-500/50 bg-rose-500/10 text-rose-300" }
          : undefined,
      };
    },
  },
  event: {
    type: "event",
    label: "Evento",
    plural: "Eventi",
    icon: CalendarDays,
    badgeClass: "border-yellow-500/50 bg-yellow-500/10 text-yellow-300",
    accent: "#f1c40f",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "La storia del mondo: guerre, incoronazioni, cataclismi.",
    fields: [
      { key: "eventDate", label: "Data (calendario di gioco)", kind: "text", placeholder: "12° giorno della Luna Rossa, 1247" },
      { key: "eventOrder", label: "Ordine cronologico", kind: "number", placeholder: "1247" },
    ],
    cardMeta: (entity) => ({
      subtitle: typeof entity.fields.eventDate === "string" ? entity.fields.eventDate : undefined,
    }),
  },
  session: {
    type: "session",
    label: "Sessione",
    plural: "Sessioni",
    icon: BookOpen,
    badgeClass: "border-indigo-400/50 bg-indigo-500/10 text-indigo-300",
    accent: "#6c7ae0",
    parentType: null,
    childType: null,
    defaultVisibility: "PUBLIC",
    flavor: "Il diario delle serate di gioco: recap e momenti memorabili.",
    fields: [
      { key: "sessionNumber", label: "Numero sessione", kind: "number" },
      { key: "playedAt", label: "Giocata il", kind: "text", placeholder: "15/06/2026" },
    ],
    cardMeta: (entity) => {
      const number = entity.fields.sessionNumber;
      return {
        subtitle: [
          number !== undefined && number !== "" ? `Sessione ${number}` : null,
          typeof entity.fields.playedAt === "string" && entity.fields.playedAt
            ? entity.fields.playedAt
            : null,
        ]
          .filter(Boolean)
          .join(" • ") || undefined,
      };
    },
  },
};

/** Etichette suggerite per le relazioni (datalist nel pannello collegamenti). */
export const RELATION_LABEL_SUGGESTIONS = [
  "Si trova a",
  "Vive a",
  "Membro di",
  "Leader di",
  "Alleato di",
  "Nemico di",
  "Possiede",
  "Custodisce",
  "Coinvolto in",
  "Obiettivo di",
  "Apparso in",
  "Creato da",
  "Governa",
  "Infestato da",
];

export const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: "Pubblica (tutti)",
  PARTY_ONLY: "Solo Party",
  MASTER_ONLY: "Solo Master",
  OWNER_ONLY: "Solo proprietario",
};

export const VISIBILITY_BADGES: Record<string, string> = {
  PUBLIC: "border-emerald-600/50 bg-emerald-900/20 text-emerald-300",
  PARTY_ONLY: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  MASTER_ONLY: "border-crimson-bright/50 bg-crimson/20 text-red-300",
  OWNER_ONLY: "border-purple-500/50 bg-purple-500/10 text-purple-300",
};

/** Una voce è nascosta ai giocatori (non pubblica né di party). */
export function isHiddenFromPlayers(entity: Entity): boolean {
  return entity.visibility === "MASTER_ONLY" || entity.visibility === "OWNER_ONLY";
}

/** "Bloccata": riservata al Master con un promemoria di sblocco. */
export function isLockedEntity(entity: Entity): boolean {
  return entity.visibility === "MASTER_ONLY" && Boolean(entity.unlockAfterId);
}
