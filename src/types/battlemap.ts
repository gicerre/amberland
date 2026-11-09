import type { CombatantSide, Position } from "./battle";
import type {
  ClimbProfile,
  DestructionProfile,
  MovableProfile,
  ResolutionMethod,
  SpatialRequirement,
  StateBehaviour,
} from "./element-catalog";

/* ============================================================
 * Strato tattico della battlemap.
 *
 * PRINCIPIO: l'ambiente è GIÀ nell'immagine. Muri, porte, rocce, alberi,
 * casse, acqua e dislivelli sono disegnati lì dentro; il Master non li
 * ridisegna, li INTERPRETA. Seleziona le caselle che corrispondono a un
 * elemento visibile e dichiara che cosa quell'elemento è e che cosa si
 * può farci.
 *
 * Questo modello è quindi un livello di METADATA invisibile agganciato
 * alle coordinate della griglia. Non tocca l'immagine, non la modifica
 * mai, e può essere riscritto in qualunque momento senza conseguenze
 * grafiche. I colori che compaiono qui dentro servono SOLO agli overlay
 * dell'editor: in partita il giocatore vede immagine, griglia e pedine.
 *
 * Dove vive: nel documento `battles/{id}`, campo `tactical`. Le celle
 * sono SPARSE — si scrivono solo quelle configurate — così una mappa
 * 30×21 pesa decine di KB e resta lontana dal limite di 1 MB del
 * documento. `Battle.terrain` resta come proiezione derivata, per non
 * rompere ciò che già la legge.
 * ============================================================ */

/** Versione del formato: serve il giorno in cui il modello cambierà. */
export const TACTICAL_MAP_VERSION = 1;

/* ------------------------------------------------------------------ */
/* Difficoltà e prove                                                 */
/* ------------------------------------------------------------------ */

export const DIFFICULTY_TIERS = [
  "EASY",
  "MEDIUM",
  "HARD",
  "VERY_HARD",
  "EXTREME",
  "CUSTOM",
] as const;
export type DifficultyTier = (typeof DIFFICULTY_TIERS)[number];

/**
 * Tabella delle CD: unico punto di verità, mai valori scritti a mano nei
 * componenti. Ogni mappa può sovrascriverla in `settings.difficultyDc`.
 */
export type DifficultyTable = Record<
  Exclude<DifficultyTier, "CUSTOM">,
  number
>;

export const DEFAULT_DIFFICULTY_DC: DifficultyTable = {
  EASY: 10,
  MEDIUM: 12,
  HARD: 15,
  VERY_HARD: 18,
  EXTREME: 20,
};

/** Prova richiesta da una cella, una trappola o un oggetto. */
export interface TacticalCheck {
  /** Abilità o caratteristica ("Atletica", "Acrobazia", "Percezione"…). */
  skill: string;
  difficulty: DifficultyTier;
  /** CD effettiva: derivata dal grado, o scelta a mano se `CUSTOM`. */
  dc: number;
}

/* ------------------------------------------------------------------ */
/* Terreni                                                            */
/* ------------------------------------------------------------------ */

export type TerrainId = string;

export const TERRAIN_CATEGORIES = [
  "GROUND",
  "NATURE",
  "WATER",
  "HAZARD",
  "SPECIAL",
] as const;
export type TerrainCategory = (typeof TERRAIN_CATEGORIES)[number];

/**
 * Profilo tattico di una casella: NON è una texture da dipingere, è la
 * regola che governa quella porzione di immagine ("qui è fango: costa
 * doppio e serve una prova di Atletica").
 */
export interface TerrainDefinition {
  id: TerrainId;
  label: string;
  category: TerrainCategory;
  /**
   * Moltiplicatore del costo di movimento (1 = normale, 2 = difficile).
   * `null` = invalicabile.
   */
  movementCost: number | null;
  difficult: boolean;
  /** Riempimento sulla mappa: sobrio, il terreno non deve urlare. */
  color: string;
  /** Trama opzionale per distinguere terreni di colore simile. */
  pattern: "none" | "dots" | "lines" | "waves" | "cracks";
  /** Prova richiesta per attraversarlo, se ce n'è una. */
  check: TacticalCheck | null;
  /** Blocca la linea di vista (foresta fitta, macerie alte). */
  blocksSight: boolean;
  description: string;
}

