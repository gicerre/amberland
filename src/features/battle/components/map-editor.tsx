"use client";

import {
  ArrowLeft,
  Compass,
  Grid3x3,
  Image as ImageIcon,
  Ruler,
  Save,
  Scroll,
  Trash2,
  TriangleAlert,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/shared/image-upload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  ConsoleField,
  ConsoleSectionHeading,
  ConsoleSegmented,
  TomePanel,
} from "@/design-system";
import {
  BATTLE_STATUS_BADGES,
  BATTLE_STATUS_LABELS,
  CELL_SIZE_PRESETS,
  DISTANCE_METRIC_HINTS,
  DISTANCE_METRIC_OPTIONS,
  DISTANCE_UNIT_LABELS,
  IMAGE_FIT_LABELS,
} from "@/features/battle/constants";
import {
  aspectMismatch,
  formatDistance,
  suggestGrid,
} from "@/features/battle/engine/geometry";
import {
  useDeleteBattle,
  useSetBattleStatus,
  useUpdateBattle,
} from "@/features/battle/data";
import { BATTLE_LIMITS, type Battle, type BackgroundImage, type GridConfig, type ImageFit, type MapRotation } from "@/types/battle";

import { BattleField } from "./battle-field";
import { CombatantRoster } from "./combatant-roster";

/* ============================================================
 * Preparazione del campo: identità, griglia, sfondo, calibrazione.
 *
 * La griglia è AUTOREVOLE, l'immagine le si adatta (COMBAT_SYSTEM §8.2):
 * per questo la mappa si configura in celle e i metri sono una lettura
 * derivata, mai il contrario.
 * ============================================================ */

const ROTATIONS: MapRotation[] = [0, 90, 180, 270];

/** Scarto di proporzioni oltre il quale conviene avvisare il Master. */
const ASPECT_WARNING = 0.08;

