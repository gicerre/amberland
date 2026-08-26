import {
  DEFAULT_DIFFICULTY_DC,
  type DifficultyTable,
  type DifficultyTier,
  type TacticalCheck,
  type TerrainDefinition,
  type TerrainId,
} from "@/types/battlemap";

/* ============================================================
 * Libreria dei terreni.
 *
 * Un terreno è un pacchetto di REGOLE, non un colore: costo di
 * movimento, prova richiesta, linea di vista. La UI ne legge le
 * proprietà, il motore di movimento ne legge i costi — nessuno dei due
 * conosce i valori a memoria.
 * ============================================================ */

/** CD per grado di difficoltà, con la tabella della mappa se fornita. */
export function dcFor(
  tier: DifficultyTier,
  table: DifficultyTable = DEFAULT_DIFFICULTY_DC,
  custom = 12
): number {
  return tier === "CUSTOM" ? custom : table[tier];
}

export const DIFFICULTY_LABELS: Record<DifficultyTier, string> = {
  EASY: "Facile",
  MEDIUM: "Media",
  HARD: "Difficile",
  VERY_HARD: "Molto difficile",
  EXTREME: "Estrema",
  CUSTOM: "Personalizzata",
};

/** Abilità proposte nei menù delle prove (nomenclatura italiana 5e). */
export const CHECK_SKILLS = [
  "Atletica",
  "Acrobazia",
  "Furtività",
  "Percezione",
  "Indagare",
  "Sopravvivenza",
  "Rapidità di Mano",
  "Arcano",
  "Costituzione",
  "Destrezza",
  "Forza",
  "Saggezza",
] as const;

const check = (
  skill: string,
  difficulty: DifficultyTier,
  table: DifficultyTable = DEFAULT_DIFFICULTY_DC
): TacticalCheck => ({ skill, difficulty, dc: dcFor(difficulty, table) });

/**
 * I 19 terreni di base. `movementCost` è un MOLTIPLICATORE del lato
 * cella: 2 significa "terreno difficile", `null` invalicabile.
 */