/* ------------------------------------------------------------------ */
/* Copertura                                                          */
/* ------------------------------------------------------------------ */

export const COVER_LEVELS = ["NONE", "HALF", "THREE_QUARTERS", "TOTAL"] as const;
export type CoverLevel = (typeof COVER_LEVELS)[number];

export const DIRECTIONS = ["N", "E", "S", "W"] as const;
export type Direction = (typeof DIRECTIONS)[number];

/** Copertura per lato: un muretto a nord non protegge da sud. */
export type DirectionalCover = Partial<Record<Direction, CoverLevel>>;

/* ------------------------------------------------------------------ */
/* Cella                                                              */
/* ------------------------------------------------------------------ */

export interface MapCell {
  terrain: TerrainId;
  /** Quota in livelli (−4…+8). 0 è il piano di riferimento. */
  elevation: number;
  /** Override del costo deciso dal Master; `null` = invalicabile. */
  movementCost?: number | null;
  /** Blocco esplicito (muro dipinto, voragine). */
  blocked?: boolean;
  /** Copertura offerta a chi si trova NELLA cella. */
  cover?: CoverLevel;
  /** Copertura sui lati: muretti, parapetti, feritoie. */
  coverEdges?: DirectionalCover;
  /** Prova specifica di questa cella (sovrascrive quella del terreno). */
  check?: TacticalCheck | null;
  /** Nota del Master, visibile solo a lui. */
  note?: string;
}

/** Celle sparse: chiave "x,y". Le celle di default non si scrivono. */
export type MapCells = Record<string, MapCell>;

/* ------------------------------------------------------------------ */
/* Oggetti                                                            */
/* ------------------------------------------------------------------ */

export const MAP_OBJECT_KINDS = [
  "OBSTACLE",
  "WALL",
  "DOOR",
  "SECRET_DOOR",
  "LEVER",
  "HATCH",
  "BRIDGE",
  "STAIRS",
  "CONTAINER",
  "DECOR",
] as const;
export type MapObjectKind = (typeof MAP_OBJECT_KINDS)[number];

export const OBJECT_STATES = [
  "OPEN",
  "CLOSED",
  "LOCKED",
  "HIDDEN",
  "ON",
  "OFF",
  "BROKEN",
  "NONE",
] as const;
export type ObjectState = (typeof OBJECT_STATES)[number];

/** Prove associate a un oggetto: aprire, scassinare, scoprire, sfondare. */
export interface ObjectChecks {
  perception?: TacticalCheck | null;
  investigation?: TacticalCheck | null;
  lockpick?: TacticalCheck | null;
  force?: TacticalCheck | null;
  disarm?: TacticalCheck | null;
}

export const INTERACTION_KINDS = [
  "OPEN",
  "CLOSE",
  "LOCK",
  "UNLOCK",
  "DESTROY",
  "INSPECT",
  "ACTIVATE",
  "DEACTIVATE",
  "CLIMB",
  "PASS",
  "TAKE_COVER",
  "CUSTOM",
] as const;
export type InteractionKind = (typeof INTERACTION_KINDS)[number];

/**
 * Azione eseguibile su un elemento ambientale durante il combattimento.
 *
 * L'effetto è dichiarativo: l'interazione dice in che stato mette
 * l'elemento e se ne cambia passabilità, vista o copertura. Il motore
 * applica, la UI si limita a offrire il pulsante a chi è nel raggio.
 */
export interface ElementInteraction {
  id: string;
  kind: InteractionKind;
  /** Etichetta mostrata al tavolo ("Apri la porta", "Scavalca"). */
  label: string;
  description: string;
  /**
   * Modi diversi di riuscirci: la porta si apre con la maniglia, con la
   * spalla o con i grimaldelli. Ogni metodo ha la sua prova e i suoi
   * esiti. Vuoto = azione automatica.
   */
  methods?: ResolutionMethod[];
  /** Stati in cui l'azione ha senso; vuoto = sempre. */
  availableStates?: string[];
  /** Requisiti spaziali specifici (distanza, vista, dislivello). */
  requires?: SpatialRequirement;
  /** Prova unica — forma breve, ancora usata dalle azioni semplici. */
  check: TacticalCheck | null;
  /** Stato in cui finisce l'elemento dopo l'azione. */
  setsState: ObjectState | null;
  /** Nuovi valori di passabilità, vista e copertura (null = invariato). */
  setsBlocksMovement: boolean | null;
  setsBlocksSight: boolean | null;
  setsCover: CoverLevel | null;
  /** Offerta anche ai giocatori, o riservata al Master. */
  visibleToPlayers: boolean;
  /** Una volta sola per scontro (una porta sfondata resta sfondata). */
  once: boolean;
  /** Già usata in questo scontro. */
  used: boolean;
}

