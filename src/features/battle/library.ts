import {
  DEFAULT_DIFFICULTY_DC,
  type CoverLevel,
  type DifficultyTier,
  type HazardKind,
  type MapHazard,
  type MapObject,
  type MapObjectKind,
  type MapTrap,
  type ObjectState,
  type TacticalCheck,
  type TrapReset,
  type TrapTrigger,
} from "@/types/battlemap";

/* ============================================================
 * Catalogo di oggetti, trappole e pericoli.
 *
 * Ogni voce è un MODELLO: il Master lo trascina sulla mappa e ottiene un
 * elemento già configurato secondo le regole (copertura, HP, CD), che
 * resta libero di modificare. Le icone vengono da lucide-react per nome:
 * nessuna emoji nell'interfaccia, come da Constitution.
 * ============================================================ */

export const COVER_LABELS: Record<CoverLevel, string> = {
  NONE: "Nessuna",
  HALF: "Mezza copertura",
  THREE_QUARTERS: "Tre quarti",
  TOTAL: "Totale",
};

/** Bonus a CA e TS per grado di copertura (regole 5e). */
export const COVER_BONUS: Record<CoverLevel, number> = {
  NONE: 0,
  HALF: 2,
  THREE_QUARTERS: 5,
  TOTAL: 0,
};

export const OBJECT_KIND_LABELS: Record<MapObjectKind, string> = {
  OBSTACLE: "Ostacolo",
  WALL: "Muro",
  DOOR: "Porta",
  SECRET_DOOR: "Porta segreta",
  LEVER: "Leva",
  HATCH: "Botola",
  BRIDGE: "Ponte",
  STAIRS: "Scala",
  CONTAINER: "Contenitore",
  DECOR: "Scenografia",
};

export const OBJECT_STATE_LABELS: Record<ObjectState, string> = {
  OPEN: "Aperta",
  CLOSED: "Chiusa",
  LOCKED: "Bloccata",
  HIDDEN: "Nascosta",
  ON: "Attivata",
  OFF: "Disattivata",
  BROKEN: "Distrutta",
  NONE: "—",
};

export const TRAP_TRIGGER_LABELS: Record<TrapTrigger, string> = {
  ENTER: "Quando una creatura entra nella cella",
  EXIT: "Quando una creatura lascia la cella",
  PROXIMITY: "Quando qualcuno si avvicina",
  INTERACT: "Quando l'oggetto viene toccato",
  WEIGHT: "Sotto il peso di una creatura",
  TIMER: "Allo scadere di un tempo",
  MANUAL: "Solo su decisione del Master",
};

export const TRAP_RESET_LABELS: Record<TrapReset, string> = {
  NONE: "Non si riarma",
  MANUAL: "Riarmo manuale",
  AUTOMATIC: "Riarmo automatico",
  ROUND: "Si riarma a ogni round",
};

export const HAZARD_LABELS: Record<HazardKind, string> = {
  FIRE: "Fuoco",
  LAVA: "Lava",
  GAS: "Gas",
  POISON: "Veleno",
  ICE: "Ghiaccio",
  CURRENT: "Corrente",
  UNSTABLE: "Crollo",
  ARCANE: "Energia arcana",
  DARKNESS: "Oscurità",
  FOG: "Nebbia",
  WIND: "Vento",
  LIGHTNING: "Fulmini",
};

const check = (skill: string, difficulty: DifficultyTier): TacticalCheck => ({
  skill,
  difficulty,
  dc:
    difficulty === "CUSTOM"
      ? 12
      : DEFAULT_DIFFICULTY_DC[difficulty],
});

/* ------------------------------------------------------------------ */
/* Oggetti                                                            */
/* ------------------------------------------------------------------ */

export const OBJECT_CATEGORIES = [
  "NATURE",
  "ARCHITECTURE",
  "DUNGEON",
  "BATTLEFIELD",
] as const;
export type ObjectCategory = (typeof OBJECT_CATEGORIES)[number];

