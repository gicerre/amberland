import type { Timestamp } from "firebase/firestore";

import type { TacticalMap } from "./battlemap";
import type { CharacterSheet, ConditionEntry } from "./entities";
import type { Role } from "./models";

/* ============================================================
 * Campo di Battaglia — modelli del Combat System.
 *
 * Le battaglie NON vivono nel Sistema Universale delle Entità:
 * `entities` è il codex narrativo (lore, visibilità a 4 livelli),
 * mentre un combattimento è stato operativo ad alta frequenza di
 * scrittura. Il combattimento *consuma* il codex — i nemici nascono
 * dal Bestiario, i PC dalle schede — ma per SNAPSHOT, mai per
 * riferimento vivo: modificare una scheda a scontro in corso non
 * altera la pedina sul campo.
 *
 * Vedi docs/COMBAT_SYSTEM.md per l'analisi completa.
 * ============================================================ */

/* ------------------------------------------------------------------ */
/* Stato della battaglia                                              */
/* ------------------------------------------------------------------ */

export const BATTLE_STATUSES = [
  /** Bozza: il Master configura liberamente, i giocatori non la vedono. */
  "DRAFT",
  /** Pronta: configurazione conclusa, non ancora aperta al party. */
  "READY",
  /** Schieramento: i giocatori entrano, scelgono posizione e iniziativa. */
  "LOBBY",
  /** Combattimento in corso. */
  "ACTIVE",
  /** Sospesa: nessuna azione di gioco accettata, mappa visibile. */
  "PAUSED",
  /** Conclusa: sola lettura, la cronaca resta consultabile. */
  "COMPLETED",
  /** Archiviata: fuori dagli elenchi correnti. */
  "ARCHIVED",
] as const;
export type BattleStatus = (typeof BATTLE_STATUSES)[number];

/** Stati in cui la battaglia è visibile ai giocatori (allineato alle Rules). */
export const BATTLE_PUBLIC_STATUSES: BattleStatus[] = [
  "LOBBY",
  "ACTIVE",
  "PAUSED",
  "COMPLETED",
];

/** Stati in cui la configurazione della mappa è ancora modificabile. */
export const BATTLE_EDITABLE_STATUSES: BattleStatus[] = ["DRAFT", "READY"];

/* ------------------------------------------------------------------ */
/* Griglia e mappa                                                    */
/* ------------------------------------------------------------------ */

export const DISTANCE_UNITS = ["m", "ft"] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

/**
 * Metrica di distanza e movimento.
 *  - CHEBYSHEV:   5e base — la diagonale costa quanto un passo dritto
 *  - ALTERNATING: variante DMG 5-10-5 — una diagonale su due costa doppio
 *  - EUCLIDEAN:   distanza reale, per range e aree circolari
 *  - MANHATTAN:   nessuna diagonale
 */
export const DISTANCE_METRICS = [
  "CHEBYSHEV",
  "ALTERNATING",
  "EUCLIDEAN",
  "MANHATTAN",
] as const;
export type DistanceMetric = (typeof DISTANCE_METRICS)[number];

/** Forma della griglia. HEX è predisposto ma non ancora implementato. */
export const GRID_KINDS = ["SQUARE", "HEX"] as const;
export type GridKind = (typeof GRID_KINDS)[number];

export interface GridConfig {
  kind: GridKind;
  /** Colonne × righe: le dimensioni LOGICHE della mappa. */
  cols: number;
  rows: number;
  /** Quanto vale UNA cella nel mondo di gioco (es. 3 = 3 metri). */
  cellSize: number;
  unit: DistanceUnit;
  metric: DistanceMetric;
  /** Griglia disegnata sopra lo sfondo (solo estetico). */
  visible: boolean;
  /** Calibrazione su sfondi che hanno GIÀ una griglia disegnata. */
  offsetX: number;
  offsetY: number;
  /** Scala fine dell'immagine rispetto alla griglia (1 = combacia). */
  imageScale: number;
}

