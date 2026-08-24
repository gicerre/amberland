import type {
  BattleEventType,
  BattleStatus,
  CombatantSide,
  CombatantTurnState,
  DistanceMetric,
  DistanceUnit,
  EnemyCategory,
  EnemyHpDisplay,
  GridKind,
  HealthBand,
  ImageFit,
  TerrainKind,
} from "@/types/battle";

/* ============================================================
 * Costanti condivise del Campo di Battaglia: etichette diegetiche
 * italiane, badge, colori dei token e soglie del motore.
 * Il codice resta in inglese, la UI parla la lingua del regno.
 * ============================================================ */

/* ---------------------------- Battaglia ---------------------------- */

export const BATTLE_STATUS_LABELS: Record<BattleStatus, string> = {
  DRAFT: "Bozza",
  READY: "Pronta",
  LOBBY: "Schieramento",
  ACTIVE: "In corso",
  PAUSED: "Sospesa",
  COMPLETED: "Conclusa",
  ARCHIVED: "Archiviata",
};

export const BATTLE_STATUS_BADGES: Record<BattleStatus, string> = {
  DRAFT: "border-zinc-500/50 bg-zinc-500/10 text-zinc-300",
  READY: "border-sky-500/50 bg-sky-500/10 text-sky-300",
  LOBBY: "border-amber-500/50 bg-amber-500/10 text-amber-300",
  ACTIVE: "border-gold/50 bg-gold/15 text-gold-bright",
  PAUSED: "border-zinc-400/50 bg-zinc-400/10 text-zinc-200",
  COMPLETED: "border-emerald-600/50 bg-emerald-900/25 text-emerald-300",
  ARCHIVED: "border-zinc-600/50 bg-zinc-600/10 text-zinc-400",
};

/** Descrizione narrativa dello stato, per elenchi e pannelli. */
export const BATTLE_STATUS_FLAVOR: Record<BattleStatus, string> = {
  DRAFT: "Il Master sta ancora tracciando il terreno.",
  READY: "Il campo è pronto, il party non è stato convocato.",
  LOBBY: "Le schiere si dispongono: entra e prendi posizione.",
  ACTIVE: "Le armi sono sguainate.",
  PAUSED: "Le lame restano sospese a mezz'aria.",
  COMPLETED: "Lo scontro è concluso: resta la cronaca.",
  ARCHIVED: "Riposta fra le vecchie carte da guerra.",
};

export const BATTLE_STATUS_OPTIONS = (
  Object.keys(BATTLE_STATUS_LABELS) as BattleStatus[]
).map((value) => ({ value, label: BATTLE_STATUS_LABELS[value] }));

/* ----------------------------- Griglia ----------------------------- */

export const GRID_KIND_LABELS: Record<GridKind, string> = {
  SQUARE: "Quadrata",
  HEX: "Esagonale",
};

export const DISTANCE_UNIT_LABELS: Record<DistanceUnit, string> = {
  m: "metri",
  ft: "piedi",
};

/** Simbolo compatto, per etichette sulla mappa ("6 m"). */
export const DISTANCE_UNIT_SHORT: Record<DistanceUnit, string> = {
  m: "m",
  ft: "ft",
};

export const DISTANCE_METRIC_LABELS: Record<DistanceMetric, string> = {
  CHEBYSHEV: "Diagonale semplice (5e)",
  ALTERNATING: "Diagonale alternata (variante DMG)",
  EUCLIDEAN: "Distanza reale",
  MANHATTAN: "Solo ortogonale",
};

export const DISTANCE_METRIC_HINTS: Record<DistanceMetric, string> = {
  CHEBYSHEV: "Muoversi in diagonale costa quanto un passo dritto. Regola base.",
  ALTERNATING: "Una diagonale su due costa il doppio. Più realistica, più lenta.",
  EUCLIDEAN: "Distanza geometrica: utile per raggi e aree circolari.",
  MANHATTAN: "Nessun movimento diagonale.",
};

export const DISTANCE_METRIC_OPTIONS = (
  Object.keys(DISTANCE_METRIC_LABELS) as DistanceMetric[]
).map((value) => ({ value, label: DISTANCE_METRIC_LABELS[value] }));

export const IMAGE_FIT_LABELS: Record<ImageFit, string> = {
  COVER: "Riempi (ritaglia)",
  CONTAIN: "Contieni (bande)",
  STRETCH: "Deforma",
};