export function MapEditor({ battle }: { battle: Battle }) {
  const router = useRouter();
  const update = useUpdateBattle(battle.id);
  const setStatus = useSetBattleStatus(battle.id);
  const remove = useDeleteBattle();

  const [name, setName] = useState(battle.name);
  const [description, setDescription] = useState(battle.description);
  const [grid, setGrid] = useState<GridConfig>(battle.grid);
  const [background, setBackground] = useState<BackgroundImage | null>(
    battle.background
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [selectedCombatant, setSelectedCombatant] = useState<string | null>(null);

  // Ricarica i campi quando arriva una versione più fresca dal server
  // (es. dopo un salvataggio o il rientro nella pagina).
  useEffect(() => {
    setName(battle.name);
    setDescription(battle.description);
    setGrid(battle.grid);
    setBackground(battle.background);
  }, [battle]);

  const dirty =
    name !== battle.name ||
    description !== battle.description ||
    JSON.stringify(grid) !== JSON.stringify(battle.grid) ||
    JSON.stringify(background) !== JSON.stringify(battle.background);

  const patch = <K extends keyof GridConfig>(key: K, value: GridConfig[K]) =>
    setGrid((current) => ({ ...current, [key]: value }));

  const patchBackground = <K extends keyof BackgroundImage>(
    key: K,
    value: BackgroundImage[K]
  ) =>
    setBackground((current) => (current ? { ...current, [key]: value } : current));

  /** Sfondo appena scelto: si leggono le dimensioni native e si propone una griglia. */
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
    };
    probe.onerror = () =>
      toast.error("Immagine non leggibile", {
        description: "Controlla l'URL o carica un altro file",
      });
    probe.src = url;
  };

  const mismatch = useMemo(
    () => (background ? aspectMismatch(background, grid) : null),
    [background, grid]
  );

  const adoptSuggestedGrid = () => {
    if (!background) return;
    const longSide = Math.max(grid.cols, grid.rows);
    const suggested = suggestGrid(
      background.naturalWidth,
      background.naturalHeight,
      longSide
    );
    setGrid((current) => ({ ...current, ...suggested }));
  };

  const save = () => {
    update.mutate(
      { name, description, grid, background },
      { onSuccess: () => toast.success("Campo aggiornato") }
    );
  };

  const editable = battle.status === "DRAFT" || battle.status === "READY";
  const worldWidth = grid.cols * grid.cellSize;
  const worldHeight = grid.rows * grid.cellSize;

  return (
    <div className="space-y-6">
      {/* ───────────────────────── Testata ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/battaglie" aria-label="Torna ai campi di battaglia">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <p className="font-heading text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              Preparazione del campo
            </p>
            <h1 className="font-heading text-xl tracking-wide">
              {name || "Senza nome"}
            </h1>
          </div>
          <Badge className={BATTLE_STATUS_BADGES[battle.status]}>
            {BATTLE_STATUS_LABELS[battle.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="text-muted-foreground hover:text-crimson-bright"
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Elimina</span>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/battaglie/${battle.id}/editor`}>
              <Wand2 className="size-4" />
              <span className="hidden sm:inline">Battlemap Editor</span>
            </Link>
          </Button>
          {battle.status === "DRAFT" ? (
            <Button
              variant="outline"
              onClick={() => setStatus.mutate("READY")}
              disabled={setStatus.isPending || dirty}
              title={dirty ? "Salva prima le modifiche" : undefined}
            >
              Dichiara pronta
            </Button>
          ) : battle.status === "READY" ? (
            <Button
              variant="outline"
              onClick={() => setStatus.mutate("DRAFT")}
              disabled={setStatus.isPending}
            >
              Torna in bozza
            </Button>
          ) : null}
          <Button onClick={save} disabled={!dirty || update.isPending}>
            <Save className="size-4" />
            Salva
          </Button>
        </div>
      </div>

      {!editable && (
        <p className="rounded-xl border border-hairline bg-surface-1 px-4 py-3 text-sm text-muted-foreground">
          La battaglia è già stata aperta al party: griglia e sfondo non si
          modificano più, per non spostare il campo sotto le pedine.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* ─────────────────── Anteprima dal vivo ─────────────────── */}
        <div className="space-y-3">
          <BattleField
            battle={{ ...battle, grid, background }}
            selectedId={selectedCombatant}
            onSelect={setSelectedCombatant}
            className="h-[26rem] lg:h-[38rem]"
          />
          <p className="text-center text-xs text-muted-foreground">
            {grid.cols} × {grid.rows} celle ·{" "}
            {formatDistance(worldWidth, grid.unit)} ×{" "}
            {formatDistance(worldHeight, grid.unit)} · cella da{" "}
            {formatDistance(grid.cellSize, grid.unit)}
          </p>
        </div>

        {/* ───────────────────── Pannello di regia ─────────────────── */}
        <div className="space-y-5">
          <TomePanel>
            <ConsoleSectionHeading
              icon={<Scroll />}
              title="Identità"
              subtitle="Come il campo si presenta nell'elenco."
            />
            <div className="space-y-4">
              <ConsoleField label="Nome" required>
                <Input
                  value={name}
                  maxLength={BATTLE_LIMITS.maxNameLength}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Agguato al Passo del Corvo"
                />
              </ConsoleField>
              <ConsoleField label="Descrizione">
                <Textarea
                  value={description}
                  maxLength={BATTLE_LIMITS.maxDescriptionLength}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Cosa accade, e perché si combatte qui."
                  rows={3}
                />
              </ConsoleField>
            </div>
          </TomePanel>

          <CombatantRoster
            battle={battle}
            selectedId={selectedCombatant}
            onSelect={setSelectedCombatant}
          />

          <TomePanel>
            <ConsoleSectionHeading
              icon={<Grid3x3 />}
              title="Griglia"
              subtitle="Le celle sono la verità del campo: l'immagine si adatta a loro."
            />
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ConsoleField label="Colonne">
                  <NumberField
                    value={grid.cols}
                    min={BATTLE_LIMITS.minCols}
                    max={BATTLE_LIMITS.maxCols}
                    disabled={!editable}
                    onCommit={(value) => patch("cols", value)}
                  />
                </ConsoleField>
                <ConsoleField label="Righe">
                  <NumberField
                    value={grid.rows}
                    min={BATTLE_LIMITS.minRows}
                    max={BATTLE_LIMITS.maxRows}
                    disabled={!editable}
                    onCommit={(value) => patch("rows", value)}
                  />
                </ConsoleField>
              </div>

              <ConsoleField
                label="Unità di misura"
                hint="Cambia solo come si leggono le distanze, non la griglia."
              >
                <ConsoleSegmented
                  value={grid.unit}
                  onChange={(unit) => patch("unit", unit)}
                  options={[
                    { value: "m", label: DISTANCE_UNIT_LABELS.m },
                    { value: "ft", label: DISTANCE_UNIT_LABELS.ft },
                  ]}
                />
              </ConsoleField>

              <ConsoleField
                label={`Lato della cella (${grid.unit})`}
                hint="Quanto vale UNA cella nel mondo di gioco."
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {CELL_SIZE_PRESETS[grid.unit].map((preset) => (
                      <Button
                        key={preset}
                        type="button"
                        size="sm"
                        variant={grid.cellSize === preset ? "default" : "outline"}
                        disabled={!editable}
                        onClick={() => patch("cellSize", preset)}
                      >
                        {formatDistance(preset, grid.unit)}
                      </Button>
                    ))}
                  </div>
                  <NumberField
                    value={grid.cellSize}
                    min={BATTLE_LIMITS.minCellSize}
                    max={BATTLE_LIMITS.maxCellSize}
                    step={0.5}
                    decimals
                    disabled={!editable}
                    onCommit={(value) => patch("cellSize", value)}
                  />
                </div>
              </ConsoleField>

              <ConsoleField
                label="Metrica delle diagonali"
                hint={DISTANCE_METRIC_HINTS[grid.metric]}
              >
                <Select
                  value={grid.metric}
                  onValueChange={(value) =>
                    patch("metric", value as GridConfig["metric"])
                  }
                  disabled={!editable}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTANCE_METRIC_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConsoleField>

              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">
                  Disegna le linee della griglia
                </span>
                <Switch
                  checked={grid.visible}
                  onCheckedChange={(checked) => patch("visible", checked)}
                />
              </label>
            </div>
          </TomePanel>

          <TomePanel>
            <ConsoleSectionHeading
              icon={<ImageIcon />}
              title="Sfondo"
              subtitle="Facoltativo: senza immagine resta il campo nudo."
            />
            <div className="space-y-4">
              <ImageUpload
                value={background?.url ?? ""}
                onChange={handleImage}
                folder="battlemap"
              />

              {background && (
                <>
                  {mismatch && mismatch.delta > ASPECT_WARNING && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-200/90">
                      <TriangleAlert className="mt-px size-4 shrink-0" />
                      <div className="space-y-2">
                        <p>
                          L&apos;immagine è {ratio(mismatch.imageRatio)}, la
                          griglia {ratio(mismatch.gridRatio)}: con{" "}
                          {IMAGE_FIT_LABELS.COVER.toLowerCase()} verrà ritagliata.
                        </p>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!editable}
                          onClick={adoptSuggestedGrid}
                        >
                          Adatta la griglia all&apos;immagine
                        </Button>
                      </div>
                    </div>
                  )}

                  <ConsoleField label="Adattamento">
                    <ConsoleSegmented
                      value={background.fit}
                      onChange={(fit) => patchBackground("fit", fit as ImageFit)}
                      options={(
                        Object.keys(IMAGE_FIT_LABELS) as ImageFit[]
                      ).map((fit) => ({
                        value: fit,
                        label: IMAGE_FIT_LABELS[fit],
                      }))}
                    />
                  </ConsoleField>

                  <ConsoleField label="Rotazione">
                    <ConsoleSegmented
                      value={String(background.rotation)}
                      onChange={(value) =>
                        patchBackground(
                          "rotation",
                          Number(value) as MapRotation
                        )
                      }
                      options={ROTATIONS.map((rotation) => ({
                        value: String(rotation),
                        label: `${rotation}°`,
                      }))}
                    />
                  </ConsoleField>

                  <RangeField
                    label="Oscuramento"
                    value={background.dim}
                    min={0}
                    max={0.8}
                    step={0.05}
                    format={(value) => `${Math.round(value * 100)}%`}
                    onChange={(value) => patchBackground("dim", value)}
                    hint="Abbassa lo sfondo per far risaltare griglia e pedine."
                  />
                </>
              )}
            </div>
          </TomePanel>

          {background && (
            <TomePanel>
              <ConsoleSectionHeading
                icon={<Compass />}
                title="Calibrazione"
                subtitle="Per le mappe che hanno già una griglia disegnata sopra."
              />
              <div className="space-y-4">
                <RangeField
                  label="Scostamento orizzontale"
                  value={grid.offsetX}
                  min={-1}
                  max={1}
                  step={0.02}
                  disabled={!editable}
                  format={(value) => value.toFixed(2)}
                  onChange={(value) => patch("offsetX", value)}
                />
                <RangeField
                  label="Scostamento verticale"
                  value={grid.offsetY}
                  min={-1}
                  max={1}
                  step={0.02}
                  disabled={!editable}
                  format={(value) => value.toFixed(2)}
                  onChange={(value) => patch("offsetY", value)}
                />
                <RangeField
                  label="Scala dell'immagine"
                  value={grid.imageScale}
                  min={0.5}
                  max={2}
                  step={0.01}
                  disabled={!editable}
                  format={(value) => `${Math.round(value * 100)}%`}
                  onChange={(value) => patch("imageScale", value)}
                  hint="1 = l'immagine combacia con il riquadro della griglia."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!editable}
                  onClick={() =>
                    setGrid((current) => ({
                      ...current,
                      offsetX: 0,
                      offsetY: 0,
                      imageScale: 1,
                    }))
                  }
                >
                  <Ruler className="size-4" />
                  Azzera la calibrazione
                </Button>
              </div>
            </TomePanel>
          )}
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smantellare il campo?</AlertDialogTitle>
            <AlertDialogDescription>
              «{battle.name}» sparisce con tutto ciò che contiene: pedine,
              segreti e cronaca dello scontro. L&apos;operazione è definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(battle.id, {
                  onSuccess: () => router.push("/battaglie"),
                })
              }
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** "16:9" leggibile a partire da un rapporto numerico. */
function ratio(value: number): string {
  return `${value.toFixed(2)}:1`;
}