export const IMAGE_FITS = ["COVER", "CONTAIN", "STRETCH"] as const;
export type ImageFit = (typeof IMAGE_FITS)[number];

export const MAP_ROTATIONS = [0, 90, 180, 270] as const;
export type MapRotation = (typeof MAP_ROTATIONS)[number];

export interface BackgroundImage {
  url: string;
  /** Dimensioni native, lette al caricamento: servono al fit e al ritaglio. */
  naturalWidth: number;
  naturalHeight: number;
  fit: ImageFit;
  rotation: MapRotation;
  /** Oscuramento (0–1) per far risaltare griglia e pedine. */
  dim: number;
}

export const TERRAIN_KINDS = [
  "NORMAL",
  "DIFFICULT",
  "WALL",
  "HAZARD",
  "WATER",
  "PIT",
] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];

export interface Position {
  x: number;
  y: number;
}

export interface CellRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/* ------------------------------------------------------------------ */
/* Turni e iniziativa                                                 */
/* ------------------------------------------------------------------ */

export interface TurnState {
  /** Tornata corrente, 1-based. 0 = combattimento non ancora avviato. */
  round: number;
  /** Indice del combattente attivo dentro `Battle.order`. */
  turnIndex: number;
  activeCombatantId: string | null;
  /** Inizio del turno corrente: base per il timer opzionale. */
  turnStartedAt: Timestamp | null;
  /**
   * Compare-and-swap dell'avanzamento: ogni passaggio di turno la
   * incrementa. Un doppio click su "Fine turno" trova la versione
   * cambiata e viene respinto invece di saltare un combattente.
   */
  version: number;
}

export interface InitiativeEntry {
  combatantId: string;
  initiative: number;
  /** Tiebreak automatico: modificatore di Destrezza (regola 5e). */
  dexMod: number;
  /** Tiebreak manuale del Master: il valore più basso agisce prima. */
  manualRank: number | null;
  /** Denormalizzati: la traccia iniziativa si ridisegna di continuo. */
  name: string;
  side: CombatantSide;
}

/* ------------------------------------------------------------------ */
/* Battaglia                                                          */
/* ------------------------------------------------------------------ */

export const ENEMY_HP_DISPLAYS = ["HIDDEN", "BAND", "BAR", "EXACT"] as const;
/**
 * Quanto i giocatori vedono della salute dei nemici:
 *  - HIDDEN: nulla
 *  - BAND:   fascia qualitativa ("gravemente ferito") — default
 *  - BAR:    barra proporzionale, senza numeri
 *  - EXACT:  HP numerici (il Master ha scelto di rivelarli)
 */
export type EnemyHpDisplay = (typeof ENEMY_HP_DISPLAYS)[number];

export interface BattleRules {
  /** Blocca il movimento oltre il budget (false = consentito con avviso). */
  enforceMovement: boolean;
  /** Le celle occupate da nemici bloccano il passaggio. */
  blockOccupied: boolean;
  /** I giocatori vedono gli HP numerici dei compagni di party. */
  revealAllyHp: boolean;
  enemyHpDisplay: EnemyHpDisplay;
  /** Timer del turno in secondi; 0 = disattivo. Informativo, mai bloccante. */
  turnTimerSeconds: number;
  /** I giocatori scelgono liberamente la casella di partenza. */
  freeDeployment: boolean;
  /** Zone di schieramento consentite ai giocatori (se non `freeDeployment`). */
  deploymentZones: CellRect[];
}

/** Collegamenti al codex: la battaglia non vive isolata dalla campagna. */
export interface BattleLinks {
  /** `entities` di tipo geografico: dove si combatte. */
  locationId: string | null;
  /** `entities` di tipo quest: perché si combatte. */
  questId: string | null;
  /** `entities` di tipo session: durante quale serata di gioco. */
  sessionId: string | null;
}