/**
 * Lati di cella proposti nel form, nelle due unità.
 * In metri sono le misure ricorrenti dei manuali italiani (1,5 m = 5 ft).
 */
export const CELL_SIZE_PRESETS: Record<DistanceUnit, number[]> = {
  m: [1.5, 3, 6, 9, 12],
  ft: [5, 10, 20, 30, 40],
};

/* ----------------------------- Terreno ----------------------------- */

export const TERRAIN_LABELS: Record<TerrainKind, string> = {
  NORMAL: "Terreno libero",
  DIFFICULT: "Terreno difficile",
  WALL: "Muro",
  HAZARD: "Insidia",
  WATER: "Acqua",
  PIT: "Voragine",
};

/**
 * Moltiplicatore del costo di movimento. `null` = invalicabile.
 * Il motore lo legge da qui: aggiungere un terreno è una riga sola.
 */
export const TERRAIN_COST_MULTIPLIER: Record<TerrainKind, number | null> = {
  NORMAL: 1,
  DIFFICULT: 2,
  WALL: null,
  HAZARD: 1,
  WATER: 2,
  PIT: null,
};

/** Colore di riempimento sulla mappa (sobrio: il terreno non deve urlare). */
export const TERRAIN_FILL: Record<TerrainKind, string> = {
  NORMAL: "transparent",
  DIFFICULT: "rgba(214, 178, 94, 0.10)",
  WALL: "rgba(255, 255, 255, 0.14)",
  HAZARD: "rgba(220, 80, 70, 0.14)",
  WATER: "rgba(90, 150, 210, 0.14)",
  PIT: "rgba(0, 0, 0, 0.45)",
};

/* --------------------------- Combattenti --------------------------- */

export const COMBATANT_SIDE_LABELS: Record<CombatantSide, string> = {
  PC: "Personaggio",
  ENEMY: "Nemico",
  ALLY: "Alleato",
  NEUTRAL: "Neutrale",
};

export const COMBATANT_SIDE_OPTIONS = (
  Object.keys(COMBATANT_SIDE_LABELS) as CombatantSide[]
).map((value) => ({ value, label: COMBATANT_SIDE_LABELS[value] }));

export const ENEMY_CATEGORY_LABELS: Record<EnemyCategory, string> = {
  BOSS: "Boss",
  MINI_BOSS: "Mini Boss",
  ELITE: "Elite",
  STANDARD: "Nemico standard",
  MINION: "Gregario",
  MELEE: "Mischia",
  RANGED: "Distanza",
  MAGIC: "Magia",
  SUPPORT: "Supporto",
  BEAST: "Bestia",
  SUMMON: "Evocazione",
};

export const ENEMY_CATEGORY_OPTIONS = (
  Object.keys(ENEMY_CATEGORY_LABELS) as EnemyCategory[]
).map((value) => ({ value, label: ENEMY_CATEGORY_LABELS[value] }));

/**
 * Colore d'anello del token per categoria — usato anche dal placeholder
 * generato quando il Master non carica un'immagine. Tinte fredde e
 * desaturate: il campo resta leggibile, l'oro resta al combattente attivo.
 */
export const ENEMY_CATEGORY_ACCENT: Record<EnemyCategory, string> = {
  BOSS: "#c0453c",
  MINI_BOSS: "#c9704a",
  ELITE: "#b98cd0",
  STANDARD: "#8a8f9c",
  MINION: "#6e747f",
  MELEE: "#c98a5a",
  RANGED: "#5fa06a",
  MAGIC: "#7b7fd4",
  SUPPORT: "#4fa3a8",
  BEAST: "#9a7a4f",
  SUMMON: "#8f6fb0",
};

/** Colore d'anello per fazione, quando la categoria non si applica. */
export const COMBATANT_SIDE_ACCENT: Record<CombatantSide, string> = {
  PC: "#d6b25e",
  ENEMY: "#c0453c",
  ALLY: "#5fa06a",
  NEUTRAL: "#8a8f9c",
};

export const COMBATANT_TURN_STATE_LABELS: Record<CombatantTurnState, string> = {
  WAITING: "In attesa",
  ACTIVE: "Di turno",
  COMPLETED: "Turno concluso",
  SKIPPED: "Turno saltato",
  DEAD: "Fuori combattimento",
  REMOVED: "Rimosso dal campo",
};

