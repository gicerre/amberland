import { objectFromTemplate, OBJECT_LIBRARY } from "@/features/battle/library";
import {
  DEFAULT_MAP_SETTINGS,
  EMPTY_TACTICAL_MAP,
  type MapCell,
  type MapCells,
  type MapObject,
  type TacticalMap,
  type TerrainId,
} from "@/types/battlemap";

/* ============================================================
 * Generatore di mappe — MODULO PURO.
 *
 * I preset non sono immagini: producono una STRUTTURA TATTICA completa
 * (terreni, quote, muri, porte, alberi) che il Master può poi modificare
 * cella per cella. Servono a non partire mai dal foglio bianco.
 *
 * Il rumore è deterministico: lo stesso seme dà la stessa mappa, così
 * "rigenera" è un gesto ripetibile e non una lotteria.
 * ============================================================ */

export const MAP_PRESETS = [
  { id: "FOREST", label: "Foresta", description: "Alberi fitti, radure e sottobosco difficile." },
  { id: "SWAMP", label: "Palude", description: "Acquitrini, melma e isolotti di terra ferma." },
  { id: "MOUNTAIN", label: "Montagna", description: "Creste rocciose e forti dislivelli." },
  { id: "CASTLE", label: "Castello", description: "Sale murate, corridoi e porte." },
  { id: "DUNGEON", label: "Sotterraneo", description: "Stanze scavate, cunicoli e porte." },
  { id: "RUINS", label: "Rovine", description: "Muri crollati, macerie e colonne spezzate." },
  { id: "BATTLEFIELD", label: "Campo di battaglia", description: "Terreno aperto, barricate e carri." },
  { id: "VILLAGE", label: "Villaggio", description: "Case, strade sterrate e recinti." },
  { id: "TEMPLE", label: "Tempio", description: "Pianta simmetrica, colonne e altare." },
  { id: "CAVE", label: "Caverna", description: "Grotte irregolari scavate nella roccia." },
  { id: "COAST", label: "Costa", description: "Sabbia, bassi fondali e mare aperto." },
  { id: "RIVER", label: "Fiume", description: "Un corso d'acqua che taglia il campo." },
  { id: "EMPTY", label: "Campo aperto", description: "Nessun ostacolo: si parte da zero." },
] as const;

export type PresetId = (typeof MAP_PRESETS)[number]["id"];

export interface GeneratorOptions {
  preset: PresetId;
  cols: number;
  rows: number;
  seed?: number;
  /** Quanto è "affollata" la mappa: alberi, macerie, stanze. */
  density?: number;
  /** Ampiezza dei dislivelli, 0 = tutto piano. */
  elevation?: number;
  /** Aggiunge acqua dove il preset la prevede. */
  water?: boolean;
}

/* ------------------------------- Rumore ---------------------------- */

/** PRNG deterministico e minuscolo (mulberry32). */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Campo di rumore morbido: rumore bianco + qualche passata di sfocatura. */
function noiseField(
  cols: number,
  rows: number,
  random: () => number,
  smoothing = 3
): number[][] {
  let field = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => random())
  );

  for (let pass = 0; pass < smoothing; pass++) {
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

  // Rinormalizza: la sfocatura comprime i valori verso 0,5.
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

/* ------------------------------ Utilità ---------------------------- */

const key = (x: number, y: number) => `${x},${y}`;

function setCell(cells: MapCells, x: number, y: number, patch: Partial<MapCell>) {
  const current = cells[key(x, y)] ?? { terrain: "NORMAL", elevation: 0 };
  cells[key(x, y)] = { ...current, ...patch };
}

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Stanze rettangolari non sovrapposte, con un margine fra loro. */
function placeRooms(
  cols: number,
  rows: number,
  random: () => number,
  attempts: number,
  min = 4,
  max = 9
): Room[] {
  const rooms: Room[] = [];
  for (let attempt = 0; attempt < attempts * 6 && rooms.length < attempts; attempt++) {
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

/** Perimetro murato di una stanza; l'interno resta calpestabile. */
function walledRoom(cells: MapCells, room: Room, floor: TerrainId) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      const edge =
        x === room.x ||
        y === room.y ||
        x === room.x + room.w - 1 ||
        y === room.y + room.h - 1;
      setCell(cells, x, y, { terrain: edge ? "WALL" : floor });
    }
  }
}