/**
 * Campo numerico che accetta anche lo stato vuoto durante la digitazione:
 * il valore vero si applica solo quando è valido (blur o Invio).
 */
function NumberField({
  value,
  min,
  max,
  step = 1,
  decimals = false,
  disabled,
  onCommit,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  decimals?: boolean;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const parsed = decimals ? Number.parseFloat(draft) : Number.parseInt(draft, 10);
    if (Number.isNaN(parsed)) {
      setDraft(String(value));
      return;
    }
    const clamped = Math.min(max, Math.max(min, parsed));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };

  return (
    <Input
      type="number"
      inputMode={decimals ? "decimal" : "numeric"}
      value={draft}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="tabular-nums"
    />
  );
}

/** Cursore con lettura del valore: nessuna libreria, solo `input[range]`. */
function RangeField({
  label,
  value,
  min,
  max,
  step,
  hint,
  disabled,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  hint?: string;
  disabled?: boolean;
  format: (value: number) => string;
  onChange: (value: number) => void;
}) {
  return (
    <ConsoleField
      label={
        <span className="flex w-full items-center justify-between gap-2">
          {label}
          <span className="font-sans text-xs tabular-nums text-muted-foreground normal-case">
            {format(value)}
          </span>
        </span>
      }
      hint={hint}
    >
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-9 w-full cursor-pointer accent-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </ConsoleField>
  );
}
