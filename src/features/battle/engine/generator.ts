import { templateById } from "@/features/battle/catalog";
import { connectedRegions } from "@/features/battle/engine/analysis";
import { instanceFromTemplate } from "@/features/battle/engine/elements";
import type { CombatantSide, GridConfig } from "@/types/battle";
import {
  DEFAULT_MAP_SETTINGS,
  EMPTY_TACTICAL_MAP,
  type MapCell,
  type MapCells,
  type MapObject,
  type MapPoi,
  type MapZone,
  type PoiKind,
  type TacticalMap,
  type TerrainId,
  type ZoneKind,
} from "@/types/battlemap";

/* ============================================================
 * Generatore di STRUTTURA TATTICA — MODULO PURO.
 *
 * Non disegna nulla: l'immagine resta compito del Master (o di chi la
 * produce). Qui nasce ciò che il motore deve sapere — caselle con i loro
 * costi, quote, elementi ambientali dal catalogo, ZONE semantiche
 * ("cortile", "torre", "bosco") e PUNTI DI INTERESSE (ingressi,
 * schieramenti, posizioni dominanti, obiettivi).
 *
 * Il seme rende tutto ripetibile: stesse opzioni, stessa mappa. È ciò
 * che permette di rigenerare una variante, condividere una struttura o
 * tornare su quella che piaceva.
 * ============================================================ */

export const ENVIRONMENTS = [
  { id: "FOREST", label: "Foresta", description: "Alberi fitti, radure, sottobosco." },
  { id: "DUNGEON", label: "Sotterraneo", description: "Stanze scavate, corridoi, porte." },
  { id: "CASTLE", label: "Castello", description: "Sale murate, cortile, torri." },
  { id: "RUINS", label: "Rovine", description: "Muri spezzati, macerie, colonne." },
  { id: "VILLAGE", label: "Villaggio", description: "Case, strade, recinti, piazza." },
  { id: "SWAMP", label: "Palude", description: "Acquitrini, isolotti, canneti." },
  { id: "MOUNTAIN", label: "Montagna", description: "Creste, dislivelli forti, massi." },
  { id: "DESERT", label: "Deserto", description: "Dune, rocce isolate, spazi aperti." },
  { id: "COAST", label: "Costa", description: "Sabbia, bassi fondali, scogli." },
  { id: "GLACIER", label: "Ghiacciaio", description: "Ghiaccio, crepacci, neve." },
  { id: "VOLCANO", label: "Vulcano", description: "Colate, cenere, roccia nera." },
  { id: "CAVE", label: "Caverna", description: "Grotte irregolari, strettoie." },
  { id: "TEMPLE", label: "Tempio", description: "Pianta simmetrica, colonne, altare." },
  { id: "FORTRESS", label: "Fortezza", description: "Mura spesse, camminamenti, cancelli." },
  { id: "OPEN", label: "Campo aperto", description: "Terreno libero, pochi ripari." },
] as const;

export type EnvironmentId = (typeof ENVIRONMENTS)[number]["id"];

export interface GenerationOptions {
  environment: EnvironmentId;
  cols: number;
  rows: number;
  seed: number;
  /** 0–1: quanto terreno costa doppio. */
  difficultTerrain: number;
  /** 0–1: quanta acqua. */
  water: number;
  /** 0–1: quante strutture costruite. */
  structures: number;
  /** 0–1: quanti ripari. */
  cover: number;
  /** 0–1: quanti ostacoli invalicabili. */
  obstacles: number;
  /** 0–1: quanto dislivello. */
  verticality: number;
  /** 0–1: quanta vegetazione. */
  vegetation: number;
  /** Quanti punti di interesse piazzare. */
  poiCount: number;
  /** 0–1: quanto è ostile l'ambiente (trappole e pericoli naturali). */
  danger: number;
  symmetry: boolean;
  /** Scontro previsto: dimensiona spazio e distanza fra gli schieramenti. */
  partySize?: number;
  enemyCount?: number;
}

export const DEFAULT_GENERATION: Omit<GenerationOptions, "cols" | "rows" | "seed"> = {
  environment: "FOREST",
  difficultTerrain: 0.35,
  water: 0.2,
  structures: 0.3,
  cover: 0.45,
  obstacles: 0.3,
  verticality: 0.3,
  vegetation: 0.5,
  poiCount: 6,
  danger: 0.2,
  symmetry: false,
};