export const OBJECT_CATEGORY_LABELS: Record<ObjectCategory, string> = {
  NATURE: "Natura",
  ARCHITECTURE: "Architettura",
  DUNGEON: "Sotterranei",
  BATTLEFIELD: "Campo di battaglia",
};

/** Modello di oggetto: tutto ciò che serve a crearne uno già corretto. */
export interface ObjectTemplate {
  id: string;
  label: string;
  category: ObjectCategory;
  kind: MapObjectKind;
  icon: string;
  color: string;
  blocksMovement: boolean;
  blocksSight: boolean;
  cover: CoverLevel;
  /** Altezza in metri: conta per copertura e arrampicata. */
  height: number;
  destructible: boolean;
  hp: number;
  armorClass: number;
  material: string;
  state: ObjectState;
  /** Celle occupate di default (lato del quadrato). */
  span: number;
  keywords: string[];
}

export const OBJECT_LIBRARY: ObjectTemplate[] = [
  // ------------------------------- Natura
  { id: "tree", label: "Albero", category: "NATURE", kind: "OBSTACLE", icon: "TreePine", color: "#3f7a4f", blocksMovement: true, blocksSight: true, cover: "THREE_QUARTERS", height: 6, destructible: true, hp: 40, armorClass: 13, material: "Legno", state: "NONE", span: 1, keywords: ["bosco", "pianta"] },
  { id: "bush", label: "Cespuglio", category: "NATURE", kind: "DECOR", icon: "Shrub", color: "#4f8a5c", blocksMovement: false, blocksSight: true, cover: "HALF", height: 1.5, destructible: true, hp: 10, armorClass: 10, material: "Fogliame", state: "NONE", span: 1, keywords: ["arbusto"] },
  { id: "boulder", label: "Masso", category: "NATURE", kind: "OBSTACLE", icon: "Mountain", color: "#8a8f9c", blocksMovement: true, blocksSight: true, cover: "TOTAL", height: 2.5, destructible: false, hp: 60, armorClass: 17, material: "Pietra", state: "NONE", span: 1, keywords: ["roccia", "pietra"] },
  { id: "log", label: "Tronco caduto", category: "NATURE", kind: "OBSTACLE", icon: "Logs", color: "#7a5c3a", blocksMovement: false, blocksSight: false, cover: "HALF", height: 1, destructible: true, hp: 20, armorClass: 12, material: "Legno", state: "NONE", span: 2, keywords: ["albero"] },
  // --------------------------- Architettura
  { id: "wall", label: "Muro", category: "ARCHITECTURE", kind: "WALL", icon: "BrickWall", color: "#9aa0ad", blocksMovement: true, blocksSight: true, cover: "TOTAL", height: 4, destructible: true, hp: 80, armorClass: 17, material: "Pietra", state: "NONE", span: 1, keywords: ["mura", "parete"] },
  { id: "door", label: "Porta", category: "ARCHITECTURE", kind: "DOOR", icon: "DoorClosed", color: "#b58a52", blocksMovement: true, blocksSight: true, cover: "TOTAL", height: 2.5, destructible: true, hp: 25, armorClass: 15, material: "Legno", state: "CLOSED", span: 1, keywords: ["ingresso", "uscio"] },
  { id: "secret-door", label: "Porta segreta", category: "ARCHITECTURE", kind: "SECRET_DOOR", icon: "DoorOpen", color: "#8f6fb0", blocksMovement: true, blocksSight: true, cover: "TOTAL", height: 2.5, destructible: true, hp: 30, armorClass: 16, material: "Pietra", state: "HIDDEN", span: 1, keywords: ["nascosta", "passaggio"] },
  { id: "window", label: "Finestra", category: "ARCHITECTURE", kind: "DECOR", icon: "AppWindow", color: "#7fa8c4", blocksMovement: true, blocksSight: false, cover: "THREE_QUARTERS", height: 2, destructible: true, hp: 8, armorClass: 12, material: "Vetro", state: "CLOSED", span: 1, keywords: ["vetrata"] },
  { id: "column", label: "Colonna", category: "ARCHITECTURE", kind: "OBSTACLE", icon: "Columns3", color: "#c2c6ce", blocksMovement: true, blocksSight: true, cover: "THREE_QUARTERS", height: 5, destructible: true, hp: 50, armorClass: 17, material: "Marmo", state: "NONE", span: 1, keywords: ["pilastro"] },
  { id: "stairs", label: "Scala", category: "ARCHITECTURE", kind: "STAIRS", icon: "Footprints", color: "#a8905f", blocksMovement: false, blocksSight: false, cover: "NONE", height: 0, destructible: false, hp: 0, armorClass: 0, material: "Pietra", state: "NONE", span: 2, keywords: ["gradini", "dislivello"] },
  { id: "bridge", label: "Ponte", category: "ARCHITECTURE", kind: "BRIDGE", icon: "Cable", color: "#9c7a4d", blocksMovement: false, blocksSight: false, cover: "NONE", height: 0, destructible: true, hp: 40, armorClass: 13, material: "Legno", state: "NONE", span: 3, keywords: ["passerella", "attraversamento"] },
  // ------------------------------ Dungeon
  { id: "sarcophagus", label: "Sarcofago", category: "DUNGEON", kind: "CONTAINER", icon: "Package", color: "#a09577", blocksMovement: true, blocksSight: false, cover: "HALF", height: 1.2, destructible: true, hp: 35, armorClass: 15, material: "Pietra", state: "CLOSED", span: 1, keywords: ["tomba", "bara"] },
  { id: "altar", label: "Altare", category: "DUNGEON", kind: "DECOR", icon: "Flame", color: "#b58fd0", blocksMovement: true, blocksSight: false, cover: "HALF", height: 1.2, destructible: true, hp: 40, armorClass: 15, material: "Pietra", state: "NONE", span: 1, keywords: ["rito", "tempio"] },
  { id: "grate", label: "Grata", category: "DUNGEON", kind: "DECOR", icon: "Grid2x2", color: "#7f8794", blocksMovement: true, blocksSight: false, cover: "HALF", height: 1, destructible: true, hp: 20, armorClass: 15, material: "Ferro", state: "CLOSED", span: 1, keywords: ["ferro", "sbarre"] },
  { id: "hatch", label: "Botola", category: "DUNGEON", kind: "HATCH", icon: "SquareDashedBottom", color: "#8d7350", blocksMovement: false, blocksSight: false, cover: "NONE", height: 0, destructible: true, hp: 15, armorClass: 13, material: "Legno", state: "CLOSED", span: 1, keywords: ["passaggio", "sotto"] },
  { id: "lever", label: "Leva", category: "DUNGEON", kind: "LEVER", icon: "ToggleLeft", color: "#c9a227", blocksMovement: false, blocksSight: false, cover: "NONE", height: 1, destructible: true, hp: 8, armorClass: 12, material: "Ferro", state: "OFF", span: 1, keywords: ["meccanismo", "interruttore"] },
  { id: "chest", label: "Scrigno", category: "DUNGEON", kind: "CONTAINER", icon: "Box", color: "#a5793f", blocksMovement: false, blocksSight: false, cover: "NONE", height: 0.8, destructible: true, hp: 15, armorClass: 13, material: "Legno", state: "CLOSED", span: 1, keywords: ["tesoro", "bottino"] },
  // -------------------------- Campo di battaglia
  { id: "barricade", label: "Barricata", category: "BATTLEFIELD", kind: "OBSTACLE", icon: "Fence", color: "#8a6b45", blocksMovement: true, blocksSight: false, cover: "HALF", height: 1.5, destructible: true, hp: 30, armorClass: 13, material: "Legno", state: "NONE", span: 2, keywords: ["riparo", "difesa"] },
  { id: "debris", label: "Macerie", category: "BATTLEFIELD", kind: "OBSTACLE", icon: "Blocks", color: "#948a7c", blocksMovement: false, blocksSight: false, cover: "HALF", height: 1, destructible: false, hp: 0, armorClass: 0, material: "Pietrame", state: "NONE", span: 2, keywords: ["rovine", "detriti"] },
  { id: "cart", label: "Carro", category: "BATTLEFIELD", kind: "OBSTACLE", icon: "Truck", color: "#96703f", blocksMovement: true, blocksSight: true, cover: "THREE_QUARTERS", height: 2, destructible: true, hp: 35, armorClass: 13, material: "Legno", state: "NONE", span: 2, keywords: ["carretto", "convoglio"] },
  { id: "tent", label: "Tenda", category: "BATTLEFIELD", kind: "DECOR", icon: "Tent", color: "#a3603f", blocksMovement: true, blocksSight: true, cover: "TOTAL", height: 2.5, destructible: true, hp: 15, armorClass: 11, material: "Tela", state: "NONE", span: 2, keywords: ["accampamento"] },
  { id: "ballista", label: "Balista", category: "BATTLEFIELD", kind: "OBSTACLE", icon: "Crosshair", color: "#8b5a3c", blocksMovement: true, blocksSight: false, cover: "HALF", height: 2, destructible: true, hp: 50, armorClass: 15, material: "Legno e ferro", state: "NONE", span: 2, keywords: ["assedio", "arma"] },
  { id: "wreck", label: "Relitto", category: "BATTLEFIELD", kind: "OBSTACLE", icon: "Ship", color: "#6f7c86", blocksMovement: true, blocksSight: true, cover: "THREE_QUARTERS", height: 3, destructible: false, hp: 0, armorClass: 0, material: "Legno marcio", state: "NONE", span: 3, keywords: ["nave", "rovina"] },
];