/** Documento `battles/{id}`. */
export interface Battle {
  id: string;
  name: string;
  description: string;
  status: BattleStatus;
  /**
   * Predisposizione multi-campagna: oggi Amberland è mono-campagna e il
   * valore è sempre `DEFAULT_CAMPAIGN_ID`. Il campo evita una migrazione
   * il giorno in cui le campagne diventeranno più di una.
   */
  campaignId: string;
  /** Master abilitati alla regia (co-DM). Gli ADMIN possono sempre. */
  masterIds: string[];
  createdBy: string;

  grid: GridConfig;
  background: BackgroundImage | null;

  /** Ordine di iniziativa già ordinato (vedi engine/initiative.ts). */
  order: InitiativeEntry[];
  turn: TurnState;
  rules: BattleRules;

  /**
   * Livello terreno come mappa SPARSA: chiave "x,y" → tipo.
   * PROIEZIONE del modello tattico, mantenuta per compatibilità con il
   * motore di movimento e con le battaglie nate prima dell'editor.
   */
  terrain: Record<string, TerrainKind>;

  /**
   * Mappa tattica completa (celle, oggetti, trappole, pericoli, aree):
   * è la verità del campo, prodotta dal Battlemap Editor. Assente sulle
   * battaglie più vecchie — vedi `normalizeTacticalMap`.
   */
  tactical?: TacticalMap | null;

  links: BattleLinks;

  startedAt: Timestamp | null;
  endedAt: Timestamp | null;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/* ------------------------------------------------------------------ */
/* Combattenti                                                        */
/* ------------------------------------------------------------------ */

export const COMBATANT_SIDES = ["PC", "ENEMY", "ALLY", "NEUTRAL"] as const;
export type CombatantSide = (typeof COMBATANT_SIDES)[number];

export const ENEMY_CATEGORIES = [
  "BOSS",
  "MINI_BOSS",
  "ELITE",
  "STANDARD",
  "MINION",
  "MELEE",
  "RANGED",
  "MAGIC",
  "SUPPORT",
  "BEAST",
  "SUMMON",
] as const;
export type EnemyCategory = (typeof ENEMY_CATEGORIES)[number];

export const COMBATANT_TURN_STATES = [
  "WAITING",
  "ACTIVE",
  "COMPLETED",
  "SKIPPED",
  "DEAD",
  "REMOVED",
] as const;
export type CombatantTurnState = (typeof COMBATANT_TURN_STATES)[number];

/**
 * Fascia qualitativa di salute: ciò che i giocatori vedono dei nemici
 * quando gli HP numerici restano riservati ("il Boss è gravemente ferito").
 */
export const HEALTH_BANDS = [
  "UNHARMED",
  "BRUISED",
  "WOUNDED",
  "BLOODIED",
  "CRITICAL",
  "DOWN",
] as const;
export type HealthBand = (typeof HEALTH_BANDS)[number];

export interface HitPoints {
  current: number;
  max: number;
  temp: number;
}

export interface DeathSaves {
  successes: number;
  failures: number;
}

/**
 * Documento `battles/{id}/combatants/{cid}` — DATI PUBBLICI.
 *
 * ⚠️ Le Security Rules filtrano documenti, mai singoli campi: tutto ciò
 * che sta qui è leggibile da qualunque utente autenticato. I dati
 * riservati dei nemici vivono in `combatants/{cid}/secret/master`
 * (vedi CombatantSecret).
 */
export interface Combatant {
  id: string;
  battleId: string;
  side: CombatantSide;

  /** Nome mostrato a TUTTI (per un nemico può essere "Figura incappucciata"). */
  publicName: string;
  /** Immagine della pedina; "" → placeholder generato dalla categoria. */
  tokenUrl: string;
  /** Ingombro in celle (1 = Media, 2 = Grande, 3 = Enorme). */
  size: number;
  /** Colore dell'anello: distingue i duplicati (Goblin A/B/C). */
  accent: string;

  /** Entità del codex da cui è nato (creatura o personaggio). */
  sourceEntityId: string | null;
  /** Solo PC: uid del giocatore che comanda la pedina. */
  ownerId: string | null;
  /** Delega temporanea del controllo concessa dal Master. */
  controllerIds: string[];

  /** Categoria tattica; null per i PC. */
  category: EnemyCategory | null;

