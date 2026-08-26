"use client";

import { Check, Dices, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  generateTacticalMap,
  MAP_PRESETS,
  type PresetId,
} from "@/features/battle/engine/generator";
import { buildObstacleIndex, mapWeight } from "@/features/battle/engine/tactical";
import { cn } from "@/lib/utils";
import type { GridConfig } from "@/types/battle";

import { MapLayers } from "./map-layers";
import { useEditor } from "./use-editor";

/* ============================================================
 * Creazione guidata.
 *
 * Serve a UNA cosa: avere in trenta secondi una mappa credibile su cui
 * lavorare. Non è il posto in cui si configura tutto — quello è
 * l'editor, dove ogni scelta resta modificabile per sempre.
 * ============================================================ */

const STEPS = [
  { id: "SIZE", label: "Configurazione" },
  { id: "TERRAIN", label: "Terreno" },
  { id: "STRUCTURE", label: "Struttura" },
  { id: "DETAILS", label: "Dettagli" },
  { id: "SUMMARY", label: "Riepilogo" },
] as const;

const SIZE_PRESETS = [
  { label: "Scaramuccia", cols: 16, rows: 12 },
  { label: "Standard", cols: 24, rows: 18 },
  { label: "Ampia", cols: 32, rows: 24 },
  { label: "Epica", cols: 44, rows: 32 },
];