/** Prove predefinite per tipo di oggetto: porte e segreti non nascono nudi. */
export function defaultChecksFor(kind: MapObjectKind) {
  switch (kind) {
    case "DOOR":
      return {
        lockpick: check("Rapidità di Mano", "MEDIUM"),
        force: check("Atletica", "HARD"),
      };
    case "SECRET_DOOR":
      return {
        perception: check("Percezione", "HARD"),
        investigation: check("Indagare", "MEDIUM"),
      };
    case "HATCH":
      return { force: check("Atletica", "EASY") };
    case "CONTAINER":
      return { lockpick: check("Rapidità di Mano", "MEDIUM") };
    default:
      return {};
  }
}

/** Oggetto pronto da inserire, generato dal modello. */
export function objectFromTemplate(
  template: ObjectTemplate,
  id: string,
  cells: string[]
): MapObject {
  return {
    id,
    kind: template.kind,
    name: template.label,
    cells,
    icon: template.icon,
    color: template.color,
    blocksMovement: template.blocksMovement,
    blocksSight: template.blocksSight,
    cover: template.cover,
    height: template.height,
    destructible: template.destructible,
    hp: template.hp,
    armorClass: template.armorClass,
    material: template.material,
    state: template.state,
    checks: defaultChecksFor(template.kind),
    linkedIds: [],
    connectsElevation:
      template.kind === "STAIRS" ? { from: 0, to: 1 } : null,
    visibleToPlayers: template.kind !== "SECRET_DOOR",
    note: "",
  };
}