  /** Posizione sulla griglia; null = non ancora schierato. */
  position: Position | null;
  /** Movimento massimo per turno, nell'unità della mappa (es. 9 metri). */
  speed: number;
  /** Movimento già consumato nel turno corrente. */
  movementUsed: number;

  initiative: number | null;
  dexMod: number;
  turnState: CombatantTurnState;

  /** Riusa ConditionEntry del Codex: continuità col personaggio. */
  conditions: ConditionEntry[];

  /**
   * HP numerici. Valorizzati solo quando sono legittimamente pubblici
   * (PC e alleati, o nemici con `enemyHpDisplay: "EXACT"`). Per i nemici
   * riservati vale `null` e i numeri veri stanno in CombatantSecret.
   */
  hp: HitPoints | null;
  /** Fascia qualitativa: SEMPRE presente, sempre pubblica. */
  healthBand: HealthBand;
  /** Solo il Master può dichiarare morta una pedina. */
  isDead: boolean;
  deathSaves: DeathSaves | null;

  /** Testo narrativo che il Master ha scelto di rendere pubblico. */
  publicNote: string;
  /** false = pedina nascosta ai giocatori (base del fog of war). */
  visible: boolean;

  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/**
 * Documento `battles/{id}/combatants/{cid}/secret/master` — leggibile e
 * scrivibile SOLO da Master e Admin (Security Rules). È l'unico modo di
 * nascondere davvero dei dati: un campo "privato" su un documento
 * leggibile sarebbe visibile via SDK anche con la UI che lo nasconde.
 */
export interface CombatantSecret {
  /** Nome vero, quando la pedina si presenta con un nome pubblico diverso. */
  realName: string;
  hp: HitPoints;
  armorClass: number;
  /** Statistiche complete, quando la creatura ne ha una. */
  statBlock: Partial<CharacterSheet> | null;
  /** Copia dei dati del codex al momento dell'inserimento. */
  sourceSnapshot: Record<string, unknown> | null;
  masterNotes: string;
  tactics: string;
  lootPreview: string;
}

/* ------------------------------------------------------------------ */
/* Cronaca dello scontro (log append-only)                            */
/* ------------------------------------------------------------------ */

export const BATTLE_EVENT_TYPES = [
  "BATTLE_CREATED",
  "BATTLE_PUBLISHED",
  "BATTLE_STARTED",
  "BATTLE_PAUSED",
  "BATTLE_RESUMED",
  "BATTLE_ENDED",
  "COMBATANT_ADDED",
  "COMBATANT_REMOVED",
  "COMBATANT_JOINED",
  "COMBATANT_MOVED",
  "COMBATANT_DAMAGED",
  "COMBATANT_HEALED",
  "COMBATANT_DIED",
  "COMBATANT_REVIVED",
  "ELEMENT_INTERACTED",
  "CONDITION_ADDED",
  "CONDITION_REMOVED",
  "INITIATIVE_SET",
  "ORDER_CHANGED",
  "TURN_STARTED",
  "TURN_ENDED",
  "TURN_SKIPPED",
  "ROUND_ADVANCED",
  "MASTER_UNDO",
] as const;
export type BattleEventType = (typeof BATTLE_EVENT_TYPES)[number];

/**
 * Documento `battles/{id}/events/{eventId}`.
 * L'id del documento è l'`actionId` generato dal client: un retry di rete
 * non può quindi duplicare l'effetto di un'azione già registrata.
 */
export interface BattleEvent {
  id: string;
  type: BattleEventType;
  round: number;
  turnIndex: number;
  actorUid: string;
  actorName: string;
  combatantId: string | null;
  /** Testo già pronto in italiano: "Grimtooth subisce 12 danni". */
  message: string;
  /** Patch inversa, per l'annullamento da parte del Master. */
  inverse: Record<string, unknown> | null;
  /** Evento riservato: non leggibile dai giocatori. */
  masterOnly: boolean;
  at: Timestamp | null;
}

/* ------------------------------------------------------------------ */
/* Presenza                                                           */
/* ------------------------------------------------------------------ */

/**
 * Documento `battles/{id}/presence/{uid}`.
 * Firestore non ha `onDisconnect`: la presenza si mantiene con un
 * heartbeat su `lastSeenAt` e si considera offline dopo PRESENCE_TIMEOUT_MS.
 */
export interface BattlePresence {
  uid: string;
  username: string;
  role: Role;
  /** Combattente selezionato dal giocatore. */
  combatantId: string | null;
  lastSeenAt: Timestamp | null;
  /** Finestra a fuoco (informativo). */
  active: boolean;
}

/* ------------------------------------------------------------------ */
/* Proiezione per ruolo                                               */
/* ------------------------------------------------------------------ */

/**
 * Ciò che un dato utente può vedere di una data pedina — prodotto da
 * engine/visibility.ts. Unico punto di verità sulla riservatezza:
 * la UI non decide mai da sé cosa mostrare.
 */
export interface CombatantView {
  id: string;
  side: CombatantSide;
  name: string;
  tokenUrl: string;
  size: number;
  accent: string;
  category: EnemyCategory | null;
  position: Position | null;
  turnState: CombatantTurnState;
  isDead: boolean;
  /**
   * Fascia di salute per chi guarda; `null` quando il Master ha scelto di
   * non rivelare nulla (`enemyHpDisplay: "HIDDEN"`): nessuna informazione
   * è più onesta di una fascia inventata.
   */
  healthBand: HealthBand | null;
  /** HP numerici, se chi guarda ha diritto di vederli. */
  hp: HitPoints | null;
  /** Rapporto 0–1 per la barra, se consentita senza numeri. */
  hpRatio: number | null;
  conditions: ConditionEntry[];
  speed: number;
  movementUsed: number;
  initiative: number | null;
  note: string;
  /** Chi guarda può muovere questa pedina (nel turno giusto). */
  canControl: boolean;
  /** Chi guarda vede i dati riservati (Master). */
  isPrivileged: boolean;
}

/* ------------------------------------------------------------------ */
/* Default                                                            */
/* ------------------------------------------------------------------ */

/** Campagna unica attuale: vedi nota su `Battle.campaignId`. */
export const DEFAULT_CAMPAIGN_ID = "amberland";

/** Presenza scaduta dopo 60s senza heartbeat (che batte ogni 25s). */
export const PRESENCE_HEARTBEAT_MS = 25_000;
export const PRESENCE_TIMEOUT_MS = 60_000;

/** Limiti difensivi, applicati anche lato API. */
export const BATTLE_LIMITS = {
  minCols: 1,
  maxCols: 100,
  minRows: 1,
  maxRows: 100,
  minCellSize: 0.1,
  maxCellSize: 100,
  maxCombatants: 100,
  /** Nemici creabili in una sola operazione di duplicazione. */
  maxDuplicateCount: 30,
  maxNameLength: 80,
  maxDescriptionLength: 2000,
  maxNoteLength: 1000,
  minInitiative: -20,
  maxInitiative: 50,
  maxSize: 4,
} as const;

export const DEFAULT_GRID: GridConfig = {
  kind: "SQUARE",
  cols: 20,
  rows: 15,
  cellSize: 1.5,
  unit: "m",
  metric: "CHEBYSHEV",
  visible: true,
  offsetX: 0,
  offsetY: 0,
  imageScale: 1,
};

export const DEFAULT_BATTLE_RULES: BattleRules = {
  enforceMovement: true,
  blockOccupied: true,
  revealAllyHp: true,
  enemyHpDisplay: "BAND",
  turnTimerSeconds: 0,
  freeDeployment: true,
  deploymentZones: [],
};

export const EMPTY_TURN_STATE: TurnState = {
  round: 0,
  turnIndex: 0,
  activeCombatantId: null,
  turnStartedAt: null,
  version: 0,
};

export const EMPTY_BATTLE_LINKS: BattleLinks = {
  locationId: null,
  questId: null,
  sessionId: null,
};
