"use client";

import {
  BedDouble,
  Coins,
  FlaskConical,
  Moon,
  Package,
  Plus,
  Shield,
  ShieldPlus,
  Sparkles,
  Swords,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ABILITIES,
  type Ability,
  type EquipmentCategory,
  type EquipmentItem,
  type SpellSlot,
} from "@/types/entities";

import {
  ABILITY_LABELS,
  COIN_KEYS,
  COIN_LABELS,
  EQUIPMENT_CATEGORY_LABELS,
  RESOURCE_RECHARGE_LABELS,
  formatModifier,
  type CoinKey,
} from "../constants";
import { makeHistoryEntry } from "../data";
import { useCodex } from "./codex-context";
import { CodexPanel, PanelEyebrow } from "./codex-panel";
import { abilityMod, genId } from "./derive";
import { InlineNumber, InlineText, Stepper } from "./inline-edit";

/* ============================================================
 * Pannelli dell'equipaggiamento e della magia.
 * ============================================================ */

const EQUIP_ICON: Record<EquipmentCategory, LucideIcon> = {
  weapon: Swords,
  armor: Shield,
  shield: ShieldPlus,
  magic: Sparkles,
  consumable: FlaskConical,
  misc: Package,
};

const EQUIP_TINT: Record<EquipmentCategory, string> = {
  weapon: "text-crimson-light",
  armor: "text-silver",
  shield: "text-silver",
  magic: "text-arcane-bright",
  consumable: "text-emerald-bright",
  misc: "text-muted-foreground",
};

const COIN_TINT: Record<CoinKey, string> = {
  pp: "text-silver",
  gp: "text-gold-bright",
  ep: "text-arcane-bright",
  sp: "text-foreground/80",
  cp: "text-ember-bright",
};

/* ── Card oggetto: clic → Inspector ── */

function ItemCard({ item }: { item: EquipmentItem }) {
  const { inspect } = useCodex();
  const Icon = EQUIP_ICON[item.category];
  return (
    <button
      type="button"
      onClick={() => inspect({ type: "item", id: item.id })}
      className={cn(
        "group flex w-full items-center gap-3 rounded-xl border bg-surface-1 p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:elev-2",
        item.equipped
          ? "border-gold/40 hover:border-gold/60"
          : "border-hairline hover:border-hairline-strong"
      )}
    >
      <span
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-0",
          EQUIP_TINT[item.category]
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
          <span className="truncate">{item.name || "Oggetto"}</span>
          {item.quantity > 1 && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              ×{item.quantity}
            </span>
          )}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {EQUIPMENT_CATEGORY_LABELS[item.category]}
          {item.notes && ` · ${item.notes}`}
        </span>
      </span>
      {item.equipped && (
        <span className="shrink-0 rounded-full border border-gold/40 bg-gold-dim px-2 py-0.5 text-[10px] font-semibold tracking-wide text-gold-bright uppercase">
          In uso
        </span>
      )}
    </button>
  );
}

