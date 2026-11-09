import type {
  CoverLevel,
  DifficultyTier,
  InteractionKind,
  TacticalCheck,
} from "./battlemap";

/* ============================================================
 * Catalogo degli elementi ambientali — modello comportamentale.
 *
 * Un template non è un asset grafico: l'immagine della battlemap
 * contiene già la porta, la roccia, il ponte. Il template dice al motore
 * COME SI COMPORTA quella porta — che cosa la attraversa, che cosa la
 * rompe, che prove servono, in che stati può trovarsi e come cambia
 * comportamento in ciascuno.
 *
 * Due livelli, mai confusi:
 *  - TEMPLATE: il modello, vive nel codice, uguale per tutte le mappe;
 *  - ISTANZA:  quell'elemento in QUELLA battlemap (`MapObject`), che
 *    nasce copiando il template e da lì vive di vita propria. Ritoccare
 *    la porta del castello non tocca il template "porta rinforzata".
 * ============================================================ */

/* ------------------------------------------------------------------ */
/* Tassonomia                                                         */
/* ------------------------------------------------------------------ */

export const ELEMENT_CATEGORIES = [
  "STRUCTURE",
  "NATURE",
  "WATER",
  "PROP",
  "BATTLEFIELD",
  "DUNGEON",
  "MAGIC",
] as const;
export type ElementCategory = (typeof ELEMENT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  STRUCTURE: "Architettura",
  NATURE: "Natura",
  WATER: "Acque",
  PROP: "Arredi e oggetti",
  BATTLEFIELD: "Campo di battaglia",
  DUNGEON: "Sotterranei",
  MAGIC: "Arcano",
};

/* ------------------------------------------------------------------ */
/* Stati                                                              */
/* ------------------------------------------------------------------ */

/**
 * Stato di un elemento. Non è un'etichetta: a ogni stato corrisponde un
 * comportamento diverso, ed è il cambio di stato a modificare la mappa
 * tattica (una porta aperta smette di sbarrare, un muro crollato smette
 * di coprire).
 */
export type ElementStateId = string;

export interface StateBehaviour {
  label: string;
  description: string;
  blocksMovement: boolean;
  blocksSight: boolean;
  cover: CoverLevel;
  /** Moltiplicatore del costo di movimento; `null` = invalicabile. */
  movementCost: number | null;
  /** Altezza in metri: conta per copertura, salti e linea di vista. */
  height: number;
  /** Stato terminale: non se ne esce più (crollato, abbattuto). */
  terminal?: boolean;
}

/* ------------------------------------------------------------------ */
/* Prove e risoluzioni                                                */
/* ------------------------------------------------------------------ */

export const OUTCOME_KINDS = [
  "SUCCESS",
  "FAILURE",
  "CRITICAL_SUCCESS",
  "CRITICAL_FAILURE",
] as const;
export type OutcomeKind = (typeof OUTCOME_KINDS)[number];

/**
 * Che cosa succede dopo una prova. Tutto è dichiarativo: il motore lo
 * applica, la UI lo racconta, nessuno dei due deve conoscere la porta.
 */
export interface InteractionOutcome {
  kind: OutcomeKind;
  /** Testo per il tavolo: "La porta cede con uno schianto". */
  message: string;
  /** Stato in cui finisce l'elemento. */
  toState: ElementStateId | null;
  /** Danno subito da chi agisce ("2d6"), se previsto. */
  damage: string;
  damageType: string;
  /** Condizione applicata a chi agisce ("Prono"). */
  condition: string;
  /** Movimento consumato oltre a quello dell'azione, in caselle. */
  movementCells: number;
  /** Rumore o segnale che il Master deve vedere comunque. */
  alertsMaster: boolean;
  /** Sblocca un'altra interazione dello stesso elemento. */
  unlocksInteraction: string | null;
}

/**
 * Un modo di risolvere un'interazione. Una porta si apre con la maniglia,
 * con la spalla o con i grimaldelli: tre metodi, tre prove, tre esiti.
 */
export interface ResolutionMethod {
  id: string;
  label: string;
  description: string;
  /** Prova richiesta; `null` = riesce automaticamente. */
  check: TacticalCheck | null;
  /** Strumento o oggetto necessario ("Arnesi da scasso", "Chiave"). */
  requiresTool: string;
  /** Costo in azioni del turno. */
  actionCost: "FREE" | "ACTION" | "BONUS" | "REACTION" | "MOVEMENT";
  /** Esiti possibili; almeno successo e fallimento. */
  outcomes: InteractionOutcome[];
  /** Offerto ai giocatori o riservato alla regia. */
  visibleToPlayers: boolean;
}

/* ------------------------------------------------------------------ */
/* Requisiti spaziali                                                 */
/* ------------------------------------------------------------------ */

export interface SpatialRequirement {
  /** Distanza massima in caselle dall'elemento. 0 = sopra di esso. */
  maxDistance: number;
  /** Serve poter vedere l'elemento. */
  requiresLineOfSight: boolean;
  /** Dislivello massimo superabile per raggiungerlo. */
  maxElevationDelta: number;
  /** Lati da cui si può agire; vuoto = tutti. */
  sides: ("N" | "E" | "S" | "W")[];
}

export const DEFAULT_REQUIREMENT: SpatialRequirement = {
  maxDistance: 1,
  requiresLineOfSight: true,
  maxElevationDelta: 2,
  sides: [],
};

/* ------------------------------------------------------------------ */
/* Interazioni                                                        */
/* ------------------------------------------------------------------ */