/** Stati che non prendono più turni finché il Master non interviene. */
export const INACTIVE_TURN_STATES: CombatantTurnState[] = ["DEAD", "REMOVED"];

/* ------------------------------ Salute ----------------------------- */

export const HEALTH_BAND_LABELS: Record<HealthBand, string> = {
  UNHARMED: "Illeso",
  BRUISED: "Graffiato",
  WOUNDED: "Ferito",
  BLOODIED: "Sanguinante",
  CRITICAL: "In fin di vita",
  DOWN: "A terra",
};

export const HEALTH_BAND_CLASSES: Record<HealthBand, string> = {
  UNHARMED: "text-emerald-300",
  BRUISED: "text-emerald-200",
  WOUNDED: "text-amber-300",
  BLOODIED: "text-orange-300",
  CRITICAL: "text-red-300",
  DOWN: "text-zinc-400",
};

/**
 * Soglie (rapporto HP correnti/massimi) usate per derivare la fascia.
 * Ordinate dalla più alta: la prima soglia raggiunta vince.
 */
export const HEALTH_BAND_THRESHOLDS: { min: number; band: HealthBand }[] = [
  { min: 1, band: "UNHARMED" },
  { min: 0.75, band: "BRUISED" },
  { min: 0.5, band: "WOUNDED" },
  { min: 0.25, band: "BLOODIED" },
  { min: 0.0001, band: "CRITICAL" },
  { min: 0, band: "DOWN" },
];

export const ENEMY_HP_DISPLAY_LABELS: Record<EnemyHpDisplay, string> = {
  HIDDEN: "Nulla",
  BAND: "Solo condizione ('gravemente ferito')",
  BAR: "Barra senza numeri",
  EXACT: "HP numerici",
};

export const ENEMY_HP_DISPLAY_OPTIONS = (
  Object.keys(ENEMY_HP_DISPLAY_LABELS) as EnemyHpDisplay[]
).map((value) => ({ value, label: ENEMY_HP_DISPLAY_LABELS[value] }));

/* ------------------------------ Cronaca ---------------------------- */

export const BATTLE_EVENT_LABELS: Record<BattleEventType, string> = {
  BATTLE_CREATED: "Campo tracciato",
  BATTLE_PUBLISHED: "Battaglia annunciata",
  BATTLE_STARTED: "Scontro iniziato",
  BATTLE_PAUSED: "Scontro sospeso",
  BATTLE_RESUMED: "Scontro ripreso",
  BATTLE_ENDED: "Scontro concluso",
  COMBATANT_ADDED: "Nuovo combattente",
  COMBATANT_REMOVED: "Combattente rimosso",
  COMBATANT_JOINED: "Ingresso nel campo",
  COMBATANT_MOVED: "Movimento",
  COMBATANT_DAMAGED: "Danno",
  COMBATANT_HEALED: "Cura",
  COMBATANT_DIED: "Caduto",
  COMBATANT_REVIVED: "Rialzato",
  CONDITION_ADDED: "Condizione applicata",
  CONDITION_REMOVED: "Condizione rimossa",
  INITIATIVE_SET: "Iniziativa dichiarata",
  ORDER_CHANGED: "Ordine modificato",
  TURN_STARTED: "Inizio turno",
  TURN_ENDED: "Fine turno",
  TURN_SKIPPED: "Turno saltato",
  ROUND_ADVANCED: "Nuova tornata",
  MASTER_UNDO: "Azione annullata",
};

/* ---------------------- Palette dei duplicati ---------------------- */

/**
 * Ciclata quando il Master crea più copie dello stesso nemico
 * (Goblin A, B, C…): otto tinte distinguibili anche a token piccolo.
 */
export const DUPLICATE_ACCENTS = [
  "#c0453c",
  "#c98a5a",
  "#b8a44e",
  "#5fa06a",
  "#4fa3a8",
  "#5b86c4",
  "#8f6fb0",
  "#b96f92",
] as const;

/** Suffissi dei duplicati: A…Z, poi AA, AB… */
export function duplicateSuffix(index: number): string {
  let value = index;
  let out = "";
  do {
    out = String.fromCharCode(65 + (value % 26)) + out;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);
  return out;
}

/* ------------------------------ Viewport --------------------------- */

/** Limiti di zoom del campo: sotto 0.25 è illeggibile, sopra 4 è inutile. */
export const ZOOM_MIN = 0.25;
export const ZOOM_MAX = 4;
export const ZOOM_STEP = 0.15;
