"use client";

import { Check, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { BattleGrid } from "@/features/battle/components/battle-grid";
import {
  aspectMismatch,
  formatDistance,
  suggestGrid,
} from "@/features/battle/engine/geometry";
import { CELL_SIZE_PRESETS } from "@/features/battle/constants";
import { optimizeCloudinary } from "@/lib/upload/image-service";
import { cn } from "@/lib/utils";
import type { BackgroundImage, GridConfig } from "@/types/battle";

import { useEditor } from "./use-editor";

/* ============================================================
 * Preparazione della battlemap.
 *
 * L'ambiente è già nell'immagine: qui non si genera nulla, si porta
 * l'immagine dentro il campo e si fa combaciare la griglia con quello
 * che vi è disegnato. Finito questo, tutto il resto è interpretazione —
 * e si fa nell'editor, quando si vuole.
 * ============================================================ */

const STEPS = [
  { id: "IMAGE", label: "Immagine" },
  { id: "GRID", label: "Griglia" },
  { id: "ALIGN", label: "Allineamento" },
  { id: "DONE", label: "Fine" },
] as const;

/** Scarto di proporzioni oltre il quale conviene avvisare il Master. */
const ASPECT_WARNING = 0.08;

export function QuickMapWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editor = useEditor();

  const [step, setStep] = useState(0);
  const [background, setBackground] = useState<BackgroundImage | null>(
    editor.draft.background
  );
  const [cols, setCols] = useState(editor.grid.cols);
  const [rows, setRows] = useState(editor.grid.rows);
  const [cellSize, setCellSize] = useState(editor.grid.cellSize);
  const [offsetX, setOffsetX] = useState(editor.grid.offsetX);
  const [offsetY, setOffsetY] = useState(editor.grid.offsetY);
  const [imageScale, setImageScale] = useState(editor.grid.imageScale);

  const grid: GridConfig = useMemo(
    () => ({
      ...editor.grid,
      cols,
      rows,
      cellSize,
      offsetX,
      offsetY,
      imageScale,
      visible: true,
    }),
    [editor.grid, cols, rows, cellSize, offsetX, offsetY, imageScale]
  );

  const mismatch = useMemo(
    () => (background ? aspectMismatch(background, grid) : null),
    [background, grid]
  );

  /** Immagine appena scelta: si leggono le dimensioni native. */
  const handleImage = (url: string) => {
    if (!url) {
      setBackground(null);
      return;
    }
    const probe = new window.Image();
    probe.onload = () => {
      setBackground({
        url,
        naturalWidth: probe.naturalWidth,
        naturalHeight: probe.naturalHeight,
        fit: "COVER",
        rotation: 0,
        dim: 0,
      });
      // La griglia parte dalle proporzioni dell'immagine: il Master
      // corregge, non ricomincia.
      const suggested = suggestGrid(
        probe.naturalWidth,
        probe.naturalHeight,
        Math.max(cols, rows)
      );
      setCols(suggested.cols);
      setRows(suggested.rows);
    };
    probe.onerror = () =>
      toast.error("Immagine non leggibile", {
        description: "Controlla l'URL o carica un altro file",
      });
    probe.src = url;
  };

  const confirm = () => {
    // Non si scrive nulla sul server da qui: la bozza dell'editor si
    // aggiorna e l'autosalvataggio farà il resto.
    editor.patchBattle({ background, grid });
    toast.success("Battlemap pronta", {
      description: "Ora puoi configurare gli elementi dell'immagine.",
    });
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Battlemap</DialogTitle>
          <DialogDescription>
            L&apos;ambiente è già disegnato nell&apos;immagine. Qui si fa
            combaciare la griglia con ciò che si vede: il resto è
            configurazione, e si fa nell&apos;editor.
          </DialogDescription>
        </DialogHeader>

        <ol className="flex flex-wrap items-center gap-1 text-[11px]">
          {STEPS.map((entry, index) => (
            <li key={entry.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "rounded-full border px-2.5 py-1 transition-colors",
                  index === step
                    ? "border-gold/50 bg-gold/10 text-gold-bright"
                    : index < step
                      ? "border-hairline text-muted-foreground"
                      : "border-transparent text-muted-foreground/60"
                )}
              >
                {index < step && <Check className="mr-1 inline size-3" />}
                {entry.label}
              </button>
              {index < STEPS.length - 1 && (
                <ChevronRight className="size-3 text-muted-foreground/50" />
              )}
            </li>
          ))}
        </ol>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_17rem]">
          <ImagePreview background={background} grid={grid} />

          <div className="space-y-4">
            {step === 0 && (
              <section className="space-y-3">
                <Heading>L&apos;immagine della mappa</Heading>
                <ImageUpload
                  value={background?.url ?? ""}
                  onChange={handleImage}
                  folder="battlemap"
                />
                {background ? (
                  <p className="text-[11px] text-muted-foreground">
                    {background.naturalWidth} × {background.naturalHeight} px.
                    L&apos;immagine resta intatta: nulla di ciò che
                    configurerai la modificherà.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Puoi anche procedere senza immagine e lavorare sulla sola
                    griglia, ma il campo resterà nudo.
                  </p>
                )}
              </section>
            )}

            {step === 1 && (
              <section className="space-y-3">
                <Heading>Quante caselle</Heading>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Conta le caselle sulla mappa che hai caricato: se ne ha già
                  una disegnata, indica lo stesso numero.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    Colonne
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      value={cols}
                      onChange={(event) => setCols(Number(event.target.value) || 2)}
                      className="mt-1 tabular-nums"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Righe
                    <Input
                      type="number"
                      min={2}
                      max={100}
                      value={rows}
                      onChange={(event) => setRows(Number(event.target.value) || 2)}
                      className="mt-1 tabular-nums"
                    />
                  </label>
                </div>

                <div>
                  <span className="text-xs text-muted-foreground">
                    Quanto vale una casella
                  </span>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {CELL_SIZE_PRESETS[grid.unit].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant={cellSize === preset ? "default" : "outline"}
                        onClick={() => setCellSize(preset)}
                      >
                        {formatDistance(preset, grid.unit)}
                      </Button>
                    ))}
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Campo di{" "}
                  {formatDistance(cols * cellSize, grid.unit)} ×{" "}
                  {formatDistance(rows * cellSize, grid.unit)}.
                </p>

                {mismatch && mismatch.delta > ASPECT_WARNING && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-[11px] text-amber-200/90">
                    <TriangleAlert className="mt-px size-3.5 shrink-0" />
                    <div className="space-y-2">
                      <p>
                        Le proporzioni della griglia non seguono quelle
                        dell&apos;immagine: le caselle risulteranno deformate.
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (!background) return;
                          const suggested = suggestGrid(
                            background.naturalWidth,
                            background.naturalHeight,
                            Math.max(cols, rows)
                          );
                          setCols(suggested.cols);
                          setRows(suggested.rows);
                        }}
                      >
                        Adatta all&apos;immagine
                      </Button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="space-y-3">
                <Heading>Fai combaciare la griglia</Heading>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Sposta e scala finché le linee cadono sopra quelle disegnate
                  nell&apos;immagine. Se l&apos;immagine non ha una griglia,
                  lascia tutto a zero.
                </p>
                <Slider
                  label="Scostamento orizzontale"
                  value={offsetX}
                  min={-1}
                  max={1}
                  step={0.02}
                  format={(value) => value.toFixed(2)}
                  onChange={setOffsetX}
                />
                <Slider
                  label="Scostamento verticale"
                  value={offsetY}
                  min={-1}
                  max={1}
                  step={0.02}
                  format={(value) => value.toFixed(2)}
                  onChange={setOffsetY}
                />
                <Slider
                  label="Scala dell'immagine"
                  value={imageScale}
                  min={0.5}
                  max={2}
                  step={0.01}
                  format={(value) => `${Math.round(value * 100)}%`}
                  onChange={setImageScale}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOffsetX(0);
                    setOffsetY(0);
                    setImageScale(1);
                  }}
                >
                  Azzera l&apos;allineamento
                </Button>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-3">
                <Heading>Tutto pronto</Heading>
                <dl className="space-y-1 text-xs">
                  <Row
                    label="Immagine"
                    value={background ? "Caricata" : "Nessuna"}
                  />
                  <Row label="Griglia" value={`${cols} × ${rows}`} />
                  <Row
                    label="Casella"
                    value={formatDistance(cellSize, grid.unit)}
                  />
                </dl>
                <p className="rounded-lg border border-hairline bg-surface-2/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  Da qui in poi il lavoro è interpretare l&apos;immagine:
                  seleziona le caselle di un muro, di una porta o di una roccia
                  e dichiara che cosa sono. La configurazione resta invisibile
                  ai giocatori.
                </p>
              </section>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={step === 0}
            onClick={() => setStep((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-3.5" />
            Indietro
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                size="sm"
                onClick={() =>
                  setStep((current) => Math.min(STEPS.length - 1, current + 1))
                }
              >
                Avanti
                <ChevronRight className="size-3.5" />
              </Button>
            ) : (
              <Button size="sm" onClick={confirm}>
                <Check className="size-3.5" />
                Entra nell&apos;editor
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Immagine + griglia: la stessa coppia che vedrà il tavolo. */
function ImagePreview({
  background,
  grid,
}: {
  background: BackgroundImage | null;
  grid: GridConfig;
}) {
  const cellPx = Math.max(6, Math.floor(520 / Math.max(grid.cols, grid.rows)));

  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-hairline bg-surface-0">
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative"
          style={{ width: grid.cols * cellPx, height: grid.rows * cellPx }}
        >
          {background ? (
            <Image
              src={optimizeCloudinary(background.url, 1400)}
              alt=""
              fill
              className="object-cover"
              style={{ transform: `scale(${grid.imageScale})` }}
            />
          ) : (
            <div className="absolute inset-0 bg-surface-1" />
          )}
          <BattleGrid grid={grid} cellPx={cellPx} className="absolute inset-0" />
        </div>
      </div>
    </div>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-[0.7rem] tracking-[0.16em] text-gold/80 uppercase">
      {children}
    </p>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <span className="tabular-nums">{format(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-7 w-full cursor-pointer accent-[var(--gold)]"
      />
    </label>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
