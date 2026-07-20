import {
  CheckCircle2,
  EyeOff,
  Hourglass,
  ScrollText,
  Swords,
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
import {
  CANON_BADGES,
  CHRONICLE_CATEGORY_META,
  DRAFT_BADGE,
} from "@/features/chronicles/constants";
import { imageIcon } from "@/components/shared/image-icon";

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
  icon: ReturnType<typeof imageIcon> | LucideIcon;
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
  /**
   * Escluso dalla creazione generica (QuickCreateDialog & co.):
   * tipi ritirati (event) o con un flusso dedicato (chronicle).
   */
  hiddenInCreate?: boolean;
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
    iconWrap: "bg-ash text-stone-deep",
    stripe: "border-l-ash",
  },
  NEXT: {
    icon: Hourglass,
    label: "Prossima",
    iconWrap: "bg-ember text-stone-deep",
    stripe: "border-l-ember",
  },
  ACTIVE: {
    icon: Swords,
    label: "In corso",
    iconWrap: "bg-gold-bright text-stone-deep",
    stripe: "border-l-gold-bright",
  },
  COMPLETED: {
    icon: CheckCircle2,
    label: "Completata",
    iconWrap: "bg-verdant text-parchment",
    stripe: "border-l-verdant-bright",
  },
  FAILED: {
    icon: XCircle,
    label: "Fallita",
    iconWrap: "bg-crimson-bright text-parchment",
    stripe: "border-l-crimson-bright",
  },
  SECRET: {
    icon: EyeOff,
    label: "Segreta",
    iconWrap: "bg-arcane text-parchment",
    stripe: "border-l-arcane-bright",
  },
};

export const QUEST_STATUS_BADGES: Record<string, string> = {
  AVAILABLE: "border-ash/50 bg-ash/10 text-ash",
  NEXT: "border-ember-bright/50 bg-ember/10 text-ember-bright",
  ACTIVE: "border-gold/50 bg-gold/15 text-gold-bright",
  COMPLETED: "border-verdant-bright/50 bg-verdant-deep/40 text-verdant-bright",
  FAILED: "border-crimson-bright/50 bg-crimson/15 text-crimson-light",
  SECRET: "border-arcane-bright/50 bg-arcane/15 text-arcane-bright",
};

/** Stato di una creatura nel Bestiario. */
export const CREATURE_STATUS_OPTIONS = [
  { value: "UNKNOWN", label: "Sconosciuta" },
  { value: "SIGHTED", label: "Avvistata" },
  { value: "ALIVE", label: "Viva" },
  { value: "DEAD", label: "Sconfitta" },
];

export const CREATURE_STATUS_BADGES: Record<string, string> = {
  UNKNOWN: "border-ash/40 bg-ash/10 text-ash",
  SIGHTED: "border-silver/50 bg-silver/10 text-silver",
  ALIVE: "border-verdant-bright/50 bg-verdant-deep/40 text-verdant-bright",
  DEAD: "border-crimson-bright/50 bg-crimson/15 text-crimson-light",
};

export const ITEM_CATEGORY_OPTIONS = [
  { value: "COMMON", label: "Comune" },
  { value: "RARE", label: "Raro" },
  { value: "MAGIC", label: "Magico" },
  { value: "LEGENDARY", label: "Leggendario" },
  { value: "ARTIFACT", label: "Artefatto" },
  { value: "STORY", label: "Oggetto di trama" },
];

/* Scala di rarità materica: ferro → argento → arcano → oro → sangue
   (DESIGN_SYSTEM_V2 §3.1). */
export const ITEM_CATEGORY_BADGES: Record<string, string> = {
  COMMON: "border-ash/40 bg-ash/10 text-ash",
  RARE: "border-silver/50 bg-silver/10 text-silver",
  MAGIC: "border-arcane-bright/50 bg-arcane/15 text-arcane-bright",
  LEGENDARY: "border-gold-bright/50 bg-gold-dim/30 text-gold-light",
  ARTIFACT: "border-crimson-bright/50 bg-crimson/15 text-crimson-light",
  STORY: "border-gold/50 bg-gold/15 text-gold-bright",
};

function optionLabel(
  options: { value: string; label: string }[],
  value: unknown
): string | undefined {
  return options.find((option) => option.value === value)?.label;
}

const WorldIcon = imageIcon("/icons/world.png");
const CharacterIcon = imageIcon("/icons/characters.png");
const RegionIcon = imageIcon("/icons/region.png");
const CityIcon = imageIcon("/icons/city.png");
const LocationIcon = imageIcon("/icons/location.png");
const QuestIcon = imageIcon("/icons/quest.png");
const FactionIcon = imageIcon("/icons/faction.png");
const ObjectsIcon = imageIcon("/icons/objects.png");
const BeastsIcon = imageIcon("/icons/beasts.png");
const EventsIcon = imageIcon("/icons/events.png");
const SessionIcon = imageIcon("/icons/session.png");

