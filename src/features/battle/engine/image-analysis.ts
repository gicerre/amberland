import type { MapCells, MapZone, TerrainId, ZoneKind } from "@/types/battlemap";

/* ============================================================
 * Lettura dell'immagine — MODULO PURO.
 *
 * Che cosa fa: guarda i COLORI e la trama di ogni casella e propone che
 * terreno sia. Che cosa NON fa: riconoscere oggetti. Nessun modello di
 * visione è collegato a questo progetto, quindi il sistema non sa
 * distinguere una porta da una cassa — sa distinguere il blu dal verde,
 * il piatto dal fitto, il chiaro dallo scuro.
 *
 * Il risultato è una BOZZA con una confidenza dichiarata: il Master la
 * accetta, la corregge o la butta. Vale comunque molto più di partire da
 * un foglio bianco, perché acqua, boschi, roccia e vuoto coprono in
 * genere la maggior parte di una battlemap.
 *
 * Qui dentro non c'è né canvas né DOM: si lavora su campioni già presi.
 * Vedi `editor/image-sampler.ts` per il prelievo.
 * ============================================================ */

/** Campione di una casella: medie prese dai pixel che la coprono. */
export interface CellSample {
  /** Componenti medie, 0–255. */
  r: number;
  g: number;
  b: number;
  /** Luminanza percepita, 0–1. */
  luminance: number;
  /** Saturazione, 0–1. */
  saturation: number;
  /** Tinta in gradi, 0–360 (priva di senso se la saturazione è bassa). */
  hue: number;
  /**
   * Quanto è "mossa" la casella: 0 = tinta piatta, 1 = pieno di dettaglio.
   * Distingue un pavimento uniforme da una chioma o da un cumulo di
   * macerie.
   */
  detail: number;
}

export interface TerrainGuess {
  terrain: TerrainId;
  /** 0–1: quanto il campione somiglia al profilo scelto. */
  confidence: number;
  /** Casella verosimilmente invalicabile (vuoto, muraglia, lava). */
  blocked: boolean;
}

/* ------------------------------------------------------------------ */
/* Classificazione                                                    */
/* ------------------------------------------------------------------ */

const inHue = (hue: number, from: number, to: number) =>
  from <= to ? hue >= from && hue <= to : hue >= from || hue <= to;

/**
 * Da un campione al terreno più probabile.
 *
 * Le soglie sono tarate su come sono fatte le battlemap in circolazione:
 * acqua blu, vegetazione verde, pietra grigia desaturata, sabbia e terra
 * sul giallo-bruno, vuoto quasi nero. È euristica dichiarata, non
 * scienza: la confidenza dice quanto fidarsi.
 */