/**
 * Elemento ambientale: una porzione dell'immagine a cui il Master ha
 * dato un significato di gioco. Non viene disegnato in partita — è già
 * nell'immagine — ma esiste per il motore e, nell'editor, come overlay.
 */
export interface MapObject {
  id: string;
  /**
   * Template del catalogo da cui nasce ("structure.door.reinforced").
   * Serve alla provenienza e al "ripristina i valori di catalogo": i
   * valori veri stanno QUI, sull'istanza, perché modificare un template
   * non deve cambiare le mappe già configurate.
   */
  templateId?: string | null;
  kind: MapObjectKind;
  name: string;
  /**
   * Caselle OCCUPATE dall'elemento ("x,y"). Una grande roccia 3×2 è un
   * elemento solo, con sei caselle: si configura una volta.
   */
  cells: string[];
  /** Icona e colore: overlay dell'EDITOR, mai visibili in partita. */
  icon: string;
  color: string;
  blocksMovement: boolean;
  blocksSight: boolean;
  cover: CoverLevel;
  /** Altezza nell'unità della mappa: conta per copertura e salti. */
  height: number;
  destructible: boolean;
  hp: number;
  armorClass: number;
  material: string;
  state: ObjectState;
  checks: ObjectChecks;
  /** Azioni disponibili su questo elemento. */
  interactions: ElementInteraction[];
  /**
   * Distanza massima, in caselle, da cui si può interagire. 1 = dalle
   * caselle adiacenti (il caso normale): è così che si distingue fra le
   * caselle OCCUPATE dall'elemento e quelle utilizzabili attorno.
   */
  interactionRange: number;
  /**
   * Stati possibili con il rispettivo comportamento. Cambiare stato
   * riscrive passabilità, copertura, vista e altezza dell'istanza: è il
   * meccanismo con cui una porta aperta smette davvero di sbarrare.
   */
  stateBehaviours?: Record<string, StateBehaviour>;
  /** Come si rompe: HP, CA, soglie e stati intermedi. */
  destruction?: DestructionProfile | null;
  /** Come si sposta: peso, prova, caselle. */
  movable?: MovableProfile | null;
  /** Come si scala: prova, quota raggiunta, caduta. */
  climb?: ClimbProfile | null;
  /** Danni già subiti, per le soglie di distruzione. */
  damageTaken?: number;
  /** Collegamenti ad altri oggetti: la leva A apre la porta B. */
  linkedIds: string[];
  /** Scale e rampe: quali quote collegano. */
  connectsElevation: { from: number; to: number } | null;
  visibleToPlayers: boolean;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Trappole                                                           */
/* ------------------------------------------------------------------ */

export const TRAP_TRIGGERS = [
  "ENTER",
  "EXIT",
  "PROXIMITY",
  "INTERACT",
  "WEIGHT",
  "TIMER",
  "MANUAL",
] as const;
export type TrapTrigger = (typeof TRAP_TRIGGERS)[number];

export const TRAP_RESETS = ["NONE", "MANUAL", "AUTOMATIC", "ROUND"] as const;
export type TrapReset = (typeof TRAP_RESETS)[number];

export interface MapTrap {
  id: string;
  name: string;
  /** Tipo dal catalogo ("PIT", "DART", "BLADE"…) o libero. */
  type: string;
  description: string;
  cells: string[];
  /** Nascosta finché qualcuno non la scopre. */
  hidden: boolean;
  armed: boolean;
  perception: TacticalCheck | null;
  investigation: TacticalCheck | null;
  disarm: TacticalCheck | null;
  /** Tiro salvezza: caratteristica + CD. */
  save: { ability: string; dc: number } | null;
  damage: string;
  damageType: string;
  effect: string;
  trigger: TrapTrigger;
  reset: TrapReset;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Pericoli ambientali                                                */
/* ------------------------------------------------------------------ */

export const HAZARD_KINDS = [
  "FIRE",
  "LAVA",
  "GAS",
  "POISON",
  "ICE",
  "CURRENT",
  "UNSTABLE",
  "ARCANE",
  "DARKNESS",
  "FOG",
  "WIND",
  "LIGHTNING",
] as const;
export type HazardKind = (typeof HAZARD_KINDS)[number];

export interface MapHazard {
  id: string;
  kind: HazardKind;
  name: string;
  description: string;
  cells: string[];
  /** Si ripete a ogni turno di chi vi sosta. */
  recurring: boolean;
  save: { ability: string; dc: number } | null;
  damage: string;
  damageType: string;
  effect: string;
  color: string;
  visibleToPlayers: boolean;
}

/* ------------------------------------------------------------------ */
/* Aree d'effetto                                                     */
/* ------------------------------------------------------------------ */

export const AREA_SHAPES = [
  "RECT",
  "CIRCLE",
  "CONE",
  "LINE",
  "POLYGON",
  "FREE",
] as const;
export type AreaShape = (typeof AREA_SHAPES)[number];

/**
 * Un'area è INDIPENDENTE dalle celle: le sovrasta. Le celle coperte sono
 * memorizzate per il disegno e per le interrogazioni, ma cancellare
 * l'area non tocca il terreno sottostante.
 */
export interface MapArea {
  id: string;
  name: string;
  shape: AreaShape;
  cells: string[];
  origin: Position | null;
  /** Raggio/lunghezza nell'unità della mappa (metri o piedi). */
  radius: number;
  /** Direzione in gradi per coni e linee. */
  direction: number;
  effect: string;
  duration: string;
  color: string;
  opacity: number;
  visibleToPlayers: boolean;
  trigger: string;
  note: string;
}

/* ------------------------------------------------------------------ */
/* Zone e punti di interesse                                          */
/* ------------------------------------------------------------------ */

/**
 * Zona semantica: che cos'È quella porzione di mappa ("cortile",
 * "torre", "bosco"). Non è un effetto di gioco — è il modo in cui il
 * motore e il Master parlano della mappa senza indicare coordinate.
 */
export const ZONE_KINDS = [
  "ROOM",
  "CORRIDOR",
  "COURTYARD",
  "WALLS",
  "TOWER",
  "GATE",
  "BRIDGE",
  "MOAT",
  "RUBBLE",
  "FOREST",
  "CLEARING",
  "WATER",
  "ROAD",
  "CAMP",
  "CAVE",
  "SHRINE",
  "HIGH_GROUND",
  "OPEN_FIELD",
] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

export interface MapZone {
  id: string;
  kind: ZoneKind;
  name: string;
  cells: string[];
  color: string;
  note: string;
}

/**
 * Punto di interesse: dove si entra, dove si combatte, dove si muore.
 * Serve al Master per orientarsi e al motore per verificare che la mappa
 * stia in piedi (spawn raggiungibili, obiettivi non murati dentro).
 */
export const POI_KINDS = [
  "ENTRANCE",
  "EXIT",
  "SPAWN",
  "OBJECTIVE",
  "TREASURE",
  "SAFE",
  "DANGER",
  "VANTAGE",
  "AMBUSH",
  "ESCAPE",
  "CHOKEPOINT",
  "BOSS",
  "SHRINE",
] as const;
export type PoiKind = (typeof POI_KINDS)[number];

export interface MapPoi {
  id: string;
  kind: PoiKind;
  name: string;
  /** Casella principale del punto. */
  cell: string;
  /** Per gli schieramenti: di chi è questo spawn. */
  side: CombatantSide | null;
  /** Caselle dello schieramento, quando è un'area. */
  cells: string[];
  note: string;
  visibleToPlayers: boolean;
}

/* ------------------------------------------------------------------ */
/* Layer                                                              */
/* ------------------------------------------------------------------ */

export const MAP_LAYERS = [
  "terrain",
  "elevation",
  "water",
  "walls",
  "objects",
  "traps",
  "hazards",
  "areas",
  "zones",
  "poi",
  "cover",
  "lighting",
  "interactions",
  "grid",
] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];

export interface LayerState {
  visible: boolean;
  /** Bloccato: si vede ma non si modifica (evita tratti per sbaglio). */
  locked: boolean;
}

export type LayerStates = Record<MapLayer, LayerState>;

export const DEFAULT_LAYERS: LayerStates = MAP_LAYERS.reduce(
  (states, layer) => {
    states[layer] = { visible: true, locked: false };
    return states;
  },
  {} as LayerStates
);

/* ------------------------------------------------------------------ */
/* Impostazioni della mappa                                           */
/* ------------------------------------------------------------------ */

export interface MapSettings {
  /** Terreno assegnato alle celle mai dipinte. */
  defaultTerrain: TerrainId;
  /** Tabella delle CD di questa mappa. */
  difficultyDc: DifficultyTable;
  /**
   * Costo aggiuntivo per ogni livello di dislivello superato, in celle.
   * 1 = salire di un livello costa come una cella in più (regola 5e
   * dell'arrampicata semplificata alla griglia).
   */
  elevationStepCost: number;
  /** Oltre questo dislivello la cella è inaccessibile senza scalata. */
  maxClimbableStep: number;
  /** Terreni personalizzati creati dal Master per questa mappa. */
  customTerrains: TerrainDefinition[];
  showCoordinates: boolean;
  /** Ambiente da cui è nata la mappa: pura memoria, nessun effetto. */
  preset: string | null;
  /**
   * Seme della generazione: con lo stesso seme e le stesse opzioni la
   * struttura torna identica. È ciò che rende "rigenera" un gesto
   * ripetibile e condivisibile, non una lotteria.
   */
  seed: number | null;
}

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  defaultTerrain: "NORMAL",
  difficultyDc: DEFAULT_DIFFICULTY_DC,
  elevationStepCost: 1,
  maxClimbableStep: 2,
  customTerrains: [],
  showCoordinates: false,
  preset: null,
  seed: null,
};