export const TERRAIN_LIBRARY: TerrainDefinition[] = [
  {
    id: "NORMAL",
    label: "Terreno normale",
    category: "GROUND",
    movementCost: 1,
    difficult: false,
    color: "transparent",
    pattern: "none",
    check: null,
    blocksSight: false,
    description: "Suolo battuto, nessun impedimento.",
  },
  {
    id: "DIFFICULT",
    label: "Terreno difficile",
    category: "GROUND",
    movementCost: 2,
    difficult: true,
    color: "rgba(214, 178, 94, 0.16)",
    pattern: "dots",
    check: null,
    blocksSight: false,
    description: "Ogni cella costa il doppio del movimento.",
  },
  {
    id: "GRASS",
    label: "Erba",
    category: "NATURE",
    movementCost: 1,
    difficult: false,
    color: "rgba(95, 160, 106, 0.16)",
    pattern: "none",
    check: null,
    blocksSight: false,
    description: "Prato aperto: nessun ostacolo al passo.",
  },
  {
    id: "TALL_GRASS",
    label: "Erba alta",
    category: "NATURE",
    movementCost: 2,
    difficult: true,
    color: "rgba(95, 160, 106, 0.3)",
    pattern: "lines",
    check: check("Furtività", "EASY"),
    blocksSight: false,
    description: "Rallenta il passo ma offre riparo a chi si acquatta.",
  },
  {
    id: "FOREST",
    label: "Foresta",
    category: "NATURE",
    movementCost: 2,
    difficult: true,
    color: "rgba(60, 110, 75, 0.34)",
    pattern: "dots",
    check: null,
    blocksSight: true,
    description: "Tronchi fitti: movimento dimezzato e vista interrotta.",
  },
  {
    id: "MUD",
    label: "Fango",
    category: "GROUND",
    movementCost: 2,
    difficult: true,
    color: "rgba(120, 90, 60, 0.34)",
    pattern: "waves",
    check: check("Atletica", "MEDIUM"),
    blocksSight: false,
    description: "Il movimento costa il doppio; chi corre rischia di scivolare.",
  },
  {
    id: "SAND",
    label: "Sabbia",
    category: "GROUND",
    movementCost: 2,
    difficult: true,
    color: "rgba(205, 180, 120, 0.26)",
    pattern: "dots",
    check: null,
    blocksSight: false,
    description: "Cede sotto i piedi: passo lento e faticoso.",
  },
  {
    id: "SNOW",
    label: "Neve",
    category: "NATURE",
    movementCost: 2,
    difficult: true,
    color: "rgba(225, 235, 245, 0.24)",
    pattern: "dots",
    check: null,
    blocksSight: false,
    description: "Ogni passo affonda: terreno difficile e tracce evidenti.",
  },
  {
    id: "ICE",
    label: "Ghiaccio",
    category: "HAZARD",
    movementCost: 2,
    difficult: true,
    color: "rgba(150, 205, 230, 0.26)",
    pattern: "cracks",
    check: check("Acrobazia", "MEDIUM"),
    blocksSight: false,
    description: "Superficie scivolosa: fallire la prova significa cadere proni.",
  },
  {
    id: "ROCK",
    label: "Roccia",
    category: "GROUND",
    movementCost: 1,
    difficult: false,
    color: "rgba(140, 145, 155, 0.22)",
    pattern: "none",
    check: null,
    blocksSight: false,
    description: "Pietra nuda e solida.",
  },
  {
    id: "RUBBLE",
    label: "Macerie",
    category: "GROUND",
    movementCost: 2,
    difficult: true,
    color: "rgba(150, 140, 125, 0.3)",
    pattern: "cracks",
    check: check("Acrobazia", "EASY"),
    blocksSight: false,
    description: "Pietrame instabile: rallenta e offre mezza copertura.",
  },
  {
    id: "SWAMP",
    label: "Palude",
    category: "WATER",
    movementCost: 3,
    difficult: true,
    color: "rgba(90, 110, 80, 0.36)",
    pattern: "waves",
    check: check("Atletica", "HARD"),
    blocksSight: false,
    description: "Acqua stagnante e melma: ogni cella costa tre volte tanto.",
  },
  {
    id: "SHALLOW_WATER",
    label: "Acqua bassa",
    category: "WATER",
    movementCost: 2,
    difficult: true,
    color: "rgba(90, 150, 210, 0.24)",
    pattern: "waves",
    check: null,
    blocksSight: false,
    description: "Fino al ginocchio: terreno difficile, nessun rischio.",
  },
  {
    id: "DEEP_WATER",
    label: "Acqua profonda",
    category: "WATER",
    movementCost: 3,
    difficult: true,
    color: "rgba(50, 100, 175, 0.44)",
    pattern: "waves",
    check: check("Atletica", "MEDIUM"),
    blocksSight: false,
    description: "Si procede a nuoto: serve una prova per attraversarla in fretta.",
  },
  {
    id: "LAVA",
    label: "Lava",
    category: "HAZARD",
    movementCost: null,
    difficult: true,
    color: "rgba(200, 70, 40, 0.55)",
    pattern: "waves",
    check: null,
    blocksSight: false,
    description: "Invalicabile. Chi vi finisce dentro subisce danni ingenti.",
  },
  {
    id: "ASH",
    label: "Cenere",
    category: "HAZARD",
    movementCost: 2,
    difficult: true,
    color: "rgba(90, 88, 92, 0.34)",
    pattern: "dots",
    check: check("Costituzione", "EASY"),
    blocksSight: false,
    description: "Nuvole di cenere: passo lento e aria irrespirabile.",
  },
  {
    id: "UNSTABLE",
    label: "Terreno instabile",
    category: "HAZARD",
    movementCost: 2,
    difficult: true,
    color: "rgba(190, 130, 60, 0.3)",
    pattern: "cracks",
    check: check("Acrobazia", "HARD"),
    blocksSight: false,
    description: "Può cedere: chi vi si ferma rischia di sprofondare.",
  },
  {
    id: "MAGICAL",
    label: "Terreno magico",
    category: "SPECIAL",
    movementCost: 1,
    difficult: false,
    color: "rgba(140, 110, 210, 0.28)",
    pattern: "dots",
    check: check("Arcano", "MEDIUM"),
    blocksSight: false,
    description: "Trame arcane affiorano dal suolo: effetti a discrezione del Master.",
  },
  {
    id: "CORRUPTED",
    label: "Terreno contaminato",
    category: "SPECIAL",
    movementCost: 2,
    difficult: true,
    color: "rgba(120, 60, 110, 0.32)",
    pattern: "cracks",
    check: check("Costituzione", "MEDIUM"),
    blocksSight: false,
    description: "Suolo corrotto: chi lo attraversa rischia di ammalarsi.",
  },
  {
    id: "WALL",
    label: "Muro",
    category: "GROUND",
    movementCost: null,
    difficult: false,
    color: "rgba(235, 235, 240, 0.2)",
    pattern: "none",
    check: null,
    blocksSight: true,
    description: "Pietra piena: invalicabile e opaca alla vista.",
  },
  {
    id: "PIT",
    label: "Voragine",
    category: "HAZARD",
    movementCost: null,
    difficult: false,
    color: "rgba(0, 0, 0, 0.5)",
    pattern: "none",
    check: null,
    blocksSight: false,
    description: "Il vuoto: nessuno vi cammina sopra.",
  },
];