export function QuickMapWizard({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editor = useEditor();
  const [step, setStep] = useState(0);
  const [cols, setCols] = useState(editor.grid.cols);
  const [rows, setRows] = useState(editor.grid.rows);
  const [preset, setPreset] = useState<PresetId>("FOREST");
  const [density, setDensity] = useState(0.5);
  const [elevation, setElevation] = useState(0.4);
  const [water, setWater] = useState(true);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 100000));
  const [coordinates, setCoordinates] = useState(false);

  const generated = useMemo(
    () =>
      generateTacticalMap({
        preset,
        cols,
        rows,
        seed,
        density,
        elevation,
        water,
      }),
    [preset, cols, rows, seed, density, elevation, water]
  );

  const previewGrid: GridConfig = { ...editor.battle.grid, cols, rows };
  const weight = mapWeight(generated);

  const confirm = () => {
    editor.resizeGrid(cols, rows);
    editor.replaceMap({
      ...generated,
      settings: { ...generated.settings, showCoordinates: coordinates },
    });
    onOpenChange(false);
    setStep(0);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuova battlemap</DialogTitle>
          <DialogDescription>
            Quattro scelte e una mappa da cui partire. Tutto resterà
            modificabile nell&apos;editor, cella per cella.
          </DialogDescription>
        </DialogHeader>

        {/* --------------------------- Passi ---------------------------- */}
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

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_18rem]">
          {/* ------------------------ Anteprima ------------------------ */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-hairline bg-surface-0">
            <MapPreview map={generated} grid={previewGrid} />
          </div>

          {/* ------------------------- Controlli ----------------------- */}
          <div className="space-y-4">
            {step === 0 && (
              <section className="space-y-3">
                <WizardHeading>Dimensioni del campo</WizardHeading>
                <div className="grid grid-cols-2 gap-1.5">
                  {SIZE_PRESETS.map((entry) => (
                    <button
                      key={entry.label}
                      type="button"
                      onClick={() => {
                        setCols(entry.cols);
                        setRows(entry.rows);
                      }}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-left text-xs transition-colors",
                        cols === entry.cols && rows === entry.rows
                          ? "border-gold/50 bg-gold/10 text-gold-bright"
                          : "border-hairline text-muted-foreground hover:bg-surface-2"
                      )}
                    >
                      <span className="block">{entry.label}</span>
                      <span className="text-[11px] tabular-nums opacity-70">
                        {entry.cols} × {entry.rows}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-muted-foreground">
                    Colonne
                    <Input
                      type="number"
                      min={4}
                      max={100}
                      value={cols}
                      onChange={(event) => setCols(Number(event.target.value) || 4)}
                      className="mt-1 tabular-nums"
                    />
                  </label>
                  <label className="text-xs text-muted-foreground">
                    Righe
                    <Input
                      type="number"
                      min={4}
                      max={100}
                      value={rows}
                      onChange={(event) => setRows(Number(event.target.value) || 4)}
                      className="mt-1 tabular-nums"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Con celle da {editor.battle.grid.cellSize}{" "}
                  {editor.battle.grid.unit} il campo misura{" "}
                  {(cols * editor.battle.grid.cellSize).toLocaleString("it-IT")} ×{" "}
                  {(rows * editor.battle.grid.cellSize).toLocaleString("it-IT")}{" "}
                  {editor.battle.grid.unit}.
                </p>
              </section>
            )}

            {step === 1 && (
              <section className="space-y-3">
                <WizardHeading>Che luogo è</WizardHeading>
                <div className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto pr-1">
                  {MAP_PRESETS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      title={entry.description}
                      onClick={() => setPreset(entry.id)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-left text-xs transition-colors",
                        preset === entry.id
                          ? "border-gold/50 bg-gold/10 text-gold-bright"
                          : "border-hairline text-muted-foreground hover:bg-surface-2"
                      )}
                    >
                      {entry.label}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="space-y-4">
                <WizardHeading>Struttura del terreno</WizardHeading>
                <SliderRow
                  label="Densità"
                  hint="Quanti alberi, massi, macerie e stanze."
                  value={density}
                  onChange={setDensity}
                />
                <SliderRow
                  label="Dislivelli"
                  hint="Ampiezza di colline e depressioni."
                  value={elevation}
                  onChange={setElevation}
                />
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Includi specchi d&apos;acqua
                  </span>
                  <Switch checked={water} onCheckedChange={setWater} />
                </label>
              </section>
            )}

            {step === 3 && (
              <section className="space-y-3">
                <WizardHeading>Dettagli</WizardHeading>
                <label className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Mostra le coordinate
                  </span>
                  <Switch
                    checked={coordinates}
                    onCheckedChange={setCoordinates}
                  />
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setSeed(Math.floor(Math.random() * 100000))}
                >
                  <Dices className="size-3.5" />
                  Rigenera la disposizione
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  Ogni seme produce sempre la stessa mappa: se una versione ti
                  piace, puoi tornarci.
                </p>
                <label className="text-xs text-muted-foreground">
                  Seme
                  <Input
                    type="number"
                    value={seed}
                    onChange={(event) => setSeed(Number(event.target.value) || 0)}
                    className="mt-1 tabular-nums"
                  />
                </label>
              </section>
            )}

            {step === 4 && (
              <section className="space-y-3">
                <WizardHeading>Riepilogo</WizardHeading>
                <dl className="space-y-1 text-xs">
                  <SummaryRow
                    label="Preset"
                    value={
                      MAP_PRESETS.find((entry) => entry.id === preset)?.label ?? ""
                    }
                  />
                  <SummaryRow label="Dimensioni" value={`${cols} × ${rows}`} />
                  <SummaryRow
                    label="Celle dipinte"
                    value={String(weight.cells)}
                  />
                  <SummaryRow label="Elementi" value={String(weight.elements)} />
                </dl>
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] text-amber-200/90">
                  Confermando, la mappa attuale viene sostituita e lo storico
                  delle modifiche riparte da zero.
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
                Crea ed entra nell&apos;editor
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Anteprima statica: gli stessi layer dell'editor, in piccolo. */
function MapPreview({
  map,
  grid,
}: {
  map: ReturnType<typeof generateTacticalMap>;
  grid: GridConfig;
}) {
  const obstacles = useMemo(() => buildObstacleIndex(map), [map]);
  const cellPx = Math.max(4, Math.floor(480 / Math.max(grid.cols, grid.rows)));

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="relative"
        style={{ width: grid.cols * cellPx, height: grid.rows * cellPx }}
      >
        <div className="absolute inset-0 bg-surface-1" />
        <MapLayers
          map={map}
          grid={grid}
          cellPx={cellPx}
          obstacles={obstacles}
          mode="PREVIEW"
          showCoordinates={false}
        />
      </div>
    </div>
  );
}

function WizardHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-heading text-[0.7rem] tracking-[0.16em] text-gold/80 uppercase">
      {children}
    </p>
  );
}

function SliderRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <span className="tabular-nums">{Math.round(value * 100)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-7 w-full cursor-pointer accent-[var(--gold)]"
      />
      <span className="text-[11px] text-muted-foreground">{hint}</span>
    </label>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