/* ------------------------------------------------------------------ */
/* Mappa                                                              */
/* ------------------------------------------------------------------ */

export interface TacticalMap {
  version: number;
  cells: MapCells;
  objects: MapObject[];
  traps: MapTrap[];
  hazards: MapHazard[];
  areas: MapArea[];
  /** Lettura semantica della mappa: cortile, torre, bosco, ponte. */
  zones: MapZone[];
  /** Ingressi, obiettivi, schieramenti, posizioni dominanti. */
  poi: MapPoi[];
  layers: LayerStates;
  settings: MapSettings;
}

export const EMPTY_TACTICAL_MAP: TacticalMap = {
  version: TACTICAL_MAP_VERSION,
  cells: {},
  objects: [],
  traps: [],
  hazards: [],
  areas: [],
  zones: [],
  poi: [],
  layers: DEFAULT_LAYERS,
  settings: DEFAULT_MAP_SETTINGS,
};

/** Limiti difensivi, applicati anche lato API. */
export const MAP_LIMITS = {
  /** Oltre questo numero di celle scritte il documento si avvicina al MB. */
  maxCells: 12000,
  maxObjects: 400,
  maxTraps: 200,
  maxHazards: 200,
  maxAreas: 100,
  maxZones: 60,
  maxPoi: 60,
  maxCustomTerrains: 40,
  minElevation: -4,
  maxElevation: 8,
  maxNameLength: 80,
  maxTextLength: 600,
  maxCellsPerElement: 400,
} as const;

/* ------------------------------------------------------------------ */
/* Strumenti dell'editor (stato UI, non persistito)                   */
/* ------------------------------------------------------------------ */

/**
 * Strumenti dell'editor tattico. Nessuno di questi disegna: tutti
 * ASSEGNANO significato alle caselle già occupate dall'immagine.
 */
export const EDITOR_TOOLS = [
  "SELECT",
  "PAN",
  "TERRAIN",
  "ELEVATION",
  "BLOCK",
  "ELEMENT",
  "TRAP",
  "HAZARD",
  "AREA",
  "COVER",
  "ERASER",
] as const;
export type EditorTool = (typeof EDITOR_TOOLS)[number];

export const BRUSH_SHAPES = [
  "PENCIL",
  "BRUSH",
  "RECTANGLE",
  "CIRCLE",
  "LINE",
  "FILL",
] as const;
export type BrushShape = (typeof BRUSH_SHAPES)[number];

export const EDITOR_MODES = ["EDIT", "PREVIEW", "TACTICAL", "TEST"] as const;
export type EditorMode = (typeof EDITOR_MODES)[number];
