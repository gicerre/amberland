import {
  DEFAULT_DIFFICULTY_DC,
  type CoverLevel,
  type InteractionKind,
  type DifficultyTier,
  type HazardKind,
  type MapHazard,
  type MapObjectKind,
  type MapTrap,
  type ObjectState,
  type TacticalCheck,
  type TrapReset,
  type TrapTrigger,
} from "@/types/battlemap";

/* ============================================================
 * Catalogo dei profili ambientali, delle trappole e dei pericoli.
 *
 * Un profilo NON è un oggetto da disegnare: è la risposta pronta alla
 * domanda "che cosa è questa roccia che si vede nell'immagine?". Il
 * Master seleziona le caselle occupate dall'elemento, sceglie il profilo
 * e ottiene passabilità, copertura, HP, CD e interazioni già coerenti —
 * poi corregge ciò che vuole.
 *
 * Le icone servono agli overlay dell'editor e agli elenchi: in partita
 * l'elemento è quello disegnato nell'immagine, non un'icona sopra.
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

export const INTERACTION_LABELS: Record<InteractionKind, string> = {
  OPEN: "Apri",
  CLOSE: "Chiudi",
  LOCK: "Blocca",
  UNLOCK: "Sblocca",
  DESTROY: "Distruggi",
  INSPECT: "Ispeziona",
  ACTIVATE: "Attiva",
  DEACTIVATE: "Disattiva",
  CLIMB: "Scavalca",
  PASS: "Attraversa",
  TAKE_COVER: "Usa come copertura",
  CUSTOM: "Azione",
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
/* Oggetti ambientali                                                 */
/* ------------------------------------------------------------------ */

/*
 * Il catalogo degli elementi ambientali NON vive più qui: sta in
 * `features/battle/catalog/`, costruito per archetipi e con stati,
 * interazioni, metodi di risoluzione, CD e soglie di rottura.
 * Qui restano trappole, pericoli e aree, che hanno un modello proprio.
 *
 * Le etichette di stato e interazione sopravvivono perché servono a
 * tutte e tre le famiglie.
 */

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