/* ------------------------------------------------------------------ */
/* Trappole                                                           */
/* ------------------------------------------------------------------ */

export interface TrapTemplate {
  id: string;
  label: string;
  description: string;
  perception: TacticalCheck;
  investigation: TacticalCheck | null;
  disarm: TacticalCheck;
  save: { ability: string; dc: number } | null;
  damage: string;
  damageType: string;
  effect: string;
  trigger: TrapTrigger;
  reset: TrapReset;
}

export const TRAP_LIBRARY: TrapTemplate[] = [
  {
    id: "spiked-pit",
    label: "Fossa con spuntoni",
    description: "Una botola coperta di frasche nasconde tre metri di vuoto e punte di ferro.",
    perception: check("Percezione", "HARD"),
    investigation: check("Indagare", "MEDIUM"),
    disarm: check("Rapidità di Mano", "MEDIUM"),
    save: { ability: "Destrezza", dc: 14 },
    damage: "2d6",
    damageType: "Perforante",
    effect: "Prono",
    trigger: "ENTER",
    reset: "MANUAL",
  },
  {
    id: "dart-wall",
    label: "Muro di dardi",
    description: "Fori nella parete scagliano dardi avvelenati su chi calpesta la piastra.",
    perception: check("Percezione", "MEDIUM"),
    investigation: check("Indagare", "MEDIUM"),
    disarm: check("Rapidità di Mano", "HARD"),
    save: { ability: "Destrezza", dc: 12 },
    damage: "1d4+2",
    damageType: "Veleno",
    effect: "Avvelenato",
    trigger: "WEIGHT",
    reset: "AUTOMATIC",
  },
  {
    id: "blade-scythe",
    label: "Falce a pendolo",
    description: "Una lama curva scende dal soffitto lungo tutta la sala.",
    perception: check("Percezione", "MEDIUM"),
    investigation: null,
    disarm: check("Rapidità di Mano", "HARD"),
    save: { ability: "Destrezza", dc: 15 },
    damage: "2d10",
    damageType: "Tagliente",
    effect: "",
    trigger: "ENTER",
    reset: "ROUND",
  },
  {
    id: "fire-glyph",
    label: "Glifo di fuoco",
    description: "Una runa incandescente esplode quando qualcuno la oltrepassa.",
    perception: check("Arcano", "HARD"),
    investigation: check("Arcano", "HARD"),
    disarm: check("Arcano", "VERY_HARD"),
    save: { ability: "Destrezza", dc: 15 },
    damage: "3d6",
    damageType: "Fuoco",
    effect: "",
    trigger: "PROXIMITY",
    reset: "NONE",
  },
  {
    id: "net-trap",
    label: "Rete",
    description: "Una rete pesante cala dall'alto e immobilizza chi vi finisce sotto.",
    perception: check("Percezione", "EASY"),
    investigation: null,
    disarm: check("Rapidità di Mano", "EASY"),
    save: { ability: "Destrezza", dc: 12 },
    damage: "",
    damageType: "",
    effect: "Trattenuto",
    trigger: "ENTER",
    reset: "MANUAL",
  },
  {
    id: "collapsing-floor",
    label: "Pavimento cedevole",
    description: "Le assi marce cedono sotto il peso di una creatura.",
    perception: check("Percezione", "MEDIUM"),
    investigation: check("Indagare", "EASY"),
    disarm: check("Atletica", "MEDIUM"),
    save: { ability: "Destrezza", dc: 13 },
    damage: "1d6",
    damageType: "Contundente",
    effect: "Prono",
    trigger: "WEIGHT",
    reset: "NONE",
  },
];

