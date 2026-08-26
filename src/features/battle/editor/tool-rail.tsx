"use client";

import {
  Boxes,
  Circle,
  DoorClosed,
  Droplets,
  Eraser,
  Hand,
  Layers,
  MinusSquare,
  MountainSnow,
  MousePointer2,
  PaintBucket,
  PenLine,
  Shield,
  Slash,
  Sparkles,
  Square,
  TriangleAlert,
  Waves,
  Brush as BrushIcon,
  BrickWall,
  type LucideIcon,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HAZARD_LABELS,
  AREA_PRESETS,
  TRAP_LIBRARY,
} from "@/features/battle/library";
import {
  allTerrains,
  TERRAIN_CATEGORY_LABELS,
} from "@/features/battle/terrain";
import { cn } from "@/lib/utils";
import {
  HAZARD_KINDS,
  type BrushShape,
  type EditorTool,
  type HazardKind,
} from "@/types/battlemap";

import { isPaintingTool } from "./operations";
import { useEditor } from "./use-editor";

/* ============================================================
 * Barra degli strumenti.
 *
 * Icone e scorciatoie, nessuna emoji. Sotto agli strumenti compaiono
 * SOLO le opzioni di quello attivo: il pannello non diventa mai un
 * elenco di controlli inerti.
 * ============================================================ */

interface ToolEntry {
  tool: EditorTool;
  label: string;
  icon: LucideIcon;
  shortcut: string;
}

export const TOOL_ENTRIES: ToolEntry[] = [
  { tool: "SELECT", label: "Seleziona", icon: MousePointer2, shortcut: "V" },
  { tool: "PAN", label: "Sposta la vista", icon: Hand, shortcut: "H" },
  { tool: "TERRAIN", label: "Terreno", icon: BrushIcon, shortcut: "T" },
  { tool: "ELEVATION", label: "Quote e dislivelli", icon: MountainSnow, shortcut: "E" },
  { tool: "WATER", label: "Acqua", icon: Waves, shortcut: "Q" },
  { tool: "WALL", label: "Muri", icon: BrickWall, shortcut: "W" },
  { tool: "OBSTACLE", label: "Ostacoli", icon: Boxes, shortcut: "O" },
  { tool: "DOOR", label: "Porte e meccanismi", icon: DoorClosed, shortcut: "D" },
  { tool: "TRAP", label: "Trappole", icon: TriangleAlert, shortcut: "R" },
  { tool: "HAZARD", label: "Pericoli", icon: Droplets, shortcut: "Z" },
  { tool: "AREA", label: "Aree d'effetto", icon: Sparkles, shortcut: "A" },
  { tool: "COVER", label: "Copertura", icon: Shield, shortcut: "C" },
  { tool: "ERASER", label: "Cancella", icon: Eraser, shortcut: "X" },
];

const BRUSH_ENTRIES: { shape: BrushShape; label: string; icon: LucideIcon }[] = [
  { shape: "PENCIL", label: "Matita", icon: PenLine },
  { shape: "BRUSH", label: "Pennello", icon: BrushIcon },
  { shape: "RECTANGLE", label: "Rettangolo", icon: Square },
  { shape: "CIRCLE", label: "Cerchio", icon: Circle },
  { shape: "LINE", label: "Linea", icon: Slash },
  { shape: "FILL", label: "Riempimento", icon: PaintBucket },
];

