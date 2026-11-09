"use client";

import { Grid3x3, Loader2, ScanEye, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { terrainById } from "@/features/battle/terrain";
import {
  detectGrid,
  readImage,
  type GridGuess,
  type ImageReadResult,
} from "@/features/battle/engine/image-analysis";
import { cn } from "@/lib/utils";
import type { MapCell } from "@/types/battlemap";

import { sampleImage } from "./image-sampler";
import { useEditor } from "./use-editor";

/* ============================================================
 * Lettura dell'immagine caricata.
 *
 * Due passaggi indipendenti, entrambi facoltativi:
 *  1. trovare la griglia già disegnata sull'immagine e allinearvi la
 *     nostra;
 *  2. proporre un terreno per ogni casella leggendone i colori.
 *
 * Non è riconoscimento di oggetti: il sistema non sa distinguere una
 * porta da una cassa. Sa distinguere l'acqua dall'erba, la roccia dal
 * vuoto, il fitto dal piatto — e su una battlemap quella è la parte
 * che copre più caselle.
 *
 * Tutto entra come una modifica sola: `Ctrl+Z` la annulla.
 * ============================================================ */

let idCounter = 0;
const newId = () => `img-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export function ReadImagePanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editor = useEditor();
  const url = editor.draft.background?.url ?? "";

  const [busy, setBusy] = useState<"grid" | "terrain" | null>(null);
  const [gridGuess, setGridGuess] = useState<GridGuess | null>(null);
  const [reading, setReading] = useState<ImageReadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const detect = async () => {
    setBusy("grid");
    setError(null);
    try {
      const sampled = await sampleImage(url, editor.grid.cols, editor.grid.rows);
      const guess = detectGrid(
        sampled.columnProfile,
        sampled.rowProfile,
        sampled.width,
        sampled.height
      );
      setGridGuess(guess);
      if (!guess) {
        toast.info("Nessuna griglia riconosciuta", {
          description: "L'immagine non sembra averne una disegnata sopra.",
        });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lettura non riuscita.");
    } finally {
      setBusy(null);
    }
  };

  const read = async () => {
    setBusy("terrain");
    setError(null);
    try {
      const sampled = await sampleImage(url, editor.grid.cols, editor.grid.rows);
      setReading(
        readImage(sampled.samples, editor.grid.cols, editor.grid.rows, newId)
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Lettura non riuscita.");
    } finally {
      setBusy(null);
    }
  };

  const applyGrid = () => {
    if (!gridGuess) return;
    editor.patchGrid({
      cols: gridGuess.cols,
      rows: gridGuess.rows,
      offsetX: gridGuess.offsetX,
      offsetY: gridGuess.offsetY,
    });
    toast.success("Griglia allineata all'immagine");
  };

  /** Una sola voce di storico: annullabile in blocco. */
  const applyTerrain = () => {
    if (!reading) return;
    const cells: Record<string, MapCell | null> = {};
    for (const [key, cell] of Object.entries(reading.cells)) cells[key] = cell;

    const zones = Object.fromEntries(
      reading.zones.map((zone) => [zone.id, zone])
    );

    editor.commit("Lettura dell'immagine", { cells, zones });
    toast.success("Terreni proposti", {
      description: `${Object.keys(reading.cells).length} caselle, ${reading.zones.length} zone. Correggi ciò che non torna.`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Leggi l&apos;immagine</DialogTitle>
          <DialogDescription>
            Il sistema guarda i colori e la trama di ogni casella e propone
            una bozza. Non riconosce oggetti — per quello serve il tuo occhio.
          </DialogDescription>
        </DialogHeader>

        {!url ? (
          <p className="rounded-lg border border-hairline bg-surface-2/60 p-3 text-xs text-muted-foreground">
            Carica prima l&apos;immagine della mappa: senza, non c&apos;è nulla
            da leggere.
          </p>
        ) : (
          <>
            {error && (
              <p className="flex items-start gap-2 rounded-lg border border-crimson/40 bg-crimson/10 p-3 text-xs text-crimson-light">
                <TriangleAlert className="mt-px size-3.5 shrink-0" />
                {error}
              </p>
            )}

            {/* ---------------------- Griglia ---------------------- */}
            <section className="space-y-2 rounded-xl border border-hairline p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-[0.7rem] tracking-[0.16em] text-gold/80 uppercase">
                  <Grid3x3 className="mr-1 inline size-3.5" />
                  Griglia disegnata
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={detect}
                  disabled={busy !== null}
                >
                  {busy === "grid" && <Loader2 className="size-3.5 animate-spin" />}
                  Cerca
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Cerca linee regolari nell&apos;immagine e ne ricava passo e
                scostamento. Funziona sulle mappe che una griglia ce l&apos;hanno
                già stampata sopra.
              </p>

              {gridGuess && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-surface-2/50 p-2.5 text-xs">
                  <span className="tabular-nums">
                    {gridGuess.cols} × {gridGuess.rows}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    scostamento {gridGuess.offsetX.toFixed(2)} /{" "}
                    {gridGuess.offsetY.toFixed(2)}
                  </span>
                  <Confidence value={gridGuess.confidence} />
                  <Button size="sm" className="ml-auto" onClick={applyGrid}>
                    Applica
                  </Button>
                </div>
              )}
            </section>

            {/* ---------------------- Terreni ---------------------- */}
            <section className="space-y-2 rounded-xl border border-hairline p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-heading text-[0.7rem] tracking-[0.16em] text-gold/80 uppercase">
                  <ScanEye className="mr-1 inline size-3.5" />
                  Terreni e zone
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={read}
                  disabled={busy !== null}
                >
                  {busy === "terrain" && (
                    <Loader2 className="size-3.5 animate-spin" />
                  )}
                  Analizza
                </Button>
              </div>

              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Classifica ogni casella per colore e trama: acqua, bosco,
                roccia, sabbia, neve, lava, vuoto. Le caselle contigue dello
                stesso tipo diventano zone.
              </p>

              {reading && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <Confidence value={reading.confidence} />
                    <span className="text-muted-foreground">
                      {Object.keys(reading.cells).length} caselle ·{" "}
                      {reading.zones.length} zone
                    </span>
                  </div>

                  <ul className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] sm:grid-cols-3">
                    {reading.histogram.slice(0, 9).map((entry) => {
                      const definition = terrainById(entry.terrain);
                      return (
                        <li
                          key={entry.terrain}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-sm border border-hairline"
                            style={{
                              backgroundColor:
                                definition.color === "transparent"
                                  ? "var(--surface-3)"
                                  : definition.color,
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {definition.label}
                          </span>
                          <span className="tabular-nums text-muted-foreground">
                            {entry.count}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                    {reading.report.map((line, index) => (
                      <li key={index}>{line}</li>
                    ))}
                  </ul>

                  <Button size="sm" className="w-full" onClick={applyTerrain}>
                    Applica alla mappa
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Entra come una modifica sola: se non convince,
                    <span className="text-foreground"> Ctrl+Z</span>.
                  </p>
                </div>
              )}
            </section>
          </>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Confidenza dichiarata: senza, una bozza sembrerebbe una certezza. */
function Confidence({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] tabular-nums",
        percent >= 60
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : percent >= 35
            ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
            : "border-crimson/40 bg-crimson/10 text-crimson-light"
      )}
    >
      confidenza {percent}%
    </span>
  );
}
