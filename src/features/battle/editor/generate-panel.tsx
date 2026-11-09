"use client";

import { Dices, Sparkles, Wand2 } from "lucide-react";
import { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_GENERATION,
  ENVIRONMENTS,
  GENERATION_LAYERS,
  generateTacticalStructure,
  regenerateLayer,
  suggestSize,
  type EnvironmentId,
  type GenerationLayer,
  type GenerationOptions,
} from "@/features/battle/engine/generator";
import { cn } from "@/lib/utils";

import { useEditor } from "./use-editor";

/* ============================================================
 * Generazione della struttura tattica.
 *
 * Non produce un'immagine: produce ciò che il motore deve sapere —
 * caselle con costi e quote, elementi ambientali dal catalogo, zone
 * semantiche e punti di interesse. L'immagine resta quella che il Master
 * carica; questa è la struttura che le sta sotto.
 *
 * Lo stesso seme restituisce la stessa mappa: rigenerare è ripetibile,
 * e una struttura che piace si può ritrovare.
 * ============================================================ */

const LAYER_LABELS: Record<GenerationLayer, string> = {
  terrain: "Terreno",
  elevation: "Quote",
  water: "Acque",
  structures: "Strutture",
  vegetation: "Vegetazione",
  obstacles: "Ostacoli e ripari",
  poi: "Zone e punti di interesse",
};

export function GeneratePanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const editor = useEditor();

  const [environment, setEnvironment] = useState<EnvironmentId>("FOREST");
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const [partySize, setPartySize] = useState(4);
  const [enemyCount, setEnemyCount] = useState(5);
  const [tuning, setTuning] = useState(DEFAULT_GENERATION);
  const [preview, setPreview] = useState<string[] | null>(null);

  const options: GenerationOptions = useMemo(
    () => ({
      ...tuning,
      environment,
      cols: editor.grid.cols,
      rows: editor.grid.rows,
      seed,
      partySize,
      enemyCount,
    }),
    [tuning, environment, editor.grid.cols, editor.grid.rows, seed, partySize, enemyCount]
  );

  const suggested = suggestSize(partySize, enemyCount);
  const sizeIsTight =
    editor.grid.cols * editor.grid.rows < suggested.cols * suggested.rows * 0.6;

  const generate = () => {
    const result = generateTacticalStructure(options);
    editor.replaceMap(result.map);
    setPreview(result.report);
    toast.success("Struttura generata", {
      description: `${Object.keys(result.map.cells).length} caselle, ${result.map.objects.length} elementi.`,
    });
  };

  const regenerate = (layer: GenerationLayer) => {
    const result = regenerateLayer(editor.map, layer, options);
    editor.replaceMap(result.map);
    setPreview(result.report);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Genera la struttura tattica</DialogTitle>
          <DialogDescription>
            Caselle, quote, elementi, zone e schieramenti. L&apos;immagine
            resta la tua: qui nasce ciò che il motore userà per movimento,
            copertura e linea di vista.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <Heading>Ambiente</Heading>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            {ENVIRONMENTS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                title={entry.description}
                onClick={() => setEnvironment(entry.id)}
                className={cn(
                  "rounded-lg border px-2 py-1.5 text-[11px] transition-colors",
                  environment === entry.id
                    ? "border-gold/50 bg-gold/10 text-gold-bright"
                    : "border-hairline text-muted-foreground hover:bg-surface-2"
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <Heading>Lo scontro previsto</Heading>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">
              Personaggi
              <Input
                type="number"
                min={1}
                max={12}
                value={partySize}
                onChange={(event) => setPartySize(Number(event.target.value) || 1)}
                className="mt-1 tabular-nums"
              />
            </label>
            <label className="text-xs text-muted-foreground">
              Nemici
              <Input
                type="number"
                min={1}
                max={40}
                value={enemyCount}
                onChange={(event) => setEnemyCount(Number(event.target.value) || 1)}
                className="mt-1 tabular-nums"
              />
            </label>
          </div>
          <p
            className={cn(
              "text-[11px]",
              sizeIsTight ? "text-amber-300" : "text-muted-foreground"
            )}
          >
            Griglia attuale {editor.grid.cols}×{editor.grid.rows}
            {sizeIsTight
              ? ` — per questo scontro starebbe meglio ${suggested.cols}×${suggested.rows}.`
              : " — spazio sufficiente."}
            {sizeIsTight && (
              <Button
                variant="link"
                size="sm"
                className="h-auto px-1 py-0 text-[11px]"
                onClick={() => editor.resizeGrid(suggested.cols, suggested.rows)}
              >
                Adegua
              </Button>
            )}
          </p>
        </section>

        <section className="grid gap-3 sm:grid-cols-2">
          <Slider
            label="Terreno difficile"
            value={tuning.difficultTerrain}
            onChange={(difficultTerrain) =>
              setTuning((current) => ({ ...current, difficultTerrain }))
            }
          />
          <Slider
            label="Acqua"
            value={tuning.water}
            onChange={(water) => setTuning((current) => ({ ...current, water }))}
          />
          <Slider
            label="Strutture"
            value={tuning.structures}
            onChange={(structures) =>
              setTuning((current) => ({ ...current, structures }))
            }
          />
          <Slider
            label="Coperture"
            value={tuning.cover}
            onChange={(cover) => setTuning((current) => ({ ...current, cover }))}
          />
          <Slider
            label="Ostacoli"
            value={tuning.obstacles}
            onChange={(obstacles) =>
              setTuning((current) => ({ ...current, obstacles }))
            }
          />
          <Slider
            label="Verticalità"
            value={tuning.verticality}
            onChange={(verticality) =>
              setTuning((current) => ({ ...current, verticality }))
            }
          />
          <Slider
            label="Vegetazione"
            value={tuning.vegetation}
            onChange={(vegetation) =>
              setTuning((current) => ({ ...current, vegetation }))
            }
          />
          <Slider
            label="Pericolosità"
            value={tuning.danger}
            onChange={(danger) => setTuning((current) => ({ ...current, danger }))}
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              checked={tuning.symmetry}
              onCheckedChange={(symmetry) =>
                setTuning((current) => ({ ...current, symmetry }))
              }
            />
            Simmetrica
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            Seme
            <Input
              type="number"
              value={seed}
              onChange={(event) => setSeed(Number(event.target.value) || 0)}
              className="h-8 w-28 tabular-nums"
            />
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSeed(Math.floor(Math.random() * 1_000_000))}
          >
            <Dices className="size-3.5" />
            Nuovo seme
          </Button>
        </div>

        {preview && (
          <div className="rounded-xl border border-hairline bg-surface-2/50 p-3">
            <p className="mb-1 font-heading text-[0.65rem] tracking-[0.14em] text-gold/80 uppercase">
              <Sparkles className="mr-1 inline size-3" />
              Struttura generata
            </p>
            <ul className="space-y-0.5 text-[11px] text-muted-foreground">
              {preview.map((line, index) => (
                <li key={index}>{line}</li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap gap-1">
              {GENERATION_LAYERS.map((layer) => (
                <Button
                  key={layer}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => regenerate(layer)}
                >
                  Rigenera {LAYER_LABELS[layer].toLowerCase()}
                </Button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          <Button onClick={generate}>
            <Wand2 className="size-3.5" />
            Genera
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
  onChange,
}: {
  label: string;
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
        className="h-6 w-full cursor-pointer accent-[var(--gold)]"
      />
    </label>
  );
}