/** Parti rigenerabili singolarmente: si tiene ciò che va bene. */
export const GENERATION_LAYERS = [
  "terrain",
  "elevation",
  "water",
  "structures",
  "vegetation",
  "obstacles",
  "poi",
] as const;
export type GenerationLayer = (typeof GENERATION_LAYERS)[number];

export interface GenerationResult {
  map: TacticalMap;
  /** Che cosa è stato generato, in italiano: finisce nel riepilogo. */
  report: string[];
}

/* ------------------------------- Rumore ----------------------------- */

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Campo morbido: rumore bianco più qualche passata di media locale. */
function noise(
  cols: number,
  rows: number,
  random: () => number,
  passes = 3
): number[][] {
  let field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => random())
  );

  for (let pass = 0; pass < passes; pass++) {
    const next = field.map((row) => [...row]);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
            sum += field[ny]![nx]!;
            count++;
          }
        }
        next[y]![x] = sum / count;
      }
    }
    field = next;
  }

  let min = 1;
  let max = 0;
  for (const row of field) {
    for (const value of row) {
      min = Math.min(min, value);
      max = Math.max(max, value);
    }
  }
  const range = max - min || 1;
  return field.map((row) => row.map((value) => (value - min) / range));
}

/* ------------------------------ Utilità ----------------------------- */

const key = (x: number, y: number) => `${x},${y}`;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function rectCellsOf(rect: Rect): string[] {
  const cells: string[] = [];
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) cells.push(key(x, y));
  }
  return cells;
}

function centerOf(rect: Rect): string {
  return key(Math.floor(rect.x + rect.w / 2), Math.floor(rect.y + rect.h / 2));
}

/** Stanze non sovrapposte, con un corridoio di margine fra loro. */
function placeRooms(
  cols: number,
  rows: number,
  random: () => number,
  count: number,
  min: number,
  max: number
): Rect[] {
  const rooms: Rect[] = [];
  for (let attempt = 0; attempt < count * 8 && rooms.length < count; attempt++) {
    const w = min + Math.floor(random() * (max - min));
    const h = min + Math.floor(random() * (max - min));
    const x = 1 + Math.floor(random() * Math.max(1, cols - w - 2));
    const y = 1 + Math.floor(random() * Math.max(1, rows - h - 2));
    const room = { x, y, w, h };
    const overlaps = rooms.some(
      (other) =>
        room.x < other.x + other.w + 1 &&
        room.x + room.w + 1 > other.x &&
        room.y < other.y + other.h + 1 &&
        room.y + room.h + 1 > other.y
    );
    if (!overlaps) rooms.push(room);
  }
  return rooms;
}

/* ---------------------------- Generatore ---------------------------- */

let counter = 0;
const newId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

interface Palette {
  ground: TerrainId;
  rough: TerrainId;
  water: TerrainId;
  deepWater: TerrainId;
  blocked: TerrainId;
  vegetation: TerrainId;
  hazard: TerrainId | null;
  /** Elementi del catalogo usati come ostacoli e ripari. */
  obstacle: string;
  cover: string;
  tree: string;
  structureWall: string;
  door: string;
}