/** Corridoio a L fra due punti: prima in orizzontale, poi in verticale. */
function carveCorridor(
  cells: MapCells,
  from: { x: number; y: number },
  to: { x: number; y: number },
  floor: TerrainId
) {
  for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) {
    setCell(cells, x, from.y, { terrain: floor, blocked: false });
  }
  for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) {
    setCell(cells, to.x, y, { terrain: floor, blocked: false });
  }
}

let objectCounter = 0;
const nextId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${(objectCounter++).toString(36)}`;

function template(id: string) {
  return OBJECT_LIBRARY.find((entry) => entry.id === id)!;
}

function addObject(
  objects: MapObject[],
  templateId: string,
  cells: string[]
): void {
  objects.push(objectFromTemplate(template(templateId), nextId("obj"), cells));
}

/* ---------------------------- Generatore --------------------------- */

/**
 * Costruisce una mappa tattica completa dal preset scelto.
 * Il risultato è dato ordinario: ogni cella resta modificabile a mano.
 */
export function generateTacticalMap(options: GeneratorOptions): TacticalMap {
  const {
    preset,
    cols,
    rows,
    seed = Math.floor(Math.random() * 1_000_000),
    density = 0.5,
    elevation = 0.4,
    water = true,
  } = options;

  const random = rng(seed);
  const cells: MapCells = {};
  const objects: MapObject[] = [];

  const terrainNoise = noiseField(cols, rows, random, 3);
  const heightNoise = noiseField(cols, rows, random, 4);

  /** Quota derivata dal rumore, con l'ampiezza scelta dal Master. */
  const heightAt = (x: number, y: number, amplitude: number) => {
    if (elevation <= 0 || amplitude <= 0) return 0;
    const value = heightNoise[y]![x]!;
    return Math.round((value - 0.5) * 2 * amplitude * elevation * 4);
  };

  const paint = (
    thresholds: { limit: number; terrain: TerrainId }[],
    amplitude = 1
  ) => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const value = terrainNoise[y]![x]!;
        const match =
          thresholds.find((entry) => value <= entry.limit) ??
          thresholds[thresholds.length - 1]!;
        const height = heightAt(x, y, amplitude);
        setCell(cells, x, y, {
          terrain: match.terrain,
          elevation: height,
        });
      }
    }
  };

  /** Sparge oggetti dove il rumore supera una soglia. */
  const scatter = (templateId: string, chance: number, onTerrain?: TerrainId[]) => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = cells[key(x, y)];
        if (onTerrain && cell && !onTerrain.includes(cell.terrain)) continue;
        if (random() > chance * density) continue;
        addObject(objects, templateId, [key(x, y)]);
      }
    }
  };

  switch (preset) {
    case "FOREST":
      paint([
        { limit: 0.32, terrain: "TALL_GRASS" },
        { limit: 0.62, terrain: "GRASS" },
        { limit: 0.85, terrain: "FOREST" },
        { limit: 1, terrain: "ROCK" },
      ]);
      scatter("tree", 0.16, ["FOREST", "GRASS"]);
      scatter("bush", 0.08, ["GRASS", "TALL_GRASS"]);
      scatter("log", 0.02, ["GRASS"]);
      break;

    case "SWAMP":
      paint([
        { limit: 0.3, terrain: "SHALLOW_WATER" },
        { limit: 0.52, terrain: "SWAMP" },
        { limit: 0.78, terrain: "MUD" },
        { limit: 1, terrain: "TALL_GRASS" },
      ], 0.3);
      scatter("tree", 0.05, ["MUD", "TALL_GRASS"]);
      scatter("log", 0.04, ["SWAMP", "MUD"]);
      break;

    case "MOUNTAIN":
      paint(
        [
          { limit: 0.35, terrain: "ROCK" },
          { limit: 0.6, terrain: "RUBBLE" },
          { limit: 0.85, terrain: "ROCK" },
          { limit: 1, terrain: "SNOW" },
        ],
        2.2
      );
      scatter("boulder", 0.1, ["ROCK", "RUBBLE"]);
      break;

    case "CAVE": {
      // Automa cellulare: roccia dove il rumore è alto, poi si smussa.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
          const solid = border || terrainNoise[y]![x]! > 0.62 - density * 0.1;
          setCell(cells, x, y, {
            terrain: solid ? "WALL" : "ROCK",
            elevation: solid ? 0 : heightAt(x, y, 0.6),
          });
        }
      }
      scatter("boulder", 0.06, ["ROCK"]);
      if (water) {
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            if (cells[key(x, y)]?.terrain === "ROCK" && terrainNoise[y]![x]! < 0.2) {
              setCell(cells, x, y, { terrain: "SHALLOW_WATER" });
            }
          }
        }
      }
      break;
    }

    case "DUNGEON":
    case "CASTLE": {
      const floor: TerrainId = preset === "CASTLE" ? "ROCK" : "NORMAL";
      // Tutto pieno, poi si scava: è il modo più semplice di ottenere
      // stanze davvero chiuse.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          setCell(cells, x, y, { terrain: "WALL", elevation: 0 });
        }
      }
      const rooms = placeRooms(
        cols,
        rows,
        random,
        Math.max(3, Math.round((cols * rows) / 90)),
        preset === "CASTLE" ? 5 : 4,
        preset === "CASTLE" ? 11 : 8
      );
      for (const room of rooms) walledRoom(cells, room, floor);

      for (let index = 1; index < rooms.length; index++) {
        const a = rooms[index - 1]!;
        const b = rooms[index]!;
        const from = {
          x: Math.floor(a.x + a.w / 2),
          y: Math.floor(a.y + a.h / 2),
        };
        const to = { x: Math.floor(b.x + b.w / 2), y: Math.floor(b.y + b.h / 2) };
        carveCorridor(cells, from, to, floor);
        // Una porta dove il corridoio incontra il muro della stanza.
        addObject(objects, "door", [key(to.x, Math.max(1, b.y))]);
      }
      if (preset === "CASTLE") {
        for (const room of rooms.slice(0, 2)) {
          addObject(objects, "column", [key(room.x + 1, room.y + 1)]);
          addObject(objects, "column", [
            key(room.x + room.w - 2, room.y + room.h - 2),
          ]);
        }
      }
      break;
    }

    case "RUINS":
      paint([
        { limit: 0.4, terrain: "RUBBLE" },
        { limit: 0.7, terrain: "GRASS" },
        { limit: 1, terrain: "ROCK" },
      ], 0.5);
      for (const room of placeRooms(cols, rows, random, 3, 4, 8)) {
        // Muri spezzati: solo una parte del perimetro sopravvive.
        for (let x = room.x; x < room.x + room.w; x++) {
          if (random() > 0.35) setCell(cells, x, room.y, { terrain: "WALL" });
          if (random() > 0.35)
            setCell(cells, x, room.y + room.h - 1, { terrain: "WALL" });
        }
        for (let y = room.y; y < room.y + room.h; y++) {
          if (random() > 0.35) setCell(cells, room.x, y, { terrain: "WALL" });
        }
      }
      scatter("column", 0.04, ["RUBBLE", "GRASS"]);
      scatter("debris", 0.05, ["RUBBLE"]);
      break;

    case "BATTLEFIELD":
      paint([
        { limit: 0.35, terrain: "MUD" },
        { limit: 0.75, terrain: "GRASS" },
        { limit: 1, terrain: "RUBBLE" },
      ], 0.4);
      scatter("barricade", 0.03, ["GRASS", "MUD"]);
      scatter("cart", 0.015, ["GRASS"]);
      scatter("debris", 0.04, ["RUBBLE", "MUD"]);
      scatter("tent", 0.01, ["GRASS"]);
      break;

    case "VILLAGE": {
      paint([
        { limit: 0.45, terrain: "GRASS" },
        { limit: 0.8, terrain: "NORMAL" },
        { limit: 1, terrain: "TALL_GRASS" },
      ], 0.2);
      const houses = placeRooms(cols, rows, random, 4, 4, 7);
      houses.forEach((house, index) => {
        walledRoom(cells, house, "NORMAL");
        const doorX = house.x + Math.floor(house.w / 2);
        setCell(cells, doorX, house.y + house.h - 1, { terrain: "NORMAL" });
        addObject(objects, "door", [key(doorX, house.y + house.h - 1)]);
        if (index % 2 === 0) {
          addObject(objects, "cart", [key(house.x - 1, house.y + house.h)]);
        }
      });
      break;
    }

    case "TEMPLE": {
      // Pianta simmetrica: navata centrale, colonnati ai lati.
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
          setCell(cells, x, y, { terrain: border ? "WALL" : "ROCK" });
        }
      }
      const step = 3;
      for (let y = 2; y < rows - 2; y += step) {
        addObject(objects, "column", [key(2, y)]);
        addObject(objects, "column", [key(cols - 3, y)]);
      }
      const altarY = Math.max(2, Math.floor(rows / 6));
      addObject(objects, "altar", [key(Math.floor(cols / 2), altarY)]);
      for (let x = Math.floor(cols / 2) - 2; x <= Math.floor(cols / 2) + 2; x++) {
        setCell(cells, x, altarY + 1, { terrain: "ROCK", elevation: 1 });
      }
      break;
    }

    case "COAST": {
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // La costa corre in verticale: mare a sinistra, terra a destra.
          const shore = (x / cols) * 0.9 + terrainNoise[y]![x]! * 0.2;
          const terrain: TerrainId =
            shore < 0.28
              ? "DEEP_WATER"
              : shore < 0.42
                ? "SHALLOW_WATER"
                : shore < 0.58
                  ? "SAND"
                  : shore < 0.85
                    ? "GRASS"
                    : "ROCK";
          setCell(cells, x, y, {
            terrain,
            elevation: shore < 0.42 ? -1 : heightAt(x, y, 0.5),
          });
        }
      }
      scatter("boulder", 0.03, ["SAND", "ROCK"]);
      break;
    }

    case "RIVER": {
      paint([
        { limit: 0.45, terrain: "GRASS" },
        { limit: 0.8, terrain: "TALL_GRASS" },
        { limit: 1, terrain: "ROCK" },
      ], 0.4);
      // Il fiume serpeggia da nord a sud.
      let course = Math.floor(cols / 2);
      const width = Math.max(2, Math.round(cols / 12));
      for (let y = 0; y < rows; y++) {
        course += Math.round((random() - 0.5) * 2);
        course = Math.max(1, Math.min(cols - width - 1, course));
        for (let x = course; x < course + width; x++) {
          const deep = x > course && x < course + width - 1;
          setCell(cells, x, y, {
            terrain: deep ? "DEEP_WATER" : "SHALLOW_WATER",
            elevation: -1,
          });
        }
      }
      // Un guado di pietre a metà corso.
      const fordY = Math.floor(rows / 2);
      for (let x = 0; x < cols; x++) {
        if (cells[key(x, fordY)]?.terrain !== "NORMAL") {
          const cell = cells[key(x, fordY)];
          if (cell?.terrain === "DEEP_WATER" || cell?.terrain === "SHALLOW_WATER") {
            setCell(cells, x, fordY, { terrain: "SHALLOW_WATER", elevation: 0 });
          }
        }
      }
      break;
    }

    case "EMPTY":
    default:
      break;
  }

  // Le celle identiche al default non si scrivono: la mappa resta sparsa.
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
    ...EMPTY_TACTICAL_MAP,
    cells: pruned,
    objects,
    settings: {
      ...DEFAULT_MAP_SETTINGS,
      preset,
    },
  };
}