export function trapFromTemplate(
  template: TrapTemplate,
  id: string,
  cells: string[]
): MapTrap {
  return {
    id,
    name: template.label,
    type: template.id,
    description: template.description,
    cells,
    hidden: true,
    armed: true,
    perception: template.perception,
    investigation: template.investigation,
    disarm: template.disarm,
    save: template.save,
    damage: template.damage,
    damageType: template.damageType,
    effect: template.effect,
    trigger: template.trigger,
    reset: template.reset,
    note: "",
  };
}

/* ------------------------------------------------------------------ */
/* Pericoli                                                           */
/* ------------------------------------------------------------------ */

export interface HazardTemplate {
  kind: HazardKind;
  label: string;
  description: string;
  color: string;
  recurring: boolean;
  save: { ability: string; dc: number } | null;
  damage: string;
  damageType: string;
  effect: string;
}

export const HAZARD_LIBRARY: HazardTemplate[] = [
  { kind: "FIRE", label: "Incendio", description: "Fiamme che divorano tutto ciò che toccano.", color: "#d4622f", recurring: true, save: { ability: "Destrezza", dc: 12 }, damage: "1d10", damageType: "Fuoco", effect: "" },
  { kind: "LAVA", label: "Colata di lava", description: "Roccia fusa: pochi secondi bastano a uccidere.", color: "#c0452c", recurring: true, save: null, damage: "10d10", damageType: "Fuoco", effect: "" },
  { kind: "GAS", label: "Gas soffocante", description: "Vapori densi che riempiono i polmoni.", color: "#9aa86c", recurring: true, save: { ability: "Costituzione", dc: 13 }, damage: "", damageType: "", effect: "Avvelenato" },
  { kind: "POISON", label: "Nube velenosa", description: "Spore tossiche sospese nell'aria.", color: "#7fa04f", recurring: true, save: { ability: "Costituzione", dc: 14 }, damage: "2d6", damageType: "Veleno", effect: "Avvelenato" },
  { kind: "ICE", label: "Gelo", description: "Freddo pungente che intorpidisce le membra.", color: "#8fc7e0", recurring: true, save: { ability: "Costituzione", dc: 12 }, damage: "1d6", damageType: "Freddo", effect: "" },
  { kind: "CURRENT", label: "Corrente", description: "L'acqua trascina chi non resiste.", color: "#4f8fc4", recurring: true, save: { ability: "Atletica", dc: 13 }, damage: "", damageType: "", effect: "Trascinato di 3 m" },
  { kind: "UNSTABLE", label: "Crollo imminente", description: "Il soffitto cede a pezzi.", color: "#b07f3f", recurring: false, save: { ability: "Destrezza", dc: 15 }, damage: "3d6", damageType: "Contundente", effect: "Prono" },
  { kind: "ARCANE", label: "Energia arcana", description: "Scariche di magia grezza attraversano la zona.", color: "#8f6fd0", recurring: true, save: { ability: "Destrezza", dc: 14 }, damage: "2d8", damageType: "Forza", effect: "" },
  { kind: "DARKNESS", label: "Oscurità innaturale", description: "Buio che nessuna torcia dissolve.", color: "#2b2b38", recurring: false, save: null, damage: "", damageType: "", effect: "Pesantemente oscurato" },
  { kind: "FOG", label: "Nebbia fitta", description: "Visibilità ridotta a pochi passi.", color: "#9fa8b4", recurring: false, save: null, damage: "", damageType: "", effect: "Pesantemente oscurato" },
  { kind: "WIND", label: "Vento impetuoso", description: "Raffiche che deviano frecce e passi.", color: "#7fa8b8", recurring: true, save: { ability: "Forza", dc: 12 }, damage: "", damageType: "", effect: "Svantaggio ai tiri a distanza" },
  { kind: "LIGHTNING", label: "Fulmini", description: "Scariche che colpiscono a intervalli irregolari.", color: "#c9c24f", recurring: true, save: { ability: "Destrezza", dc: 15 }, damage: "3d10", damageType: "Fulmine", effect: "" },
];