/**
 * Un'azione possibile su un elemento, con i modi in cui la si può
 * tentare e gli stati in cui ha senso proporla. Una porta distrutta non
 * si scassina più: `availableStates` lo dice, e la UI la nasconde.
 */
export interface InteractionDefinition {
  id: string;
  kind: InteractionKind;
  label: string;
  description: string;
  /** Stati in cui l'azione compare; vuoto = sempre. */
  availableStates: ElementStateId[];
  methods: ResolutionMethod[];
  requires: SpatialRequirement;
  visibleToPlayers: boolean;
  /** Una volta sola per scontro. */
  once: boolean;
}

/* ------------------------------------------------------------------ */
/* Profili specializzati                                              */
/* ------------------------------------------------------------------ */

export const DAMAGE_TYPES = [
  "Contundente",
  "Perforante",
  "Tagliente",
  "Fuoco",
  "Freddo",
  "Acido",
  "Veleno",
  "Fulmine",
  "Tuono",
  "Necrotico",
  "Radiante",
  "Psichico",
  "Forza",
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** Come un elemento si rompe: soglie, non un unico interruttore. */
export interface DestructionProfile {
  hp: number;
  armorClass: number;
  /** Riduzione del danno per colpo (oggetti massicci). */
  damageThreshold: number;
  resistances: string[];
  vulnerabilities: string[];
  immunities: string[];
  /**
   * Stati attraversati man mano che gli HP scendono, dalla soglia più
   * alta alla più bassa: 0.5 = a metà HP diventa "danneggiato".
   */
  stages: { atHpRatio: number; state: ElementStateId }[];
}

/** Elementi che si possono spingere, trascinare, ribaltare. */
export interface MovableProfile {
  /** Peso in chilogrammi: serve al Master più del sistema. */
  weight: number;
  check: TacticalCheck;
  /** Caselle di spostamento con una prova riuscita. */
  distanceCells: number;
  /** Consuma movimento di chi spinge. */
  costsMovement: boolean;
}

/** Elementi scalabili: muri, alberi, scogliere. */
export interface ClimbProfile {
  check: TacticalCheck;
  /** Quota raggiunta arrivando in cima. */
  reachesElevation: number;
  /** Costo in caselle di movimento. */
  movementCells: number;
  /** Danno da caduta in caso di fallimento critico. */
  fallDamage: string;
}

/* ------------------------------------------------------------------ */
/* Ingombro                                                           */
/* ------------------------------------------------------------------ */

export interface FootprintDefault {
  /** Caselle occupate in larghezza e profondità. */
  width: number;
  depth: number;
  /**
   * L'ingombro lo decide la selezione del Master (muri, ponti, edifici):
   * la misura predefinita è solo un suggerimento.
   */
  freeform: boolean;
}

/* ------------------------------------------------------------------ */
/* Template                                                           */
/* ------------------------------------------------------------------ */

export interface ElementTemplate {
  /** Id stabile e parlante: "structure.door.reinforced". */
  id: string;
  category: ElementCategory;
  /** Famiglia dentro la categoria: "Porte", "Alberi", "Contenitori". */
  group: string;
  label: string;
  description: string;
  /** Icona lucide per gli elenchi e gli overlay dell'editor. */
  icon: string;
  color: string;
  material: string;
  keywords: string[];

  footprint: FootprintDefault;
  /** Altezza fisica in metri, quando lo stato non la sovrascrive. */
  height: number;

  /** Stato iniziale e comportamento di ogni stato possibile. */
  initialState: ElementStateId;
  states: Record<ElementStateId, StateBehaviour>;

  interactions: InteractionDefinition[];

  destruction: DestructionProfile | null;
  movable: MovableProfile | null;
  climb: ClimbProfile | null;

  /** Visibile ai giocatori appena la mappa si apre (le trappole no). */
  visibleToPlayers: boolean;
}

/* ------------------------------------------------------------------ */
/* Difficoltà tipiche                                                 */
/* ------------------------------------------------------------------ */

/**
 * Scala di robustezza: è ciò che distingue una porta di legno da una
 * fortificata senza obbligare il Master a inventare una CD ogni volta.
 */
export const STURDINESS = [
  "FLIMSY",
  "ORDINARY",
  "STURDY",
  "REINFORCED",
  "FORTIFIED",
] as const;
export type Sturdiness = (typeof STURDINESS)[number];

export const STURDINESS_LABELS: Record<Sturdiness, string> = {
  FLIMSY: "Fragile",
  ORDINARY: "Comune",
  STURDY: "Robusto",
  REINFORCED: "Rinforzato",
  FORTIFIED: "Fortificato",
};

/** Grado di prova associato a ogni livello di robustezza. */
export const STURDINESS_TIER: Record<Sturdiness, DifficultyTier> = {
  FLIMSY: "EASY",
  ORDINARY: "MEDIUM",
  STURDY: "HARD",
  REINFORCED: "VERY_HARD",
  FORTIFIED: "EXTREME",
};

/** HP e CA tipici per livello di robustezza (linee guida DMG). */
export const STURDINESS_DURABILITY: Record<
  Sturdiness,
  { hp: number; armorClass: number; damageThreshold: number }
> = {
  FLIMSY: { hp: 5, armorClass: 10, damageThreshold: 0 },
  ORDINARY: { hp: 15, armorClass: 13, damageThreshold: 0 },
  STURDY: { hp: 30, armorClass: 15, damageThreshold: 0 },
  REINFORCED: { hp: 60, armorClass: 17, damageThreshold: 5 },
  FORTIFIED: { hp: 120, armorClass: 19, damageThreshold: 10 },
};