export function classifyCell(sample: CellSample): TerrainGuess {
  const { luminance, saturation, hue, detail } = sample;

  // Il quasi nero è vuoto o zona non illuminata: in entrambi i casi non
  // ci si cammina finché il Master non dice il contrario.
  if (luminance < 0.1) {
    return { terrain: "PIT", confidence: 0.75, blocked: true };
  }

  // Lava e fuoco: rosso acceso. Il rosso deve DOMINARE — senza questo
  // vincolo una sabbia calda passerebbe per colata incandescente.
  const { r, g, b } = sample;
  if (
    inHue(hue, 350, 30) &&
    saturation > 0.45 &&
    luminance > 0.25 &&
    r > g * 1.6 &&
    r > b * 2.2
  ) {
    return { terrain: "LAVA", confidence: 0.6 + saturation * 0.3, blocked: true };
  }

  /*
   * Il croma (distanza fra il canale più alto e il più basso) è più
   * affidabile della saturazione HSL, che vicino al bianco e al nero
   * esplode: un grigio-perla appena azzurrino risulterebbe "saturo" e
   * passerebbe per acqua.
   */
  const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;

  // Neve e ghiaccio vanno riconosciuti PRIMA dell'acqua, per lo stesso
  // motivo: sono chiarissimi e quasi privi di croma.
  if (luminance > 0.78 && chroma < 0.12) {
    // Serve un azzurro VISIBILE per chiamarlo ghiaccio: un bianco con
    // il 3% di tinta è neve, non una lastra gelata.
    const icy = inHue(hue, 170, 260) && chroma > 0.05;
    return {
      terrain: icy ? "ICE" : "SNOW",
      confidence: 0.5,
      blocked: false,
    };
  }

  // Acqua: blu-ciano con croma vero. Il buio distingue il fondale
  // profondo dalla riva.
  if (inHue(hue, 170, 260) && chroma > 0.1) {
    const deep = luminance < 0.42;
    return {
      terrain: deep ? "DEEP_WATER" : "SHALLOW_WATER",
      confidence: 0.55 + Math.min(0.35, saturation),
      blocked: false,
    };
  }

  // Verde: dal prato al bosco fitto, distinti dal dettaglio.
  if (inHue(hue, 65, 170) && saturation > 0.12) {
    if (detail > 0.55 && luminance < 0.45) {
      return { terrain: "FOREST", confidence: 0.55 + detail * 0.3, blocked: false };
    }
    if (detail > 0.35) {
      return { terrain: "TALL_GRASS", confidence: 0.5 + detail * 0.2, blocked: false };
    }
    return { terrain: "GRASS", confidence: 0.6, blocked: false };
  }

  // Bruno e giallo: sabbia se chiaro, fango se scuro, terra battuta nel
  // mezzo. La palude è bruna ma spenta e mossa.
  if (inHue(hue, 20, 65) && saturation > 0.12) {
    if (luminance > 0.62) {
      return { terrain: "SAND", confidence: 0.55, blocked: false };
    }
    if (luminance < 0.32) {
      return { terrain: "MUD", confidence: 0.5, blocked: false };
    }
    return { terrain: "NORMAL", confidence: 0.45, blocked: false };
  }

  // Grigio: pietra. Molto dettagliata e scura somiglia a macerie o a una
  // muraglia vista dall'alto.
  if (saturation <= 0.16) {
    if (detail > 0.62 && luminance < 0.34) {
      return { terrain: "WALL", confidence: 0.4 + detail * 0.25, blocked: true };
    }
    if (detail > 0.5) {
      return { terrain: "RUBBLE", confidence: 0.45, blocked: false };
    }
    return { terrain: "ROCK", confidence: 0.5, blocked: false };
  }

  // Nessun profilo convince: si lascia terreno normale, con confidenza
  // bassa, perché il Master lo veda e decida.
  return { terrain: "NORMAL", confidence: 0.2, blocked: false };
}

/* ------------------------------------------------------------------ */
/* Dalla griglia di campioni alla mappa                               */
/* ------------------------------------------------------------------ */

export interface ImageReadResult {
  cells: MapCells;
  zones: MapZone[];
  /** Confidenza media della lettura, 0–1. */
  confidence: number;
  /** Quante caselle per terreno: il riepilogo che legge il Master. */
  histogram: { terrain: TerrainId; count: number }[];
  report: string[];
}

const ZONE_FOR_TERRAIN: Partial<Record<TerrainId, { kind: ZoneKind; name: string; color: string }>> = {
  DEEP_WATER: { kind: "WATER", name: "Acque profonde", color: "#2f5f8f" },
  SHALLOW_WATER: { kind: "WATER", name: "Acque basse", color: "#5fa0cc" },
  FOREST: { kind: "FOREST", name: "Bosco", color: "#356b44" },
  TALL_GRASS: { kind: "CLEARING", name: "Erba alta", color: "#5f9a63" },
  GRASS: { kind: "OPEN_FIELD", name: "Prato", color: "#4f8a5c" },
  ROCK: { kind: "OPEN_FIELD", name: "Roccia", color: "#8a8f9c" },
  WALL: { kind: "WALLS", name: "Struttura", color: "#9aa0ad" },
  RUBBLE: { kind: "RUBBLE", name: "Macerie", color: "#948a7c" },
  SAND: { kind: "OPEN_FIELD", name: "Sabbia", color: "#cdb478" },
  MUD: { kind: "OPEN_FIELD", name: "Fango", color: "#785a3c" },
  LAVA: { kind: "DANGER" as ZoneKind, name: "Colata", color: "#c8452c" },
  PIT: { kind: "MOAT", name: "Vuoto", color: "#25252d" },
  SNOW: { kind: "OPEN_FIELD", name: "Neve", color: "#dde7ef" },
  ICE: { kind: "WATER", name: "Ghiaccio", color: "#a8d8ec" },
};