const BY_ID = new Map(TERRAIN_LIBRARY.map((terrain) => [terrain.id, terrain]));

/** Definizione di un terreno, comprese quelle create dal Master. */
export function terrainById(
  id: TerrainId,
  custom: TerrainDefinition[] = []
): TerrainDefinition {
  return (
    custom.find((terrain) => terrain.id === id) ??
    BY_ID.get(id) ??
    BY_ID.get("NORMAL")!
  );
}

/** Tutti i terreni disponibili su una mappa (base + personalizzati). */
export function allTerrains(
  custom: TerrainDefinition[] = []
): TerrainDefinition[] {
  return [...TERRAIN_LIBRARY, ...custom];
}

export const TERRAIN_CATEGORY_LABELS: Record<string, string> = {
  GROUND: "Suolo",
  NATURE: "Natura",
  WATER: "Acque",
  HAZARD: "Pericoli",
  SPECIAL: "Arcano",
};

/**
 * Ponte con il modello legacy: `Battle.terrain` conosce sei tipi, la
 * libreria ne conosce venti. La proiezione serve a non rompere ciò che
 * legge ancora il campo vecchio (motore di movimento incluso).
 */
export const LEGACY_TERRAIN_MAP: Record<TerrainId, string> = {
  NORMAL: "NORMAL",
  DIFFICULT: "DIFFICULT",
  GRASS: "NORMAL",
  TALL_GRASS: "DIFFICULT",
  FOREST: "DIFFICULT",
  MUD: "DIFFICULT",
  SAND: "DIFFICULT",
  SNOW: "DIFFICULT",
  ICE: "DIFFICULT",
  ROCK: "NORMAL",
  RUBBLE: "DIFFICULT",
  SWAMP: "DIFFICULT",
  SHALLOW_WATER: "WATER",
  DEEP_WATER: "WATER",
  LAVA: "HAZARD",
  ASH: "DIFFICULT",
  UNSTABLE: "DIFFICULT",
  MAGICAL: "NORMAL",
  CORRUPTED: "DIFFICULT",
  WALL: "WALL",
  PIT: "PIT",
};