const PALETTES: Record<EnvironmentId, Palette> = {
  FOREST: { ground: "GRASS", rough: "TALL_GRASS", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "ROCK", vegetation: "FOREST", hazard: null, obstacle: "nature.rock.large", cover: "nature.rock.medium", tree: "nature.tree.adult", structureWall: "structure.wall.wood", door: "structure.door.simple" },
  DUNGEON: { ground: "NORMAL", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "NORMAL", hazard: null, obstacle: "dungeon.cage", cover: "structure.column", tree: "nature.mushrooms", structureWall: "structure.wall.stone", door: "structure.door.sturdy" },
  CASTLE: { ground: "ROCK", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "GRASS", hazard: null, obstacle: "structure.column", cover: "structure.wall.low", tree: "nature.tree.adult", structureWall: "structure.wall.fortified", door: "structure.door.reinforced" },
  FORTRESS: { ground: "ROCK", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "GRASS", hazard: null, obstacle: "field.chevaux", cover: "field.sandbags", tree: "nature.tree.dead", structureWall: "structure.wall.fortified", door: "structure.door.fortified" },
  RUINS: { ground: "RUBBLE", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "TALL_GRASS", hazard: null, obstacle: "structure.column", cover: "structure.wall.ruined", tree: "nature.tree.dead", structureWall: "structure.wall.ruined", door: "structure.door.simple" },
  VILLAGE: { ground: "NORMAL", rough: "MUD", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "GRASS", hazard: null, obstacle: "field.cart", cover: "structure.fence", tree: "nature.tree.adult", structureWall: "structure.wall.wood", door: "structure.door.simple" },
  SWAMP: { ground: "MUD", rough: "SWAMP", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "ROCK", vegetation: "TALL_GRASS", hazard: null, obstacle: "nature.log", cover: "nature.reeds", tree: "nature.tree.dead", structureWall: "structure.wall.wood", door: "structure.door.simple" },
  MOUNTAIN: { ground: "ROCK", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "SNOW", hazard: null, obstacle: "nature.rock.large", cover: "nature.rock.medium", tree: "nature.tree.dead", structureWall: "structure.wall.stone", door: "structure.door.sturdy" },
  DESERT: { ground: "SAND", rough: "SAND", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "ROCK", vegetation: "TALL_GRASS", hazard: null, obstacle: "nature.rock.large", cover: "nature.rock.small", tree: "nature.tree.dead", structureWall: "structure.wall.ruined", door: "structure.door.simple" },
  COAST: { ground: "SAND", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "ROCK", vegetation: "TALL_GRASS", hazard: null, obstacle: "nature.rock.spire", cover: "nature.rock.medium", tree: "nature.tree.adult", structureWall: "structure.palisade", door: "structure.door.simple" },
  GLACIER: { ground: "SNOW", rough: "ICE", water: "ICE", deepWater: "DEEP_WATER", blocked: "ROCK", vegetation: "SNOW", hazard: "ICE", obstacle: "nature.rock.spire", cover: "nature.rock.medium", tree: "nature.tree.dead", structureWall: "structure.wall.stone", door: "structure.door.sturdy" },
  VOLCANO: { ground: "ASH", rough: "UNSTABLE", water: "LAVA", deepWater: "LAVA", blocked: "ROCK", vegetation: "ASH", hazard: "LAVA", obstacle: "nature.rock.spire", cover: "nature.rock.large", tree: "nature.tree.dead", structureWall: "structure.wall.stone", door: "structure.door.sturdy" },
  CAVE: { ground: "ROCK", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "NORMAL", hazard: null, obstacle: "nature.rock.large", cover: "nature.rock.medium", tree: "nature.mushrooms", structureWall: "structure.wall.stone", door: "structure.door.hatch" },
  TEMPLE: { ground: "ROCK", rough: "RUBBLE", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "WALL", vegetation: "GRASS", hazard: null, obstacle: "structure.column", cover: "prop.altar", tree: "nature.tree.great", structureWall: "structure.wall.stone", door: "structure.door.gate" },
  OPEN: { ground: "GRASS", rough: "TALL_GRASS", water: "SHALLOW_WATER", deepWater: "DEEP_WATER", blocked: "ROCK", vegetation: "TALL_GRASS", hazard: null, obstacle: "nature.rock.medium", cover: "field.barricade", tree: "nature.tree.adult", structureWall: "structure.fence", door: "structure.door.simple" },
};

/** Quante caselle libere servono a uno scontro di questa taglia. */
export function requiredOpenCells(partySize: number, enemyCount: number): number {
  // Regola pratica del tavolo: ogni combattente vuole attorno a sé un
  // quadrato di manovra, più il doppio di spazio per muoversi.
  return (partySize + enemyCount) * 9;
}

/**
 * Genera la struttura tattica completa: caselle, quote, elementi, zone e
 * punti di interesse. Nessun pixel — solo ciò che il motore userà.
 */