/** Zone minime perché valga la pena nominarle. */
const MIN_ZONE_CELLS = 6;

/**
 * Traduce i campioni in caselle e raggruppa il risultato in zone.
 *
 * `samples[y][x]` deve coprire l'intera griglia. Le caselle che
 * risultano "normali" con alta confidenza non vengono scritte: la mappa
 * resta sparsa.
 */
export function readImage(
  samples: CellSample[][],
  cols: number,
  rows: number,
  newId: () => string
): ImageReadResult {
  const cells: MapCells = {};
  const guesses: TerrainGuess[][] = [];
  let confidenceSum = 0;
  let counted = 0;

  for (let y = 0; y < rows; y++) {
    guesses[y] = [];
    for (let x = 0; x < cols; x++) {
      const sample = samples[y]?.[x];
      if (!sample) {
        guesses[y]![x] = { terrain: "NORMAL", confidence: 0, blocked: false };
        continue;
      }
      const guess = classifyCell(sample);
      guesses[y]![x] = guess;
      confidenceSum += guess.confidence;
      counted++;

      if (guess.terrain === "NORMAL" && !guess.blocked) continue;
      cells[`${x},${y}`] = {
        terrain: guess.terrain,
        elevation: 0,
        ...(guess.blocked ? { blocked: true, movementCost: null } : {}),
      };
    }
  }

  /* ----------------------- Zone contigue -------------------------- */

  const seen = new Set<string>();
  const zones: MapZone[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const key = `${x},${y}`;
      if (seen.has(key)) continue;
      const terrain = guesses[y]![x]!.terrain;
      const label = ZONE_FOR_TERRAIN[terrain];
      if (!label) {
        seen.add(key);
        continue;
      }

      const group: string[] = [];
      const queue = [{ x, y }];
      seen.add(key);

      while (queue.length > 0) {
        const current = queue.pop()!;
        group.push(`${current.x},${current.y}`);
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = current.x + dx;
          const ny = current.y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const nextKey = `${nx},${ny}`;
          if (seen.has(nextKey)) continue;
          if (guesses[ny]![nx]!.terrain !== terrain) continue;
          seen.add(nextKey);
          queue.push({ x: nx, y: ny });
        }
      }

      if (group.length >= MIN_ZONE_CELLS) {
        zones.push({
          id: newId(),
          kind: label.kind,
          name: label.name,
          cells: group,
          color: label.color,
          note: "Proposta dalla lettura dell'immagine.",
        });
      }
    }
  }

  /* --------------------------- Riepilogo --------------------------- */

  const counts = new Map<TerrainId, number>();
  for (const row of guesses) {
    for (const guess of row) {
      counts.set(guess.terrain, (counts.get(guess.terrain) ?? 0) + 1);
    }
  }
  const histogram = [...counts.entries()]
    .map(([terrain, count]) => ({ terrain, count }))
    .sort((a, b) => b.count - a.count);

  const confidence = counted > 0 ? confidenceSum / counted : 0;
  const report = [
    `${Object.keys(cells).length} caselle riconosciute su ${cols * rows}.`,
    `${zones.length} zone contigue proposte.`,
    `Confidenza media ${Math.round(confidence * 100)}%.`,
  ];
  if (confidence < 0.45) {
    report.push(
      "Confidenza bassa: l'immagine ha colori poco distinguibili. Conviene correggere a mano."
    );
  }

  return { cells, zones, confidence, histogram, report };
}

/* ------------------------------------------------------------------ */
/* Rilevamento della griglia                                          */
/* ------------------------------------------------------------------ */

export interface PitchGuess {
  /** Passo in pixel fra due linee della griglia. */
  pitch: number;
  /** Scostamento della prima linea dal bordo, in pixel. */
  offset: number;
  /** 0–1: quanto il segnale è periodico davvero. */
  score: number;
}

/**
 * Trova il passo di una griglia già disegnata sull'immagine.
 *
 * `profile` è l'energia dei bordi per colonna (o per riga): le linee
 * della griglia vi compaiono come picchi regolari. Si prova ogni passo
 * plausibile e si tiene quello che allinea meglio i picchi — una
 * correlazione, non un riconoscimento di forme, quindi funziona anche su
 * griglie sottili purché regolari.
 */
