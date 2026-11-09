"use client";

import {
  Compass,
  Flag,
  Grid3x3,
  Image as ImageIcon,
  Scroll,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { Badge } from "@/components/ui/badge";
import {
  BATTLE_STATUS_BADGES,
  BATTLE_STATUS_FLAVOR,
  BATTLE_STATUS_LABELS,
  CELL_SIZE_PRESETS,
  DISTANCE_METRIC_HINTS,
  DISTANCE_METRIC_OPTIONS,
  DISTANCE_UNIT_LABELS,
  IMAGE_FIT_LABELS,
} from "@/features/battle/constants";
import { CombatantRoster } from "@/features/battle/components/combatant-roster";
import { useDeleteBattle, useSetBattleStatus } from "@/features/battle/data";
import {
  aspectMismatch,
  formatDistance,
  suggestGrid,
} from "@/features/battle/engine/geometry";
import { BATTLE_LIMITS, type DistanceUnit, type ImageFit, type MapRotation } from "@/types/battle";

import { useEditor } from "./use-editor";

/* ============================================================
 * La battaglia, dentro l'editor.
 *
 * Non esiste più una schermata di preparazione a parte: nome, immagine,
 * griglia, allineamento e schiere si configurano qui, accanto alla mappa
 * che si sta guardando. Ogni modifica entra nella bozza e parte con
 * l'autosalvataggio.
 * ============================================================ */

const ROTATIONS: MapRotation[] = [0, 90, 180, 270];
const ASPECT_WARNING = 0.08;

export function BattlePanel() {
  const editor = useEditor();
  const router = useRouter();
  const remove = useDeleteBattle();
  const setStatus = useSetBattleStatus(editor.battle.id);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { draft, grid } = editor;
  const background = draft.background;
  const mismatch = background ? aspectMismatch(background, grid) : null;

  /** Nuova immagine: si leggono le dimensioni native e si propone la griglia. */
  const handleImage = (url: string) => {
    if (!url) {
      editor.patchBattle({ background: null });
      return;
    }
    const probe = new window.Image();
    probe.onload = () => {
      editor.patchBattle({
        background: {
          url,
          naturalWidth: probe.naturalWidth,
          naturalHeight: probe.naturalHeight,
          fit: "COVER",
          rotation: 0,
          dim: 0,
        },
      });
    };
    probe.src = url;
  };

  const patchBackground = (change: Partial<NonNullable<typeof background>>) => {
    if (!background) return;
    editor.patchBattle({ background: { ...background, ...change } });
  };

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <Section icon={<Scroll />} title="Identità">
        <Field label="Nome">
          <Input
            value={draft.name}
            maxLength={BATTLE_LIMITS.maxNameLength}
            onChange={(event) => editor.patchBattle({ name: event.target.value })}
          />
        </Field>
        <Field label="Descrizione">
          <Textarea
            rows={2}
            value={draft.description}
            maxLength={BATTLE_LIMITS.maxDescriptionLength}
            placeholder="Cosa accade, e perché si combatte qui."
            onChange={(event) =>
              editor.patchBattle({ description: event.target.value })
            }
          />
        </Field>
      </Section>

      <Section icon={<ImageIcon />} title="Immagine">
        <ImageUpload
          value={background?.url ?? ""}
          onChange={handleImage}
          folder="battlemap"
        />
        {background && (
          <>
            <p className="text-[11px] text-muted-foreground">
              {background.naturalWidth} × {background.naturalHeight} px.
              L&apos;immagine non viene mai modificata: la configurazione le
              sta sopra.
            </p>
            <Field label="Adattamento">
              <Select
                value={background.fit}
                onValueChange={(value) =>
                  patchBackground({ fit: value as ImageFit })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(IMAGE_FIT_LABELS) as ImageFit[]).map((fit) => (
                    <SelectItem key={fit} value={fit}>
                      {IMAGE_FIT_LABELS[fit]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Rotazione">
              <div className="flex gap-1">
                {ROTATIONS.map((rotation) => (
                  <Button
                    key={rotation}
                    size="sm"
                    variant={
                      background.rotation === rotation ? "default" : "outline"
                    }
                    onClick={() => patchBackground({ rotation })}
                  >
                    {rotation}°
                  </Button>
                ))}
              </div>
            </Field>
            <Range
              label="Oscuramento"
              value={background.dim}
              min={0}
              max={0.8}
              step={0.05}
              format={(value) => `${Math.round(value * 100)}%`}
              onChange={(dim) => patchBackground({ dim })}
            />
          </>
        )}
      </Section>

      <Section icon={<Grid3x3 />} title="Griglia">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Colonne">
            <Input
              type="number"
              min={2}
              max={100}
              className="tabular-nums"
              value={grid.cols}
              onChange={(event) =>
                editor.patchGrid({ cols: Number(event.target.value) || 2 })
              }
            />
          </Field>
          <Field label="Righe">
            <Input
              type="number"
              min={2}
              max={100}
              className="tabular-nums"
              value={grid.rows}
              onChange={(event) =>
                editor.patchGrid({ rows: Number(event.target.value) || 2 })
              }
            />
          </Field>
        </div>

        {mismatch && mismatch.delta > ASPECT_WARNING && background && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() =>
              editor.patchGrid(
                suggestGrid(
                  background.naturalWidth,
                  background.naturalHeight,
                  Math.max(grid.cols, grid.rows)
                )
              )
            }
          >
            Adatta la griglia alle proporzioni dell&apos;immagine
          </Button>
        )}

        <Field label="Unità">
          <div className="flex gap-1">
            {(Object.keys(DISTANCE_UNIT_LABELS) as DistanceUnit[]).map((unit) => (
              <Button
                key={unit}
                size="sm"
                variant={grid.unit === unit ? "default" : "outline"}
                onClick={() => editor.patchGrid({ unit })}
              >
                {DISTANCE_UNIT_LABELS[unit]}
              </Button>
            ))}
          </div>
        </Field>

        <Field label={`Lato della casella (${grid.unit})`}>
          <div className="flex flex-wrap gap-1">
            {CELL_SIZE_PRESETS[grid.unit].map((preset) => (
              <Button
                key={preset}
                size="sm"
                variant={grid.cellSize === preset ? "default" : "outline"}
                onClick={() => editor.patchGrid({ cellSize: preset })}
              >
                {formatDistance(preset, grid.unit)}
              </Button>
            ))}
          </div>
        </Field>

        <Field label="Metrica" hint={DISTANCE_METRIC_HINTS[grid.metric]}>
          <Select
            value={grid.metric}
            onValueChange={(value) =>
              editor.patchGrid({ metric: value as typeof grid.metric })
            }
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
        </Field>

        <label className="flex items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">Disegna le linee</span>
          <Switch
            checked={grid.visible}
            onCheckedChange={(visible) => editor.patchGrid({ visible })}
          />
        </label>
      </Section>

      <Section
        icon={<Compass />}
        title="Allineamento"
        hint="Per le mappe che hanno già una griglia disegnata sopra."
      >
        <Range
          label="Scostamento orizzontale"
          value={grid.offsetX}
          min={-1}
          max={1}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(offsetX) => editor.patchGrid({ offsetX })}
        />
        <Range
          label="Scostamento verticale"
          value={grid.offsetY}
          min={-1}
          max={1}
          step={0.02}
          format={(value) => value.toFixed(2)}
          onChange={(offsetY) => editor.patchGrid({ offsetY })}
        />
        <Range
          label="Scala dell'immagine"
          value={grid.imageScale}
          min={0.5}
          max={2}
          step={0.01}
          format={(value) => `${Math.round(value * 100)}%`}
          onChange={(imageScale) => editor.patchGrid({ imageScale })}
        />
      </Section>

      <Section icon={<Flag />} title="Stato">
        <div className="flex items-center justify-between gap-2">
          <Badge className={BATTLE_STATUS_BADGES[editor.battle.status]}>
            {BATTLE_STATUS_LABELS[editor.battle.status]}
          </Badge>
          {editor.battle.status === "DRAFT" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={setStatus.isPending || editor.dirty}
              title={editor.dirty ? "Salva prima le modifiche" : undefined}
              onClick={() => setStatus.mutate("READY")}
            >
              Dichiara pronta
            </Button>
          ) : editor.battle.status === "READY" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={setStatus.isPending}
              onClick={() => setStatus.mutate("DRAFT")}
            >
              Torna in bozza
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {BATTLE_STATUS_FLAVOR[editor.battle.status]}
        </p>
      </Section>

      <CombatantRoster
        battle={{ ...editor.battle, grid }}
        selectedId={null}
        onSelect={() => undefined}
      />

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-muted-foreground hover:text-crimson-bright"
        onClick={() => setConfirmDelete(true)}
      >
        <Trash2 className="size-3.5" />
        Elimina la battaglia
      </Button>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Smantellare il campo?</AlertDialogTitle>
            <AlertDialogDescription>
              «{draft.name}» sparisce con tutto ciò che contiene: mappa, pedine,
              segreti e cronaca. L&apos;operazione è definitiva.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                remove.mutate(editor.battle.id, {
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

/* ------------------------------ Pezzi ------------------------------- */

function Section({
  icon,
  title,
  hint,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 rounded-xl border border-hairline bg-surface-2/40 p-3">
      <div className="flex items-center gap-2">
        <span className="text-gold [&_svg]:size-4">{icon}</span>
        <h3 className="font-heading text-xs tracking-[0.12em] uppercase">
          {title}
        </h3>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className="font-heading text-[0.62rem] tracking-[0.14em] text-gold/70 uppercase">
        {label}
      </span>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Range({
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
      <span className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
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
        className="h-6 w-full cursor-pointer accent-[var(--gold)]"
      />
    </label>
  );
}