export function generateTacticalStructure(
  options: GenerationOptions
): GenerationResult {
  const {
    environment,
    cols,
    rows,
    seed,
    difficultTerrain,
    water,
    structures,
    cover,
    obstacles,
    verticality,
    vegetation,
    poiCount,
    danger,
    symmetry,
    partySize = 4,
    enemyCount = 4,
  } = options;

  const random = rng(seed);
  const palette = PALETTES[environment];
  const report: string[] = [];

  const cells: MapCells = {};
  const objects: MapObject[] = [];
  const zones: MapZone[] = [];
  const poi: MapPoi[] = [];

  const terrainField = noise(cols, rows, random, 3);
  const heightField = noise(cols, rows, random, 4);

  const setCell = (x: number, y: number, patch: Partial<MapCell>) => {
    const current = cells[key(x, y)] ?? { terrain: palette.ground, elevation: 0 };
    cells[key(x, y)] = { ...current, ...patch };
  };

  const addObject = (templateId: string, cellKeys: string[]) => {
    const template = templateById(templateId);
    if (!template) return;
    objects.push(instanceFromTemplate(template, newId("el"), cellKeys));
  };

  const addZone = (kind: ZoneKind, name: string, cellKeys: string[], color: string) => {
    if (cellKeys.length === 0) return;
    zones.push({ id: newId("zone"), kind, name, cells: cellKeys, color, note: "" });
  };

  const addPoi = (
    kind: PoiKind,
    name: string,
    cell: string,
    extra: Partial<MapPoi> = {}
  ) => {
    poi.push({
      id: newId("poi"),
      kind,
      name,
      cell,
      side: null,
      cells: [],
      note: "",
      visibleToPlayers: false,
      ...extra,
    });
  };

  /* ------------------------- Terreno di base ----------------------- */

  const mirror = (x: number) => (symmetry ? Math.min(x, cols - 1 - x) : x);

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = terrainField[y]![mirror(x)]!;
      const height =
        verticality > 0
          ? Math.round((heightField[y]![mirror(x)]! - 0.5) * 2 * verticality * 4)
          : 0;

      let terrain: TerrainId = palette.ground;
      if (value < water * 0.5) terrain = palette.deepWater;
      else if (value < water) terrain = palette.water;
      else if (value > 1 - vegetation * 0.35) terrain = palette.vegetation;
      else if (value > 1 - vegetation * 0.35 - difficultTerrain * 0.4) {
        terrain = palette.rough;
      }

      setCell(x, y, {
        terrain,
        elevation: terrain === palette.deepWater ? Math.min(height, -1) : height,
      });
    }
  }
  report.push(`Terreno base: ${environment.toLowerCase()}, ${cols}×${rows} caselle.`);

  /* --------------------------- Strutture --------------------------- */

  const built = environment === "DUNGEON" || environment === "CASTLE" ||
    environment === "FORTRESS" || environment === "VILLAGE" ||
    environment === "TEMPLE" || environment === "RUINS";

  if (built && structures > 0) {
    const roomCount = Math.max(2, Math.round((cols * rows) / 120 * structures * 2));
    const rooms = placeRooms(cols, rows, random, roomCount, 4, 9);

    rooms.forEach((room, index) => {
      // Perimetro murato, interno calpestabile.
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          const edge =
            x === room.x ||
            y === room.y ||
            x === room.x + room.w - 1 ||
            y === room.y + room.h - 1;
          setCell(x, y, {
            terrain: edge ? palette.blocked : palette.ground,
            elevation: 0,
            blocked: edge ? true : undefined,
            movementCost: edge ? null : undefined,
          });
        }
      }

      // Una porta sul lato basso, e un corridoio verso la stanza prima.
      const doorX = room.x + Math.floor(room.w / 2);
      const doorY = room.y + room.h - 1;
      setCell(doorX, doorY, {
        terrain: palette.ground,
        blocked: undefined,
        movementCost: undefined,
      });
      addObject(palette.door, [key(doorX, doorY)]);

      if (index > 0) {
        const previous = rooms[index - 1]!;
        const from = { x: doorX, y: doorY };
        const to = {
          x: Math.floor(previous.x + previous.w / 2),
          y: previous.y + previous.h - 1,
        };
        for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
          setCell(x, from.y, {
            terrain: palette.ground,
            blocked: undefined,
            movementCost: undefined,
          });
        }
        for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
          setCell(to.x, y, {
            terrain: palette.ground,
            blocked: undefined,
            movementCost: undefined,
          });
        }
      }

      addZone(
        environment === "CASTLE" && index === 0 ? "COURTYARD" : "ROOM",
        environment === "CASTLE" && index === 0
          ? "Cortile"
          : `Sala ${index + 1}`,
        rectCellsOf(room),
        "#8a8f9c"
      );
    });

    report.push(`${rooms.length} ambienti murati con porte e collegamenti.`);

    // Torri agli angoli delle fortezze.
    if (environment === "CASTLE" || environment === "FORTRESS") {
      const towers: Rect[] = [
        { x: 1, y: 1, w: 3, h: 3 },
        { x: cols - 4, y: 1, w: 3, h: 3 },
      ];
      for (const [index, tower] of towers.entries()) {
        for (const cell of rectCellsOf(tower)) {
          const [x, y] = cell.split(",").map(Number);
          setCell(x!, y!, { terrain: palette.ground, elevation: 3 });
        }
        // Rampa a gradini: senza, la sommità sarebbe un'isola in quota
        // e nessuno potrebbe salirci camminando.
        const rampX = tower.x + Math.floor(tower.w / 2);
        for (let step = 1; step <= 3; step++) {
          const y = tower.y + tower.h - 1 + step;
          if (y >= rows) break;
          setCell(rampX, y, {
            terrain: palette.ground,
            elevation: 3 - step,
            blocked: undefined,
            movementCost: undefined,
          });
        }
        addZone("TOWER", `Torre ${index + 1}`, rectCellsOf(tower), "#9aa0ad");
        addPoi("VANTAGE", `Sommità della torre ${index + 1}`, centerOf(tower));
      }
      report.push("Due torri con posizione dominante (quota +3).");
    }
  }

  /* --------------------------- Vegetazione ------------------------- */

  if (vegetation > 0 && !built) {
    let planted = 0;
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const cell = cells[key(x, y)];
        if (cell?.terrain !== palette.vegetation) continue;
        if (random() > vegetation * 0.12) continue;
        addObject(palette.tree, [key(x, y)]);
        planted++;
      }
    }
    if (planted > 0) report.push(`${planted} alberi come ripari naturali.`);
  }

  /* ------------------------ Ostacoli e ripari ---------------------- */

  let coverCount = 0;
  let obstacleCount = 0;
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const cell = cells[key(x, y)];
      if (!cell || cell.blocked) continue;
      if (cell.terrain === palette.water || cell.terrain === palette.deepWater) {
        continue;
      }
      const roll = random();
      if (roll < obstacles * 0.04) {
        addObject(palette.obstacle, [key(x, y)]);
        obstacleCount++;
      } else if (roll < obstacles * 0.04 + cover * 0.16) {
        addObject(palette.cover, [key(x, y)]);
        coverCount++;
      }
    }
  }
  report.push(`${coverCount} ripari e ${obstacleCount} ostacoli invalicabili.`);

  /* ------------------------------ Acqua ---------------------------- */

  if (water > 0) {
    const waterCells: string[] = [];
    for (const [cellId, cell] of Object.entries(cells)) {
      if (cell.terrain === palette.water || cell.terrain === palette.deepWater) {
        waterCells.push(cellId);
      }
    }
    if (waterCells.length > 0) {
      addZone(
        environment === "VOLCANO" ? "DANGER" as ZoneKind : "WATER",
        environment === "VOLCANO" ? "Colata" : "Acque",
        waterCells,
        "#4a8ec2"
      );
      report.push(`${waterCells.length} caselle d'acqua.`);
    }

    // Un ponte dove l'acqua taglia la mappa a metà altezza.
    const midY = Math.floor(rows / 2);
    const crossing: string[] = [];
    for (let x = 0; x < cols; x++) {
      const cell = cells[key(x, midY)];
      if (cell?.terrain === palette.water || cell?.terrain === palette.deepWater) {
        crossing.push(key(x, midY));
      }
    }
    if (crossing.length >= 2 && structures > 0.2) {
      addObject("structure.bridge.wood", crossing);
      addZone("BRIDGE", "Ponte", crossing, "#9c7a4d");
      addPoi("CHOKEPOINT", "Ponte", crossing[Math.floor(crossing.length / 2)]!);
      report.push("Un ponte attraversa l'acqua: passaggio obbligato.");
    }
  }

  /* --------------------------- Pericoli ---------------------------- */

  if (danger > 0.4 && palette.hazard) {
    let hazardCells = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (random() > danger * 0.03) continue;
        setCell(x, y, { terrain: palette.hazard });
        hazardCells++;
      }
    }
    if (hazardCells > 0) report.push(`${hazardCells} caselle pericolose.`);
  }

  /* ----------------------- Schieramenti e POI ---------------------- */

  const openCells: string[] = [];
  const occupied = new Set(objects.flatMap((object) => object.cells));
  for (const [cellId, cell] of Object.entries(cells)) {
    if (cell.blocked || occupied.has(cellId)) continue;
    if (cell.terrain === palette.deepWater) continue;
    openCells.push(cellId);
  }

  const needed = requiredOpenCells(partySize, enemyCount);
  if (openCells.length < needed) {
    report.push(
      `Attenzione: ${openCells.length} caselle libere per uno scontro che ne chiede ${needed}.`
    );
  }

  /** Schieramento: un blocco di caselle libere attorno a un angolo. */
  const spawnBlock = (originX: number, originY: number, size: number) => {
    const block: string[] = [];
    for (let dy = 0; dy < size; dy++) {
      for (let dx = 0; dx < size; dx++) {
        const cellId = key(
          Math.max(0, Math.min(cols - 1, originX + dx)),
          Math.max(0, Math.min(rows - 1, originY + dy))
        );
        const cell = cells[cellId];
        if (cell?.blocked || occupied.has(cellId)) continue;
        block.push(cellId);
      }
    }
    return block;
  };

  const side = Math.max(2, Math.ceil(Math.sqrt(partySize)));
  const players = spawnBlock(1, rows - 1 - side, side);
  const enemies = spawnBlock(cols - 1 - side, 1, Math.max(2, Math.ceil(Math.sqrt(enemyCount))));

  if (players.length > 0) {
    addPoi("SPAWN", "Schieramento del party", players[0]!, {
      side: "PC" as CombatantSide,
      cells: players,
      visibleToPlayers: true,
    });
    addZone("OPEN_FIELD", "Ingresso del party", players, "#d6b25e");
  }
  if (enemies.length > 0) {
    addPoi("SPAWN", "Schieramento nemico", enemies[0]!, {
      side: "ENEMY" as CombatantSide,
      cells: enemies,
    });
  }
  report.push("Due schieramenti agli estremi opposti del campo.");

  // Posizioni dominanti: le caselle più alte che restano libere.
  const highest = [...Object.entries(cells)]
    .filter(([cellId, cell]) => !cell.blocked && !occupied.has(cellId))
    .sort((a, b) => b[1].elevation - a[1].elevation)
    .slice(0, Math.max(1, Math.round(poiCount / 3)));
  for (const [cellId, cell] of highest) {
    if (cell.elevation <= 0) break;
    addPoi("VANTAGE", `Posizione dominante (quota ${cell.elevation})`, cellId);
  }

  // Obiettivo e tesoro: al centro e in un angolo lontano dagli spawn.
  const center = key(Math.floor(cols / 2), Math.floor(rows / 2));
  addPoi("OBJECTIVE", "Obiettivo dello scontro", center, { visibleToPlayers: true });
  if (openCells.length > 0) {
    const treasure = openCells[Math.floor(random() * openCells.length)]!;
    addPoi("TREASURE", "Bottino", treasure);
  }
  report.push(`${poi.length} punti di interesse.`);

  /* --------------------- Collegamento delle regioni ---------------- */

  const draft: TacticalMap = {
    ...EMPTY_TACTICAL_MAP,
    cells,
    objects,
    zones,
    poi,
  };
  const carved = connectAllRegions(draft, { cols, rows }, cells, palette);
  if (carved > 0) {
    report.push(`${carved} passaggi scavati per collegare zone isolate.`);
  }

  /* --------------------- Punti di interesse validi ----------------- */

  const reachable = new Set(
    connectedRegions({ ...draft, cells }, {
      cols,
      rows,
      cellSize: 1.5,
      unit: "m",
      kind: "SQUARE",
      metric: "CHEBYSHEV",
      visible: true,
      offsetX: 0,
      offsetY: 0,
      imageScale: 1,
    })[0] ?? []
  );

  const usable = poi.filter((entry) => reachable.has(entry.cell));
  const dropped = poi.length - usable.length;
  if (dropped > 0) {
    report.push(`${dropped} punti di interesse scartati perché irraggiungibili.`);
  }

  /* ---------------------------- Ripulitura ------------------------- */

  const pruned: MapCells = {};
  for (const [cellId, cell] of Object.entries(cells)) {
    if (
      cell.terrain === DEFAULT_MAP_SETTINGS.defaultTerrain &&
      cell.elevation === 0 &&
      cell.movementCost === undefined &&
      !cell.blocked
    ) {
      continue;
    }
    pruned[cellId] = cell;
  }

  return {
    map: {
      ...EMPTY_TACTICAL_MAP,
      cells: pruned,
      objects,
      zones,
      poi: usable,
      settings: {
        ...DEFAULT_MAP_SETTINGS,
        preset: environment,
        seed,
      },
    },
    report,
  };
}