export function ToolRail() {
  const editor = useEditor();
  const { tools, setTools, brushShape, setBrushShape, brushSize, setBrushSize } =
    editor;

  const setTool = (tool: EditorTool) =>
    setTools((current) => ({ ...current, tool }));

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      {/* --------------------------- Strumenti --------------------------- */}
      <div className="grid grid-cols-2 gap-1 border-b border-hairline p-2">
        {TOOL_ENTRIES.map((entry) => {
          const Icon = entry.icon;
          const active = tools.tool === entry.tool;
          return (
            <Tooltip key={entry.tool}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTool(entry.tool)}
                  className={cn(
                    "flex h-10 items-center justify-center rounded-lg border transition-colors",
                    active
                      ? "border-gold/60 bg-gold/15 text-gold-bright"
                      : "border-transparent text-muted-foreground hover:border-hairline hover:bg-surface-2"
                  )}
                >
                  <Icon className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {entry.label}
                <span className="ml-2 text-muted-foreground">{entry.shortcut}</span>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* ------------------------ Opzioni contestuali -------------------- */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
        {isPaintingTool(tools.tool) && (
          <section>
            <RailHeading>Forma</RailHeading>
            <div className="grid grid-cols-3 gap-1">
              {BRUSH_ENTRIES.map((entry) => {
                const Icon = entry.icon;
                return (
                  <Tooltip key={entry.shape}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-pressed={brushShape === entry.shape}
                        onClick={() => setBrushShape(entry.shape)}
                        className={cn(
                          "flex h-8 items-center justify-center rounded-md border text-muted-foreground transition-colors",
                          brushShape === entry.shape
                            ? "border-gold/50 bg-gold/10 text-gold-bright"
                            : "border-hairline hover:bg-surface-2"
                        )}
                      >
                        <Icon className="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{entry.label}</TooltipContent>
                  </Tooltip>
                );
              })}
            </div>

            {brushShape === "BRUSH" && (
              <label className="mt-3 block">
                <span className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  Dimensione pennello
                  <span className="tabular-nums">{brushSize}</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={9}
                  step={1}
                  value={brushSize}
                  onChange={(event) => setBrushSize(Number(event.target.value))}
                  className="h-7 w-full cursor-pointer accent-[var(--gold)]"
                />
              </label>
            )}
          </section>
        )}

        {tools.tool === "TERRAIN" && <TerrainPalette />}

        {tools.tool === "WATER" && (
          <section>
            <RailHeading>Profondità</RailHeading>
            <OptionList
              options={[
                { value: "SHALLOW_WATER", label: "Acqua bassa" },
                { value: "SWAMP", label: "Palude" },
                { value: "DEEP_WATER", label: "Acqua profonda" },
              ]}
              value={tools.waterTerrain}
              onChange={(value) =>
                setTools((current) => ({ ...current, waterTerrain: value }))
              }
            />
          </section>
        )}

        {tools.tool === "ELEVATION" && (
          <section>
            <RailHeading>Modo</RailHeading>
            <OptionList
              options={[
                { value: "RAISE", label: "Rialza" },
                { value: "LOWER", label: "Abbassa" },
                { value: "SET", label: "Imposta quota" },
                { value: "LEVEL", label: "Livella l'area" },
              ]}
              value={tools.elevationMode}
              onChange={(value) =>
                setTools((current) => ({
                  ...current,
                  elevationMode: value as typeof current.elevationMode,
                }))
              }
            />
            {tools.elevationMode === "SET" && (
              <label className="mt-3 block">
                <span className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  Quota
                  <span className="tabular-nums">{tools.elevationValue}</span>
                </span>
                <input
                  type="range"
                  min={-4}
                  max={8}
                  step={1}
                  value={tools.elevationValue}
                  onChange={(event) =>
                    setTools((current) => ({
                      ...current,
                      elevationValue: Number(event.target.value),
                    }))
                  }
                  className="h-7 w-full cursor-pointer accent-[var(--gold)]"
                />
              </label>
            )}
          </section>
        )}

        {tools.tool === "COVER" && (
          <section>
            <RailHeading>Grado</RailHeading>
            <OptionList
              options={[
                { value: "NONE", label: "Nessuna" },
                { value: "HALF", label: "Mezza" },
                { value: "THREE_QUARTERS", label: "Tre quarti" },
                { value: "TOTAL", label: "Totale" },
              ]}
              value={tools.coverLevel}
              onChange={(value) =>
                setTools((current) => ({
                  ...current,
                  coverLevel: value as typeof current.coverLevel,
                }))
              }
            />
          </section>
        )}

        {tools.tool === "TRAP" && (
          <section>
            <RailHeading>Trappola</RailHeading>
            <OptionList
              options={TRAP_LIBRARY.map((trap) => ({
                value: trap.id,
                label: trap.label,
              }))}
              value={tools.trapTemplateId}
              onChange={(value) =>
                setTools((current) => ({ ...current, trapTemplateId: value }))
              }
            />
            <p className="mt-2 text-[11px] text-muted-foreground">
              Trascina per estendere la trappola su più celle.
            </p>
          </section>
        )}

        {tools.tool === "HAZARD" && (
          <section>
            <RailHeading>Pericolo</RailHeading>
            <OptionList
              options={HAZARD_KINDS.map((kind) => ({
                value: kind,
                label: HAZARD_LABELS[kind],
              }))}
              value={tools.hazardKind}
              onChange={(value) =>
                setTools((current) => ({
                  ...current,
                  hazardKind: value as HazardKind,
                }))
              }
            />
          </section>
        )}

        {tools.tool === "AREA" && (
          <section>
            <RailHeading>Effetto</RailHeading>
            <OptionList
              options={AREA_PRESETS.map((preset, index) => ({
                value: String(index),
                label: preset.name,
              }))}
              value={String(tools.areaPreset)}
              onChange={(value) =>
                setTools((current) => ({
                  ...current,
                  areaPreset: Number(value),
                }))
              }
            />
          </section>
        )}

        {(tools.tool === "OBSTACLE" ||
          tools.tool === "DOOR" ||
          tools.tool === "OBJECT") && (
          <p className="rounded-lg border border-hairline bg-surface-2/60 p-2.5 text-[11px] text-muted-foreground">
            <Layers className="mr-1 inline size-3.5" />
            Scegli l&apos;oggetto dalla Libreria, poi fai clic sulla mappa per
            posarlo.
          </p>
        )}

        {tools.tool === "SELECT" && (
          <p className="rounded-lg border border-hairline bg-surface-2/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
            Trascina per selezionare un&apos;area. <br />
            <span className="text-foreground">Shift</span> aggiunge,{" "}
            <span className="text-foreground">Ctrl</span> inverte.
            <br />
            Un clic su un elemento ne apre le proprietà.
          </p>
        )}
      </div>
    </div>
  );
}

function RailHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 font-heading text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

function OptionList<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="space-y-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            "w-full rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
            value === option.value
              ? "border-gold/50 bg-gold/10 text-gold-bright"
              : "border-hairline text-muted-foreground hover:bg-surface-2"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Tavolozza dei terreni, raggruppata per categoria. */
function TerrainPalette() {
  const editor = useEditor();
  const { tools, setTools, map } = editor;
  const terrains = allTerrains(map.settings.customTerrains);

  const categories = [...new Set(terrains.map((terrain) => terrain.category))];

  return (
    <section>
      <RailHeading>Terreni</RailHeading>
      <div className="space-y-3">
        {categories.map((category) => (
          <div key={category}>
            <p className="mb-1 text-[10px] tracking-wide text-muted-foreground/70 uppercase">
              {TERRAIN_CATEGORY_LABELS[category] ?? category}
            </p>
            <div className="grid grid-cols-1 gap-1">
              {terrains
                .filter((terrain) => terrain.category === category)
                .map((terrain) => (
                  <button
                    key={terrain.id}
                    type="button"
                    title={terrain.description}
                    aria-pressed={tools.terrainId === terrain.id}
                    onClick={() =>
                      setTools((current) => ({
                        ...current,
                        terrainId: terrain.id,
                      }))
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                      tools.terrainId === terrain.id
                        ? "border-gold/50 bg-gold/10 text-gold-bright"
                        : "border-hairline text-muted-foreground hover:bg-surface-2"
                    )}
                  >
                    <span
                      className="size-3.5 shrink-0 rounded-sm border border-hairline"
                      style={{
                        backgroundColor:
                          terrain.color === "transparent"
                            ? "var(--surface-3)"
                            : terrain.color,
                      }}
                    />
                    <span className="min-w-0 flex-1 truncate">{terrain.label}</span>
                    {terrain.movementCost === null ? (
                      <MinusSquare className="size-3 shrink-0 text-crimson-light" />
                    ) : terrain.difficult ? (
                      <span className="shrink-0 text-[10px] tabular-nums text-amber-300">
                        ×{terrain.movementCost}
                      </span>
                    ) : null}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