export function PanelInventory({ storageScope }: { storageScope: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const equipped = sheet.equipment.filter((item) => item.equipped);
  const backpack = sheet.equipment.filter((item) => !item.equipped);

  const addItem = () => {
    const item: EquipmentItem = {
      id: genId(),
      name: "Nuovo oggetto",
      category: "misc",
      quantity: 1,
      equipped: false,
      notes: "",
    };
    patchSheet({ equipment: [...sheet.equipment, item] });
    inspect({ type: "item", id: item.id });
  };

  return (
    <CodexPanel
      id="inventario"
      icon={Package}
      title="Inventario"
      meta={sheet.equipment.length > 0 ? `${sheet.equipment.length} oggetti` : undefined}
      storageScope={storageScope}
      actions={
        canEdit ? (
          <Button variant="ghost" size="sm" onClick={addItem}>
            <Plus className="size-3.5" />
            Oggetto
          </Button>
        ) : undefined
      }
    >
      {equipped.length > 0 && (
        <div className="mb-5">
          <PanelEyebrow>Equipaggiato</PanelEyebrow>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {equipped.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {backpack.length > 0 && (
        <div className="mb-5">
          <PanelEyebrow>Zaino · {backpack.length}</PanelEyebrow>
          <div className="grid gap-2.5 lg:grid-cols-2">
            {backpack.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {sheet.equipment.length === 0 && (
        <p className="mb-5 text-sm text-muted-foreground italic">
          Lo zaino è vuoto.
          {canEdit && " Aggiungi il primo oggetto con il pulsante qui sopra."}
        </p>
      )}

      {/* Borsa delle monete */}
      <PanelEyebrow>Borsa</PanelEyebrow>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {COIN_KEYS.map((coin) => (
          <div
            key={coin}
            className="flex flex-col items-center gap-0.5 rounded-xl border border-hairline bg-surface-0/60 px-2 py-2.5"
          >
            <InlineNumber
              value={sheet.money[coin]}
              min={0}
              onCommit={(value) =>
                patchSheet({ money: { ...sheet.money, [coin]: value } })
              }
              disabled={!canEdit}
              ariaLabel={`Monete di ${COIN_LABELS[coin].toLowerCase()}`}
              className={cn(
                "font-heading text-lg leading-none font-bold",
                COIN_TINT[coin]
              )}
            />
            <span className="flex items-center gap-1 text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
              <Coins aria-hidden className="size-3" />
              {COIN_LABELS[coin]}
            </span>
          </div>
        ))}
      </div>
    </CodexPanel>
  );
}

/* ============================================================
 * Magie — slot interattivi, trucchetti, grimorio.
 * ============================================================ */

function spellLevelTint(level: number): string {
  if (level === 0) return "border-hairline-strong text-silver";
  if (level <= 2) return "border-emerald/40 text-emerald-bright";
  if (level <= 4) return "border-arcane-bright/45 text-arcane-bright";
  if (level <= 6) return "border-gold/45 text-gold-bright";
  return "border-crimson/50 text-crimson-light";
}

/** Fila di gemme-slot: piene = disponibili, spente = spese. */
function SlotPips({ slot }: { slot: SpellSlot }) {
  const { sheet, canEdit, patchSheet } = useCodex();

  const setUsed = (used: number) =>
    patchSheet({
      spellSlots: sheet.spellSlots.map((entry) =>
        entry.level === slot.level ? { ...entry, used } : entry
      ),
    });

  if (slot.total > 6) {
    const remaining = Math.max(slot.total - slot.used, 0);
    return (
      <Stepper
        disabled={!canEdit}
        onDecrement={() => setUsed(Math.min(slot.total, slot.used + 1))}
        onIncrement={() => setUsed(Math.max(0, slot.used - 1))}
        decrementLabel="Spendi uno slot"
        incrementLabel="Recupera uno slot"
      >
        <span className="min-w-9 text-center font-heading text-sm font-bold tabular-nums">
          {remaining}/{slot.total}
        </span>
      </Stepper>
    );
  }

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label={`Slot di livello ${slot.level}`}>
      {Array.from({ length: slot.total }).map((_, index) => {
        const available = index < slot.total - slot.used;
        return (
          <button
            key={index}
            type="button"
            disabled={!canEdit}
            onClick={() =>
              available
                ? setUsed(Math.min(slot.total, slot.used + 1))
                : setUsed(Math.max(0, slot.used - 1))
            }
            aria-label={
              available
                ? `Slot ${index + 1} disponibile — clicca per spenderlo`
                : `Slot ${index + 1} speso — clicca per recuperarlo`
            }
            className={cn(
              "size-4 rotate-45 rounded-[3px] border transition-all duration-150",
              available
                ? "border-arcane-bright/70 bg-arcane shadow-[0_0_8px_rgba(167,154,230,0.45)]"
                : "border-hairline-strong bg-surface-0",
              canEdit && "hover:scale-110"
            )}
          />
        );
      })}
    </div>
  );
}

export function PanelMagic({ storageScope }: { storageScope: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const [cantripDraft, setCantripDraft] = useState("");

  const sortedSlots = [...sheet.spellSlots].sort((a, b) => a.level - b.level);
  const sortedSpells = [...sheet.spells].sort(
    (a, b) => a.level - b.level || a.name.localeCompare(b.name, "it")
  );

  const addSpell = () => {
    const spell = {
      id: genId(),
      name: "Nuovo incantesimo",
      level: 1,
      prepared: false,
      notes: "",
    };
    patchSheet({ spells: [...sheet.spells, spell] });
    inspect({ type: "spell", id: spell.id });
  };

  const addSlotLevel = () => {
    const existing = new Set(sheet.spellSlots.map((slot) => slot.level));
    const nextLevel = Array.from({ length: 9 }, (_, i) => i + 1).find(
      (level) => !existing.has(level)
    );
    if (!nextLevel) return;
    patchSheet({
      spellSlots: [
        ...sheet.spellSlots,
        { level: nextLevel, total: 1, used: 0 },
      ],
    });
  };

  const patchSlotTotal = (slot: SpellSlot, total: number) =>
    patchSheet({
      spellSlots:
        total <= 0
          ? sheet.spellSlots.filter((entry) => entry.level !== slot.level)
          : sheet.spellSlots.map((entry) =>
              entry.level === slot.level
                ? { ...entry, total, used: Math.min(entry.used, total) }
                : entry
            ),
    });

  const addCantrip = () => {
    const name = cantripDraft.trim();
    if (!name) return;
    if (!sheet.cantrips.includes(name)) {
      patchSheet({ cantrips: [...sheet.cantrips, name] });
    }
    setCantripDraft("");
  };

  return (
    <CodexPanel
      id="magie"
      icon={Wand2}
      title="Magie"
      accent="arcane"
      meta={
        sheet.spells.length > 0
          ? `${sheet.spells.length} incantesimi`
          : undefined
      }
      storageScope={storageScope}
      actions={
        canEdit ? (
          <Button variant="ghost" size="sm" onClick={addSpell}>
            <Plus className="size-3.5" />
            Incantesimo
          </Button>
        ) : undefined
      }
    >
      {/* Origine del potere */}
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
        {canEdit ? (
          <Select
            value={sheet.spellcastingAbility || "none"}
            onValueChange={(value) =>
              patchSheet({
                spellcastingAbility:
                  value === "none" ? "" : (value as Ability),
              })
            }
          >
            <SelectTrigger size="sm" className="w-52">
              <Wand2 className="size-4 text-arcane-bright" />
              <SelectValue placeholder="Caratteristica…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nessun incantatore</SelectItem>
              {ABILITIES.map((ability) => (
                <SelectItem key={ability} value={ability}>
                  {ABILITY_LABELS[ability]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          sheet.spellcastingAbility && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-arcane-bright/40 bg-arcane-blue/50 px-3 py-1.5">
              <Wand2 className="size-4 text-arcane-bright" />
              Incantatore:{" "}
              <strong className="text-foreground">
                {ABILITY_LABELS[sheet.spellcastingAbility]}
              </strong>
            </span>
          )
        )}
        {sheet.spellcastingAbility && (
          <span className="text-muted-foreground">
            CD incantesimi{" "}
            <strong className="text-foreground">
              {8 + sheet.proficiencyBonus + abilityMod(sheet, sheet.spellcastingAbility)}
            </strong>
            {" · "}attacco{" "}
            <strong className="text-foreground">
              {formatModifier(
                sheet.proficiencyBonus + abilityMod(sheet, sheet.spellcastingAbility)
              )}
            </strong>
          </span>
        )}
        <span className="text-muted-foreground">
          Focus:{" "}
          <InlineText
            value={sheet.arcaneFocus}
            onCommit={(arcaneFocus) => patchSheet({ arcaneFocus })}
            disabled={!canEdit}
            placeholder="—"
            ariaLabel="Focus arcano"
            className="text-foreground/90"
          />
        </span>
      </div>

      {/* Slot incantesimo */}
      {(sortedSlots.length > 0 || canEdit) && (
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <PanelEyebrow className="mb-0">Slot incantesimo</PanelEyebrow>
            {canEdit && sortedSlots.length < 9 && (
              <button
                type="button"
                onClick={addSlotLevel}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-gold-bright"
              >
                <Plus className="size-3" />
                Livello
              </button>
            )}
          </div>
          {sortedSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Nessuno slot configurato.
            </p>
          ) : (
            <div className="space-y-2">
              {sortedSlots.map((slot) => (
                <div
                  key={slot.level}
                  className="flex min-h-10 flex-wrap items-center gap-3 rounded-lg border border-hairline bg-surface-0/60 px-3 py-1.5"
                >
                  <span className="w-12 font-heading text-sm font-bold text-parchment">
                    Liv. {slot.level}
                  </span>
                  <SlotPips slot={slot} />
                  <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    {Math.max(slot.total - slot.used, 0)}/{slot.total}
                    {canEdit && (
                      <span className="flex items-center">
                        <button
                          type="button"
                          onClick={() => patchSlotTotal(slot, slot.total - 1)}
                          aria-label={`Riduci gli slot di livello ${slot.level}`}
                          className="grid size-6 place-items-center rounded text-muted-foreground hover:text-crimson-light"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          onClick={() => patchSlotTotal(slot, slot.total + 1)}
                          aria-label={`Aumenta gli slot di livello ${slot.level}`}
                          className="grid size-6 place-items-center rounded text-muted-foreground hover:text-emerald-bright"
                        >
                          +
                        </button>
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trucchetti */}
      {(sheet.cantrips.length > 0 || canEdit) && (
        <div className="mb-5">
          <PanelEyebrow>Trucchetti</PanelEyebrow>
          <div className="flex flex-wrap items-center gap-1.5">
            {sheet.cantrips.map((cantrip) => (
              <span
                key={cantrip}
                className={cn(
                  "group inline-flex min-h-7 items-center gap-1 rounded-full border bg-surface-0/60 px-2.5 py-1 text-xs",
                  spellLevelTint(0)
                )}
              >
                {cantrip}
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Rimuovi ${cantrip}`}
                    onClick={() =>
                      patchSheet({
                        cantrips: sheet.cantrips.filter((c) => c !== cantrip),
                      })
                    }
                    className="text-muted-foreground opacity-60 transition-opacity hover:text-crimson-light group-hover:opacity-100"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </span>
            ))}
            {canEdit && (
              <input
                value={cantripDraft}
                onChange={(event) => setCantripDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCantrip();
                  }
                }}
                onBlur={addCantrip}
                placeholder="+ trucchetto…"
                aria-label="Aggiungi trucchetto"
                className="field-engraved h-7 w-32 rounded-full px-2.5 text-xs outline-none"
              />
            )}
          </div>
        </div>
      )}

      {/* Grimorio */}
      {sortedSpells.length > 0 && (
        <div>
          <PanelEyebrow>Grimorio</PanelEyebrow>
          <div className="grid gap-2 lg:grid-cols-2">
            {sortedSpells.map((spell) => (
              <button
                key={spell.id}
                type="button"
                onClick={() => inspect({ type: "spell", id: spell.id })}
                className={cn(
                  "group flex items-center gap-2.5 rounded-xl border bg-surface-1 p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:elev-2",
                  spell.prepared ? "border-arcane-bright/40" : "border-hairline hover:border-hairline-strong"
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-lg border bg-surface-0 font-heading text-sm font-bold tabular-nums",
                    spellLevelTint(spell.level)
                  )}
                >
                  {spell.level}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-heading text-sm font-semibold text-foreground">
                    {spell.name || "Incantesimo"}
                  </span>
                  {spell.notes && (
                    <span className="block truncate text-xs text-muted-foreground">
                      {spell.notes}
                    </span>
                  )}
                </span>
                {spell.prepared && (
                  <span
                    aria-label="Preparato"
                    className="size-1.5 shrink-0 rounded-full bg-arcane-bright shadow-[0_0_6px_rgba(167,154,230,0.6)]"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </CodexPanel>
  );
}

/* ============================================================
 * Stato & Risorse — riposi, risorse di classe, effetti attivi.
 * ============================================================ */

export function PanelResources({ storageScope }: { storageScope: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();

  const addResource = () => {
    const resource = {
      id: genId(),
      name: "Nuova risorsa",
      current: 1,
      max: 1,
      recharge: "LONG_REST" as const,
    };
    patchSheet({ resources: [...sheet.resources, resource] });
    inspect({ type: "resource", id: resource.id });
  };

  const shortRest = () => {
    patchSheet({
      resources: sheet.resources.map((resource) =>
        resource.recharge === "SHORT_REST"
          ? { ...resource, current: resource.max }
          : resource
      ),
    });
    toast.success("Riposo breve", {
      description: "Le risorse a riposo breve sono state ricaricate.",
    });
  };

  const longRest = () => {
    patchSheet(
      {
        currentHp: sheet.maxHp,
        tempHp: 0,
        exhaustion: Math.max(0, sheet.exhaustion - 1),
        spellSlots: sheet.spellSlots.map((slot) => ({ ...slot, used: 0 })),
        resources: sheet.resources.map((resource) =>
          resource.recharge === "MANUAL"
            ? resource
            : { ...resource, current: resource.max }
        ),
      },
      { history: makeHistoryEntry("NOTE", "Riposo lungo") }
    );
    toast.success("Riposo lungo", {
      description: "PF al massimo, slot e risorse ricaricati.",
    });
  };

  return (
    <CodexPanel
      id="risorse"
      icon={Sparkles}
      title="Stato & Risorse"
      storageScope={storageScope}
      actions={
        canEdit ? (
          <Button variant="ghost" size="sm" onClick={addResource}>
            <Plus className="size-3.5" />
            Risorsa
          </Button>
        ) : undefined
      }
    >
      {sheet.resources.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nessuna risorsa registrata (Ira, Ki, Dadi vita, usi di oggetti…).
        </p>
      ) : (
        <div className="space-y-2">
          {sheet.resources.map((resource) => (
            <div
              key={resource.id}
              className="flex min-h-11 flex-wrap items-center gap-3 rounded-lg border border-hairline bg-surface-0/60 px-3 py-1.5"
            >
              <button
                type="button"
                onClick={() => inspect({ type: "resource", id: resource.id })}
                className="min-w-0 flex-1 truncate text-left font-heading text-sm font-semibold text-foreground transition-colors hover:text-gold-bright"
              >
                {resource.name}
                <span className="ml-2 align-middle font-sans text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  {RESOURCE_RECHARGE_LABELS[resource.recharge]}
                </span>
              </button>
              <Stepper
                disabled={!canEdit}
                onDecrement={() =>
                  patchSheet({
                    resources: sheet.resources.map((entry) =>
                      entry.id === resource.id
                        ? { ...entry, current: Math.max(0, entry.current - 1) }
                        : entry
                    ),
                  })
                }
                onIncrement={() =>
                  patchSheet({
                    resources: sheet.resources.map((entry) =>
                      entry.id === resource.id
                        ? {
                            ...entry,
                            current: Math.min(entry.max, entry.current + 1),
                          }
                        : entry
                    ),
                  })
                }
                decrementLabel={`Spendi ${resource.name}`}
                incrementLabel={`Recupera ${resource.name}`}
              >
                <span className="min-w-9 text-center font-heading text-sm font-bold text-parchment tabular-nums">
                  {resource.current}/{resource.max}
                </span>
              </Stepper>
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-hairline pt-4">
          <Button variant="outline" size="sm" onClick={shortRest}>
            <BedDouble className="size-3.5" />
            Riposo breve
          </Button>
          <Button variant="outline" size="sm" onClick={longRest}>
            <Moon className="size-3.5" />
            Riposo lungo
          </Button>
          <p className="basis-full text-xs text-muted-foreground">
            Il riposo lungo riporta i PF al massimo, ricarica slot e risorse e
            riduce l&rsquo;indebolimento di 1.
          </p>
        </div>
      )}
    </CodexPanel>
  );
}