/**
 * Rigenerazione parziale: si tiene la struttura che va bene e si rifà
 * solo un livello. Il Master che ha passato mezz'ora sulle stanze non
 * deve rifarle per cambiare la vegetazione.
 */
export function regenerateLayer(
  current: TacticalMap,
  layer: GenerationLayer,
  options: GenerationOptions
): GenerationResult {
  const fresh = generateTacticalStructure(options);

  switch (layer) {
    case "poi":
      return {
        map: { ...current, zones: fresh.map.zones, poi: fresh.map.poi },
        report: ["Punti di interesse e zone rigenerati."],
      };
    case "vegetation":
    case "obstacles":
    case "structures":
      return {
        map: { ...current, objects: fresh.map.objects },
        report: [`Elementi rigenerati (${fresh.map.objects.length}).`],
      };
    case "terrain":
    case "water": {
      // Il terreno cambia, le quote restano: si riusa l'elevazione già
      // approvata, casella per casella.
      const cells: MapCells = {};
      for (const [cellId, cell] of Object.entries(fresh.map.cells)) {
        cells[cellId] = {
          ...cell,
          elevation: current.cells[cellId]?.elevation ?? cell.elevation,
        };
      }
      return { map: { ...current, cells }, report: ["Terreno rigenerato."] };
    }
    case "elevation": {
      const cells: MapCells = { ...current.cells };
      for (const [cellId, cell] of Object.entries(fresh.map.cells)) {
        const existing = cells[cellId];
        if (existing) cells[cellId] = { ...existing, elevation: cell.elevation };
        else cells[cellId] = cell;
      }
      return { map: { ...current, cells }, report: ["Quote rigenerate."] };
    }
  }
}