export const ENTITY_REGISTRY: Record<EntityType, EntityTypeConfig> = {
  world: {
    type: "world",
    label: "Mondo",
    plural: "Mondi",
    icon: WorldIcon,
    badgeClass: "border-gold/50 bg-gold/15 text-gold-bright",
    accent: "var(--gold-bright)",
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
    icon:  RegionIcon,
    badgeClass: "border-verdant-bright/50 bg-verdant/10 text-verdant-bright",
    accent: "var(--verdant-bright)",
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
    icon: CityIcon,
    badgeClass: "border-silver/50 bg-silver/10 text-silver",
    accent: "var(--silver)",
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
    icon: LocationIcon,
    badgeClass: "border-brass/60 bg-brass/10 text-gold",
    accent: "var(--brass)",
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
    icon: CharacterIcon,
    badgeClass: "border-parchment/40 bg-parchment/10 text-parchment",
    accent: "var(--parchment-dark)",
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
    icon: FactionIcon,
    badgeClass: "border-crimson-bright/50 bg-crimson/20 text-crimson-light",
    accent: "var(--crimson-bright)",
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
    icon: QuestIcon,
    badgeClass: "border-arcane-bright/50 bg-arcane/15 text-arcane-bright",
    accent: "var(--arcane-bright)",
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
    icon: ObjectsIcon,
    badgeClass: "border-ember-bright/50 bg-ember/10 text-ember-bright",
    accent: "var(--ember-bright)",
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
    icon: BeastsIcon,
    badgeClass: "border-crimson-bright/50 bg-crimson/15 text-crimson-light",
    accent: "var(--crimson)",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    flavor: "Mostri e bestie che popolano le terre selvagge del regno.",
    fields: [
      {
        key: "status",
        label: "Stato",
        kind: "select",
        options: CREATURE_STATUS_OPTIONS,
      },
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
      const status = String(entity.fields.status ?? "");
      const subtitle =
        [
          typeof entity.fields.creatureType === "string"
            ? entity.fields.creatureType
            : null,
          cr ? `CR ${cr}` : null,
        ]
          .filter(Boolean)
          .join(" • ") || undefined;
      const statusLabel = optionLabel(CREATURE_STATUS_OPTIONS, status);
      return {
        subtitle,
        badge: statusLabel
          ? { label: statusLabel, className: CREATURE_STATUS_BADGES[status] ?? "" }
          : cr
            ? { label: `CR ${cr}`, className: "border-rose-500/50 bg-rose-500/10 text-rose-300" }
            : undefined,
      };
    },
  },
  event: {
    type: "event",
    label: "Evento",
    plural: "Eventi",
    icon: EventsIcon,
    badgeClass: "border-gold-light/50 bg-gold-dim/25 text-gold-light",
    accent: "var(--gold-light)",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    // Tipo RITIRATO: assorbito dal Libro delle Cronache. Le voci residue
    // restano leggibili finché il Master non le migra da /cronache.
    hiddenInCreate: true,
    flavor: "La storia del mondo: guerre, incoronazioni, cataclismi.",
    fields: [
      { key: "eventDate", label: "Data (calendario di gioco)", kind: "text", placeholder: "12° giorno della Luna Rossa, 1247" },
      { key: "eventOrder", label: "Ordine cronologico", kind: "number", placeholder: "1247" },
    ],
    cardMeta: (entity) => ({
      subtitle: typeof entity.fields.eventDate === "string" ? entity.fields.eventDate : undefined,
    }),
  },
  chronicle: {
    type: "chronicle",
    label: "Cronaca",
    plural: "Cronache",
    icon: EventsIcon,
    badgeClass: "border-gold-light/50 bg-gold-dim/25 text-gold-light",
    accent: "var(--gold-light)",
    parentType: null,
    childType: null,
    defaultVisibility: "MASTER_ONLY",
    // Flusso di creazione dedicato (ChronicleEditor su /cronache).
    hiddenInCreate: true,
    flavor: "Il codex ufficiale del mondo: capitoli, diari, lettere e leggende.",
    fields: [],
    cardMeta: (entity) => {
      const data = entity.chronicle;
      const subtitle =
        [
          data?.dateLabel || data?.legacyDateLabel || null,
          data?.subtitle || null,
        ]
          .filter(Boolean)
          .join(" • ") || undefined;
      if (data?.draft) return { subtitle, badge: DRAFT_BADGE };
      if (data?.canonStatus === "PROPOSED") {
        return { subtitle, badge: CANON_BADGES.PROPOSED };
      }
      const category = data ? CHRONICLE_CATEGORY_META[data.category] : undefined;
      return {
        subtitle,
        badge: category
          ? { label: category.label, className: category.badgeClass }
          : undefined,
      };
    },
  },
  session: {
    type: "session",
    label: "Sessione",
    plural: "Sessioni",
    icon: SessionIcon,
    badgeClass: "border-arcane/60 bg-arcane-blue/50 text-arcane-bright",
    accent: "var(--arcane)",
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
  PUBLIC: "border-verdant-bright/50 bg-verdant-deep/40 text-verdant-bright",
  PARTY_ONLY: "border-silver/50 bg-silver/10 text-silver",
  MASTER_ONLY: "border-crimson-bright/50 bg-crimson/20 text-crimson-light",
  OWNER_ONLY: "border-arcane-bright/50 bg-arcane/15 text-arcane-bright",
};

/** Una voce è nascosta ai giocatori (non pubblica né di party). */
export function isHiddenFromPlayers(entity: Entity): boolean {
  return entity.visibility === "MASTER_ONLY" || entity.visibility === "OWNER_ONLY";
}

/** "Bloccata": riservata al Master con un promemoria di sblocco. */
export function isLockedEntity(entity: Entity): boolean {
  return entity.visibility === "MASTER_ONLY" && Boolean(entity.unlockAfterId);
}