export function hazardFromTemplate(
  template: HazardTemplate,
  id: string,
  cells: string[]
): MapHazard {
  return {
    id,
    kind: template.kind,
    name: template.label,
    description: template.description,
    cells,
    recurring: template.recurring,
    save: template.save,
    damage: template.damage,
    damageType: template.damageType,
    effect: template.effect,
    color: template.color,
    visibleToPlayers: true,
  };
}

/** Effetti d'area ricorrenti, pronti da posare. */
export const AREA_PRESETS = [
  { name: "Zona di oscurità", effect: "Pesantemente oscurato", duration: "Permanente", color: "#2b2b38" },
  { name: "Nebbia occultante", effect: "Pesantemente oscurato", duration: "1 minuto", color: "#9fa8b4" },
  { name: "Terreno consacrato", effect: "Svantaggio per i non morti", duration: "Permanente", color: "#d6b25e" },
  { name: "Muro di fuoco", effect: "5d8 danni da fuoco all'ingresso", duration: "1 minuto", color: "#d4622f" },
  { name: "Zona di silenzio", effect: "Nessun suono, incantesimi verbali impossibili", duration: "10 minuti", color: "#6f7c86" },
  { name: "Campo antimagia", effect: "La magia non funziona", duration: "1 ora", color: "#8f6fd0" },
];
