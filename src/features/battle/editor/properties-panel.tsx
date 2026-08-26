"use client";

import { Link2, Trash2 } from "lucide-react";

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
import { formatDistance } from "@/features/battle/engine/geometry";
import { describeCell, mapWeight } from "@/features/battle/engine/tactical";
import {
  COVER_LABELS,
  HAZARD_LABELS,
  OBJECT_KIND_LABELS,
  OBJECT_STATE_LABELS,
  TRAP_RESET_LABELS,
  TRAP_TRIGGER_LABELS,
} from "@/features/battle/library";
import {
  allTerrains,
  CHECK_SKILLS,
  dcFor,
  DIFFICULTY_LABELS,
} from "@/features/battle/terrain";
import { cn } from "@/lib/utils";
import type { GridConfig } from "@/types/battle";
import {
  COVER_LEVELS,
  DIFFICULTY_TIERS,
  MAP_OBJECT_KINDS,
  OBJECT_STATES,
  TRAP_RESETS,
  TRAP_TRIGGERS,
  type CoverLevel,
  type DifficultyTier,
  type MapArea,
  type MapHazard,
  type MapObject,
  type MapTrap,
  type TacticalCheck,
} from "@/types/battlemap";

import { useEditor } from "./use-editor";

/* ============================================================
 * Pannello proprietà: cambia con ciò che è selezionato.
 *
 * Una cella mostra terreno, quota, costo, copertura e prova; trenta
 * celle mostrano gli stessi controlli e li applicano a tutte; una
 * trappola mostra le sue CD. Nessun form generico che chiede all'utente
 * di indovinare cosa sta modificando.
 * ============================================================ */

export function PropertiesPanel() {
  const editor = useEditor();
  const { selection, map } = editor;

  if (selection.kind && selection.elementId) {
    const id = selection.elementId;
    if (selection.kind === "object") {
      const object = map.objects.find((entry) => entry.id === id);
      return object ? <ObjectProperties object={object} /> : <EmptyState />;
    }
    if (selection.kind === "trap") {
      const trap = map.traps.find((entry) => entry.id === id);
      return trap ? <TrapProperties trap={trap} /> : <EmptyState />;
    }
    if (selection.kind === "hazard") {
      const hazard = map.hazards.find((entry) => entry.id === id);
      return hazard ? <HazardProperties hazard={hazard} /> : <EmptyState />;
    }
    const area = map.areas.find((entry) => entry.id === id);
    return area ? <AreaProperties area={area} /> : <EmptyState />;
  }

  if (selection.cells.length > 0) return <CellProperties />;
  return <MapProperties />;
}

/* ------------------------------------------------------------------ */
/* Celle                                                              */
/* ------------------------------------------------------------------ */