export function detectPitch(
  profile: number[],
  minPitch = 12,
  maxPitch = 200
): PitchGuess {
  if (profile.length < minPitch * 3) {
    return { pitch: 0, offset: 0, score: 0 };
  }

  const mean = profile.reduce((sum, value) => sum + value, 0) / profile.length;
  const centred = profile.map((value) => Math.max(0, value - mean));
  const average =
    centred.reduce((sum, value) => sum + value, 0) / centred.length || 1e-6;

  let best: PitchGuess = { pitch: 0, offset: 0, score: 0 };

  for (let pitch = minPitch; pitch <= Math.min(maxPitch, profile.length / 3); pitch++) {
    for (let offset = 0; offset < pitch; offset++) {
      let sum = 0;
      let lines = 0;
      for (let position = offset; position < profile.length; position += pitch) {
        // Si prende il massimo in una finestra di ±1 px: le linee non
        // cadono mai esattamente sul pixel intero.
        const window = [
          centred[position - 1] ?? 0,
          centred[position] ?? 0,
          centred[position + 1] ?? 0,
        ];
        sum += Math.max(...window);
        lines++;
      }
      if (lines < 4) continue;

      /*
       * Punteggio = quanto sono FORTI in media le linee campionate
       * rispetto al fondo. La somma non andrebbe bene: un passo dimezzato
       * campiona il doppio dei punti e sommerebbe altrettanto, facendo
       * vincere sempre il passo più piccolo. La media no: metà dei suoi
       * campioni cade sul vuoto e il punteggio crolla.
       */
      const ratio = sum / lines / average;
      /*
       * Normalizzazione MORBIDA, non un taglio netto: con una soglia
       * secca il passo giusto e il suo dimezzato finirebbero entrambi al
       * massimo e a vincere sarebbe il primo provato. Così invece 32
       * (tutti picchi) batte 16 (metà picchi, metà vuoto).
       */
      const score = ratio / (ratio + 8);

      // A parità sostanziale vince il passo più PICCOLO: è quello vero,
      // i multipli spiegano gli stessi picchi ma saltano linee.
      if (score > best.score + 0.02) best = { pitch, offset, score };
    }
  }

  // La finestra di ±1 px rende equivalenti tre scostamenti vicini: si
  // sceglie quello che cade sulla linea vera, non sul suo bordo.
  if (best.pitch > 0) {
    let bestOffset = best.offset;
    let bestEnergy = -1;
    for (const candidate of [best.offset - 1, best.offset, best.offset + 1]) {
      if (candidate < 0) continue;
      let energy = 0;
      for (let position = candidate; position < profile.length; position += best.pitch) {
        energy += centred[position] ?? 0;
      }
      if (energy > bestEnergy) {
        bestEnergy = energy;
        bestOffset = candidate;
      }
    }
    best = { ...best, offset: bestOffset };
  }

  return best;
}

export interface GridGuess {
  cols: number;
  rows: number;
  /** Scostamento in frazioni di cella, come lo vuole `GridConfig`. */
  offsetX: number;
  offsetY: number;
  confidence: number;
}

/**
 * Dalla coppia di profili alla griglia proposta: colonne, righe e
 * scostamenti già pronti per la configurazione della mappa.
 */
export function detectGrid(
  columnProfile: number[],
  rowProfile: number[],
  width: number,
  height: number
): GridGuess | null {
  const horizontal = detectPitch(columnProfile);
  const vertical = detectPitch(rowProfile);
  if (horizontal.pitch === 0 || vertical.pitch === 0) return null;

  const confidence = Math.min(horizontal.score, vertical.score);
  // Sotto questa soglia i "picchi" non si distinguono dal fondo: è
  // rumore, non una griglia disegnata.
  if (confidence < 0.5) return null;

  return {
    cols: Math.max(2, Math.round(width / horizontal.pitch)),
    rows: Math.max(2, Math.round(height / vertical.pitch)),
    offsetX: (horizontal.offset % horizontal.pitch) / horizontal.pitch,
    offsetY: (vertical.offset % vertical.pitch) / vertical.pitch,
    confidence,
  };
}