/** Griglia suggerita dallo scontro previsto. */
export function suggestSize(
  partySize: number,
  enemyCount: number
): Pick<GridConfig, "cols" | "rows"> {
  const cells = requiredOpenCells(partySize, enemyCount) * 2.2;
  const side = Math.max(16, Math.min(60, Math.round(Math.sqrt(cells))));
  return { cols: side, rows: Math.round(side * 0.75) };
}

/**
 * Scava finché ogni angolo percorribile è raggiungibile dal resto.
 *
 * Una mappa generata non deve avere stanze murate dentro: è il difetto
 * che l'analizzatore segnala per primo, e conviene che il generatore non
 * lo produca affatto.
 */
function connectAllRegions(
  map: TacticalMap,
  size: { cols: number; rows: number },
  cells: MapCells,
  palette: Palette
): number {
  const grid: GridConfig = {
    cols: size.cols,
    rows: size.rows,
    cellSize: 1.5,
    unit: "m",
    kind: "SQUARE",
    metric: "CHEBYSHEV",
    visible: true,
    offsetX: 0,
    offsetY: 0,
    imageScale: 1,
  };

  let carved = 0;
  for (let pass = 0; pass < 6; pass++) {
    const regions = connectedRegions({ ...map, cells }, grid);
    if (regions.length <= 1) break;

    const main = regions[0]!;
    const orphan = regions[1]!;
    const from = orphan[Math.floor(orphan.length / 2)]!;
    // Cella del blocco principale più vicina all'orfana.
    const target = main.reduce((best, candidate) => {
      const distance = manhattan(from, candidate);
      return distance < manhattan(from, best) ? candidate : best;
    }, main[0]!);

    const [fx, fy] = from.split(",").map(Number);
    const [tx, ty] = target.split(",").map(Number);
    const open = (x: number, y: number) => {
      const current = cells[key(x, y)];
      cells[key(x, y)] = {
        terrain: palette.ground,
        elevation: Math.max(-1, Math.min(1, current?.elevation ?? 0)),
      };
      carved++;
    };

    for (let x = Math.min(fx!, tx!); x <= Math.max(fx!, tx!); x++) open(x, fy!);
    for (let y = Math.min(fy!, ty!); y <= Math.max(fy!, ty!); y++) open(tx!, y);
  }
  return carved;
}

function manhattan(a: string, b: string): number {
  const [ax, ay] = a.split(",").map(Number);
  const [bx, by] = b.split(",").map(Number);
  return Math.abs(ax! - bx!) + Math.abs(ay! - by!);
}