function CellProperties() {
  const editor = useEditor();
  const { map, selection, obstacles } = editor;
  const grid: GridConfig = { ...editor.battle.grid, ...editor.grid };

  const keys = selection.cells;
  const first = describeCell(map, grid, keys[0]!, obstacles);
  const multiple = keys.length > 1;

  const apply = (change: Parameters<typeof editor.patchSelectedCells>[0], label: string) =>
    editor.patchSelectedCells(change, label);

  return (
    <PanelShell
      title={multiple ? `${keys.length} celle` : `Cella ${first.key}`}
      subtitle={
        multiple
          ? "Le modifiche valgono per tutte le celle selezionate."
          : first.terrain.description
      }
    >
      <Field label="Terreno">
        <Select
          value={multiple ? "" : first.cell.terrain}
          onValueChange={(value) => apply({ terrain: value }, "Terreno")}
        >
          <SelectTrigger>
            <SelectValue placeholder={multiple ? "Valori diversi" : undefined} />
          </SelectTrigger>
          <SelectContent>
            {allTerrains(map.settings.customTerrains).map((terrain) => (
              <SelectItem key={terrain.id} value={terrain.id}>
                {terrain.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Quota"
        hint={`Ogni livello costa ${map.settings.elevationStepCost} cella in salita.`}
      >
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              editor.patchSelectedCells(
                { elevation: first.cell.elevation - 1 },
                "Abbassa"
              )
            }
          >
            −
          </Button>
          <Input
            type="number"
            className="tabular-nums"
            value={first.cell.elevation}
            min={-4}
            max={8}
            onChange={(event) =>
              apply({ elevation: Number(event.target.value) }, "Quota")
            }
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              editor.patchSelectedCells(
                { elevation: first.cell.elevation + 1 },
                "Rialza"
              )
            }
          >
            +
          </Button>
        </div>
      </Field>

      <Field
        label="Costo del movimento"
        hint={
          first.cost === null
            ? "Cella invalicabile."
            : `Attualmente ${formatDistance(first.cost, grid.unit)} per attraversarla.`
        }
      >
        <Select
          value={
            first.cell.movementCost === undefined
              ? "AUTO"
              : first.cell.movementCost === null
                ? "BLOCK"
                : String(first.cell.movementCost)
          }
          onValueChange={(value) =>
            apply(
              {
                movementCost:
                  value === "AUTO"
                    ? undefined
                    : value === "BLOCK"
                      ? null
                      : Number(value),
              },
              "Costo movimento"
            )
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AUTO">Dal terreno</SelectItem>
            <SelectItem value="1">Normale (×1)</SelectItem>
            <SelectItem value="2">Difficile (×2)</SelectItem>
            <SelectItem value="3">Molto difficile (×3)</SelectItem>
            <SelectItem value="BLOCK">Invalicabile</SelectItem>
          </SelectContent>
        </Select>
      </Field>

      <Field label="Copertura offerta">
        <CoverSelect
          value={first.cell.cover ?? "NONE"}
          onChange={(cover) =>
            apply({ cover: cover === "NONE" ? undefined : cover }, "Copertura")
          }
        />
      </Field>

      <CheckEditor
        label="Prova richiesta"
        value={first.cell.check ?? null}
        table={map.settings.difficultyDc}
        onChange={(check) => apply({ check }, "Prova")}
      />

      <Field label="Nota del Master">
        <Textarea
          rows={2}
          value={first.cell.note ?? ""}
          placeholder="Cosa succede qui che i giocatori non sanno."
          onChange={(event) =>
            apply({ note: event.target.value || undefined }, "Nota")
          }
        />
      </Field>

      {!multiple && (first.traps.length > 0 || first.hazards.length > 0 || first.objects.length > 0) && (
        <div className="rounded-lg border border-hairline bg-surface-2/50 p-2.5 text-xs">
          <p className="mb-1 text-muted-foreground">Su questa cella</p>
          <ul className="space-y-1">
            {first.objects.map((object) => (
              <SelectableRow
                key={object.id}
                label={object.name}
                onClick={() =>
                  editor.selectElement("object", object.id, object.cells)
                }
              />
            ))}
            {first.traps.map((trap) => (
              <SelectableRow
                key={trap.id}
                label={trap.name}
                onClick={() => editor.selectElement("trap", trap.id, trap.cells)}
              />
            ))}
            {first.hazards.map((hazard) => (
              <SelectableRow
                key={hazard.id}
                label={hazard.name}
                onClick={() =>
                  editor.selectElement("hazard", hazard.id, hazard.cells)
                }
              />
            ))}
          </ul>
        </div>
      )}
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */
/* Oggetti                                                            */
/* ------------------------------------------------------------------ */

function ObjectProperties({ object }: { object: MapObject }) {
  const editor = useEditor();
  const patch = (change: Partial<MapObject>, label = "Oggetto") =>
    editor.updateElement("object", object.id, change, label);

  const others = editor.map.objects.filter((entry) => entry.id !== object.id);

  return (
    <PanelShell
      title={object.name}
      subtitle={`${OBJECT_KIND_LABELS[object.kind]} · ${object.cells.length} cella/e`}
      onDelete={() => editor.deleteElement("object", object.id)}
    >
      <Field label="Nome">
        <Input
          value={object.name}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </Field>

      <Field label="Tipo">
        <Select
          value={object.kind}
          onValueChange={(value) =>
            patch({ kind: value as MapObject["kind"] }, "Tipo oggetto")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MAP_OBJECT_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {OBJECT_KIND_LABELS[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Stato">
        <Select
          value={object.state}
          onValueChange={(value) =>
            patch({ state: value as MapObject["state"] }, "Stato")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OBJECT_STATES.map((state) => (
              <SelectItem key={state} value={state}>
                {OBJECT_STATE_LABELS[state]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <ToggleRow
        label="Sbarra il passo"
        checked={object.blocksMovement}
        onChange={(value) => patch({ blocksMovement: value }, "Passabilità")}
      />
      <ToggleRow
        label="Blocca la vista"
        checked={object.blocksSight}
        onChange={(value) => patch({ blocksSight: value }, "Linea di vista")}
      />
      <ToggleRow
        label="Visibile ai giocatori"
        checked={object.visibleToPlayers}
        onChange={(value) => patch({ visibleToPlayers: value }, "Visibilità")}
      />

      <Field label="Copertura">
        <CoverSelect
          value={object.cover}
          onChange={(cover) => patch({ cover }, "Copertura")}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Altezza (m)">
          <Input
            type="number"
            className="tabular-nums"
            value={object.height}
            onChange={(event) => patch({ height: Number(event.target.value) })}
          />
        </Field>
        <Field label="Materiale">
          <Input
            value={object.material}
            onChange={(event) => patch({ material: event.target.value })}
          />
        </Field>
      </div>

      <ToggleRow
        label="Distruttibile"
        checked={object.destructible}
        onChange={(value) => patch({ destructible: value }, "Distruttibilità")}
      />
      {object.destructible && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Punti ferita">
            <Input
              type="number"
              className="tabular-nums"
              value={object.hp}
              onChange={(event) => patch({ hp: Number(event.target.value) })}
            />
          </Field>
          <Field label="Classe Armatura">
            <Input
              type="number"
              className="tabular-nums"
              value={object.armorClass}
              onChange={(event) =>
                patch({ armorClass: Number(event.target.value) })
              }
            />
          </Field>
        </div>
      )}

      {(object.kind === "STAIRS" || object.kind === "BRIDGE") && (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Da quota">
            <Input
              type="number"
              className="tabular-nums"
              value={object.connectsElevation?.from ?? 0}
              onChange={(event) =>
                patch(
                  {
                    connectsElevation: {
                      from: Number(event.target.value),
                      to: object.connectsElevation?.to ?? 1,
                    },
                  },
                  "Dislivello collegato"
                )
              }
            />
          </Field>
          <Field label="A quota">
            <Input
              type="number"
              className="tabular-nums"
              value={object.connectsElevation?.to ?? 1}
              onChange={(event) =>
                patch(
                  {
                    connectsElevation: {
                      from: object.connectsElevation?.from ?? 0,
                      to: Number(event.target.value),
                    },
                  },
                  "Dislivello collegato"
                )
              }
            />
          </Field>
        </div>
      )}

      <CheckEditor
        label="Percezione"
        value={object.checks.perception ?? null}
        table={editor.map.settings.difficultyDc}
        onChange={(check) =>
          patch({ checks: { ...object.checks, perception: check } }, "Percezione")
        }
      />
      <CheckEditor
        label="Indagare"
        value={object.checks.investigation ?? null}
        table={editor.map.settings.difficultyDc}
        onChange={(check) =>
          patch(
            { checks: { ...object.checks, investigation: check } },
            "Indagare"
          )
        }
      />
      <CheckEditor
        label="Scassinare"
        value={object.checks.lockpick ?? null}
        table={editor.map.settings.difficultyDc}
        onChange={(check) =>
          patch({ checks: { ...object.checks, lockpick: check } }, "Scassinare")
        }
      />
      <CheckEditor
        label="Sfondare"
        value={object.checks.force ?? null}
        table={editor.map.settings.difficultyDc}
        onChange={(check) =>
          patch({ checks: { ...object.checks, force: check } }, "Sfondare")
        }
      />

      {others.length > 0 && (
        <Field
          label="Collegato a"
          hint="La leva che apre la porta: l'effetto lo applica il Master."
        >
          <div className="space-y-1">
            {others.map((other) => {
              const linked = object.linkedIds.includes(other.id);
              return (
                <button
                  key={other.id}
                  type="button"
                  onClick={() =>
                    patch(
                      {
                        linkedIds: linked
                          ? object.linkedIds.filter((id) => id !== other.id)
                          : [...object.linkedIds, other.id],
                      },
                      "Collegamento"
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                    linked
                      ? "border-gold/50 bg-gold/10 text-gold-bright"
                      : "border-hairline text-muted-foreground hover:bg-surface-2"
                  )}
                >
                  <Link2 className="size-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{other.name}</span>
                </button>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Nota">
        <Textarea
          rows={2}
          value={object.note}
          onChange={(event) => patch({ note: event.target.value })}
        />
      </Field>
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */
/* Trappole                                                           */
/* ------------------------------------------------------------------ */

function TrapProperties({ trap }: { trap: MapTrap }) {
  const editor = useEditor();
  const patch = (change: Partial<MapTrap>, label = "Trappola") =>
    editor.updateElement("trap", trap.id, change, label);

  return (
    <PanelShell
      title={trap.name}
      subtitle={`Trappola · ${trap.cells.length} cella/e`}
      onDelete={() => editor.deleteElement("trap", trap.id)}
    >
      <Field label="Nome">
        <Input
          value={trap.name}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </Field>
      <Field label="Descrizione">
        <Textarea
          rows={2}
          value={trap.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>

      <ToggleRow
        label="Nascosta"
        checked={trap.hidden}
        onChange={(value) => patch({ hidden: value }, "Occultamento")}
      />
      <ToggleRow
        label="Armata"
        checked={trap.armed}
        onChange={(value) => patch({ armed: value }, "Innesco")}
      />

      <CheckEditor
        label="Percezione"
        value={trap.perception}
        table={editor.map.settings.difficultyDc}
        onChange={(check) => patch({ perception: check }, "Percezione")}
      />
      <CheckEditor
        label="Indagare"
        value={trap.investigation}
        table={editor.map.settings.difficultyDc}
        onChange={(check) => patch({ investigation: check }, "Indagare")}
      />
      <CheckEditor
        label="Disinnescare"
        value={trap.disarm}
        table={editor.map.settings.difficultyDc}
        onChange={(check) => patch({ disarm: check }, "Disinnesco")}
      />

      <Field label="Tiro salvezza">
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Input
            placeholder="Destrezza"
            value={trap.save?.ability ?? ""}
            onChange={(event) =>
              patch(
                {
                  save: event.target.value
                    ? { ability: event.target.value, dc: trap.save?.dc ?? 13 }
                    : null,
                },
                "Tiro salvezza"
              )
            }
          />
          <Input
            type="number"
            className="tabular-nums"
            value={trap.save?.dc ?? 13}
            onChange={(event) =>
              patch(
                {
                  save: {
                    ability: trap.save?.ability ?? "Destrezza",
                    dc: Number(event.target.value),
                  },
                },
                "CD del tiro salvezza"
              )
            }
          />
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Danni">
          <Input
            placeholder="2d6"
            value={trap.damage}
            onChange={(event) => patch({ damage: event.target.value })}
          />
        </Field>
        <Field label="Tipo di danno">
          <Input
            placeholder="Perforante"
            value={trap.damageType}
            onChange={(event) => patch({ damageType: event.target.value })}
          />
        </Field>
      </div>

      <Field label="Effetto">
        <Input
          placeholder="Prono, Avvelenato…"
          value={trap.effect}
          onChange={(event) => patch({ effect: event.target.value })}
        />
      </Field>

      <Field label="Innesco">
        <Select
          value={trap.trigger}
          onValueChange={(value) =>
            patch({ trigger: value as MapTrap["trigger"] }, "Innesco")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAP_TRIGGERS.map((trigger) => (
              <SelectItem key={trigger} value={trigger}>
                {TRAP_TRIGGER_LABELS[trigger]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Riarmo">
        <Select
          value={trap.reset}
          onValueChange={(value) =>
            patch({ reset: value as MapTrap["reset"] }, "Riarmo")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRAP_RESETS.map((reset) => (
              <SelectItem key={reset} value={reset}>
                {TRAP_RESET_LABELS[reset]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */
/* Pericoli e aree                                                    */
/* ------------------------------------------------------------------ */

function HazardProperties({ hazard }: { hazard: MapHazard }) {
  const editor = useEditor();
  const patch = (change: Partial<MapHazard>, label = "Pericolo") =>
    editor.updateElement("hazard", hazard.id, change, label);

  return (
    <PanelShell
      title={hazard.name}
      subtitle={`${HAZARD_LABELS[hazard.kind]} · ${hazard.cells.length} cella/e`}
      onDelete={() => editor.deleteElement("hazard", hazard.id)}
    >
      <Field label="Nome">
        <Input
          value={hazard.name}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </Field>
      <Field label="Descrizione">
        <Textarea
          rows={2}
          value={hazard.description}
          onChange={(event) => patch({ description: event.target.value })}
        />
      </Field>
      <ToggleRow
        label="Si ripete ogni turno"
        checked={hazard.recurring}
        onChange={(value) => patch({ recurring: value }, "Ricorrenza")}
      />
      <ToggleRow
        label="Visibile ai giocatori"
        checked={hazard.visibleToPlayers}
        onChange={(value) => patch({ visibleToPlayers: value }, "Visibilità")}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Danni">
          <Input
            value={hazard.damage}
            onChange={(event) => patch({ damage: event.target.value })}
          />
        </Field>
        <Field label="Tipo">
          <Input
            value={hazard.damageType}
            onChange={(event) => patch({ damageType: event.target.value })}
          />
        </Field>
      </div>
      <Field label="Effetto">
        <Input
          value={hazard.effect}
          onChange={(event) => patch({ effect: event.target.value })}
        />
      </Field>
      <Field label="Tiro salvezza">
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <Input
            placeholder="Costituzione"
            value={hazard.save?.ability ?? ""}
            onChange={(event) =>
              patch(
                {
                  save: event.target.value
                    ? { ability: event.target.value, dc: hazard.save?.dc ?? 13 }
                    : null,
                },
                "Tiro salvezza"
              )
            }
          />
          <Input
            type="number"
            className="tabular-nums"
            value={hazard.save?.dc ?? 13}
            onChange={(event) =>
              patch(
                {
                  save: {
                    ability: hazard.save?.ability ?? "Costituzione",
                    dc: Number(event.target.value),
                  },
                },
                "CD"
              )
            }
          />
        </div>
      </Field>
    </PanelShell>
  );
}

function AreaProperties({ area }: { area: MapArea }) {
  const editor = useEditor();
  const patch = (change: Partial<MapArea>, label = "Area") =>
    editor.updateElement("area", area.id, change, label);

  return (
    <PanelShell
      title={area.name}
      subtitle={`Area d'effetto · ${area.cells.length} celle`}
      onDelete={() => editor.deleteElement("area", area.id)}
    >
      <Field label="Nome">
        <Input
          value={area.name}
          onChange={(event) => patch({ name: event.target.value })}
        />
      </Field>
      <Field label="Effetto">
        <Input
          value={area.effect}
          onChange={(event) => patch({ effect: event.target.value })}
        />
      </Field>
      <Field label="Durata">
        <Input
          value={area.duration}
          onChange={(event) => patch({ duration: event.target.value })}
        />
      </Field>
      <Field label="Innesco">
        <Input
          placeholder="Quando una creatura vi entra…"
          value={area.trigger}
          onChange={(event) => patch({ trigger: event.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Colore">
          <Input
            type="color"
            className="h-9 p-1"
            value={area.color}
            onChange={(event) => patch({ color: event.target.value })}
          />
        </Field>
        <Field label="Intensità">
          <input
            type="range"
            min={0.1}
            max={0.8}
            step={0.05}
            value={area.opacity}
            onChange={(event) => patch({ opacity: Number(event.target.value) })}
            className="h-9 w-full cursor-pointer accent-[var(--gold)]"
          />
        </Field>
      </div>
      <ToggleRow
        label="Visibile ai giocatori"
        checked={area.visibleToPlayers}
        onChange={(value) => patch({ visibleToPlayers: value }, "Visibilità")}
      />
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */
/* Mappa (nessuna selezione)                                          */
/* ------------------------------------------------------------------ */

function MapProperties() {
  const editor = useEditor();
  const { map, grid } = editor;
  const weight = mapWeight(map);
  const table = map.settings.difficultyDc;

  return (
    <PanelShell
      title="Mappa"
      subtitle="Nessuna selezione: qui vivono le regole valide per tutto il campo."
    >
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <Stat label="Dimensioni" value={`${grid.cols} × ${grid.rows}`} />
        <Stat
          label="Scala"
          value={`${editor.battle.grid.cellSize} ${editor.battle.grid.unit} / cella`}
        />
        <Stat label="Celle dipinte" value={String(weight.cells)} />
        <Stat label="Elementi" value={String(weight.elements)} />
      </dl>

      <Field label="Terreno di base">
        <Select
          value={map.settings.defaultTerrain}
          onValueChange={(value) =>
            editor.patchSettings({ defaultTerrain: value }, "Terreno di base")
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allTerrains(map.settings.customTerrains).map((terrain) => (
              <SelectItem key={terrain.id} value={terrain.id}>
                {terrain.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field
        label="Tabella delle CD"
        hint="Vale per ogni prova generata su questa mappa."
      >
        <div className="grid grid-cols-5 gap-1">
          {(Object.keys(table) as (keyof typeof table)[]).map((tier) => (
            <label key={tier} className="text-center">
              <span className="mb-1 block text-[10px] text-muted-foreground">
                {DIFFICULTY_LABELS[tier].slice(0, 5)}
              </span>
              <Input
                type="number"
                className="h-8 px-1 text-center tabular-nums"
                value={table[tier]}
                onChange={(event) =>
                  editor.patchSettings(
                    {
                      difficultyDc: {
                        ...table,
                        [tier]: Number(event.target.value),
                      },
                    },
                    "Tabella CD"
                  )
                }
              />
            </label>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Costo per livello">
          <Input
            type="number"
            step={0.5}
            className="tabular-nums"
            value={map.settings.elevationStepCost}
            onChange={(event) =>
              editor.patchSettings(
                { elevationStepCost: Number(event.target.value) },
                "Costo dislivello"
              )
            }
          />
        </Field>
        <Field label="Salto massimo">
          <Input
            type="number"
            className="tabular-nums"
            value={map.settings.maxClimbableStep}
            onChange={(event) =>
              editor.patchSettings(
                { maxClimbableStep: Number(event.target.value) },
                "Salto massimo"
              )
            }
          />
        </Field>
      </div>

      <ToggleRow
        label="Mostra le coordinate"
        checked={map.settings.showCoordinates}
        onChange={(value) =>
          editor.patchSettings({ showCoordinates: value }, "Coordinate")
        }
      />
    </PanelShell>
  );
}

/* ------------------------------------------------------------------ */
/* Elementi comuni                                                    */
/* ------------------------------------------------------------------ */

function PanelShell({
  title,
  subtitle,
  onDelete,
  children,
}: {
  title: string;
  subtitle?: string;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start justify-between gap-2 border-b border-hairline px-3 py-2.5">
        <div className="min-w-0">
          <h2 className="truncate font-heading text-sm tracking-wide">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 text-muted-foreground hover:text-crimson-bright"
            onClick={onDelete}
            aria-label="Elimina"
          >
            <Trash2 className="size-3.5" />
          </Button>
        )}
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">{children}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-4 text-xs text-muted-foreground">
      L&apos;elemento selezionato non esiste più.
    </div>
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
      <span className="font-heading text-[0.65rem] tracking-[0.14em] text-gold/70 uppercase">
        {label}
      </span>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-2/50 px-2 py-1.5">
      <dt className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="font-heading text-sm tabular-nums">{value}</dd>
    </div>
  );
}

function SelectableRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full truncate rounded-md border border-hairline px-2 py-1 text-left text-xs hover:border-gold/40"
      >
        {label}
      </button>
    </li>
  );
}

function CoverSelect({
  value,
  onChange,
}: {
  value: CoverLevel;
  onChange: (value: CoverLevel) => void;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as CoverLevel)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {COVER_LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            {COVER_LABELS[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Prova + CD: il grado calcola la CD dalla tabella della mappa, ma il
 * Master resta libero di scriverla a mano (grado "Personalizzata").
 */
function CheckEditor({
  label,
  value,
  table,
  onChange,
}: {
  label: string;
  value: TacticalCheck | null;
  table: Record<Exclude<DifficultyTier, "CUSTOM">, number>;
  onChange: (check: TacticalCheck | null) => void;
}) {
  const active = value !== null;

  return (
    <div className="space-y-1 rounded-lg border border-hairline p-2">
      <label className="flex items-center justify-between gap-2">
        <span className="font-heading text-[0.65rem] tracking-[0.14em] text-gold/70 uppercase">
          {label}
        </span>
        <Switch
          checked={active}
          onCheckedChange={(checked) =>
            onChange(
              checked
                ? { skill: "Atletica", difficulty: "MEDIUM", dc: table.MEDIUM }
                : null
            )
          }
        />
      </label>

      {active && value && (
        <div className="grid grid-cols-[1fr_auto] gap-1.5 pt-1">
          <Select
            value={value.skill}
            onValueChange={(skill) => onChange({ ...value, skill })}
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CHECK_SKILLS.map((skill) => (
                <SelectItem key={skill} value={skill}>
                  {skill}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            className="h-8 w-16 tabular-nums"
            value={value.dc}
            onChange={(event) =>
              onChange({
                ...value,
                difficulty: "CUSTOM",
                dc: Number(event.target.value),
              })
            }
          />
          <Select
            value={value.difficulty}
            onValueChange={(tier) =>
              onChange({
                ...value,
                difficulty: tier as DifficultyTier,
                dc: dcFor(tier as DifficultyTier, table, value.dc),
              })
            }
          >
            <SelectTrigger className="col-span-2 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTY_TIERS.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {DIFFICULTY_LABELS[tier]}
                  {tier !== "CUSTOM" ? ` · CD ${table[tier]}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
