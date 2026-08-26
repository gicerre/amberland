"use client";

import { Eye, EyeOff, Plus, Swords, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConsoleSectionHeading, TomePanel } from "@/design-system";
import {
  COMBATANT_SIDE_LABELS,
  ENEMY_CATEGORY_LABELS,
  HEALTH_BAND_CLASSES,
  HEALTH_BAND_LABELS,
} from "@/features/battle/constants";
import {
  useCombatants,
  useDeleteCombatant,
  useUpdateCombatant,
} from "@/features/battle/data";
import { cn } from "@/lib/utils";
import type { Battle, CombatantSide } from "@/types/battle";

import { CombatantForm } from "./combatant-form";

/** Ordine di lettura delle schiere: prima i nostri. */
const SIDE_ORDER: CombatantSide[] = ["PC", "ALLY", "NEUTRAL", "ENEMY"];

/**
 * Le schiere sul campo, dal punto di vista del Master: chi c'è, chi è
 * nascosto al party e chi va tolto di mezzo. La riga selezionata è la
 * stessa pedina evidenziata sulla mappa.
 */
export function CombatantRoster({
  battle,
  selectedId,
  onSelect,
}: {
  battle: Battle;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}) {
  const { data: combatants } = useCombatants(battle.id);
  const update = useUpdateCombatant(battle.id);
  const remove = useDeleteCombatant(battle.id);
  const [formOpen, setFormOpen] = useState(false);

  const list = combatants ?? [];

  return (
    <TomePanel>
      <ConsoleSectionHeading
        icon={<Swords />}
        title="Schiere"
        subtitle="Trascina una pedina sulla mappa per collocarla."
      />

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nessuna pedina sul campo. Il branco di Goblin si crea in una volta
          sola: basta indicare la quantità.
        </p>
      ) : (
        <div className="space-y-4">
          {SIDE_ORDER.map((side) => {
            const group = list.filter((combatant) => combatant.side === side);
            if (group.length === 0) return null;
            return (
              <div key={side}>
                <p className="mb-1.5 font-heading text-[0.68rem] tracking-[0.14em] text-muted-foreground uppercase">
                  {COMBATANT_SIDE_LABELS[side]}
                </p>
                <ul className="space-y-1">
                  {group.map((combatant) => (
                    <li key={combatant.id}>
                      <div
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors",
                          combatant.id === selectedId
                            ? "border-gold/50 bg-gold/10"
                            : "border-hairline bg-surface-2/50 hover:border-gold/30"
                        )}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          onClick={() =>
                            onSelect?.(
                              combatant.id === selectedId ? null : combatant.id
                            )
                          }
                        >
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: combatant.accent }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {combatant.publicName}
                            {!combatant.position && (
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                (fuori campo)
                              </span>
                            )}
                          </span>
                          {combatant.category && (
                            <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                              {ENEMY_CATEGORY_LABELS[combatant.category]}
                            </span>
                          )}
                          <span
                            className={cn(
                              "shrink-0 text-xs",
                              HEALTH_BAND_CLASSES[combatant.healthBand]
                            )}
                          >
                            {HEALTH_BAND_LABELS[combatant.healthBand]}
                          </span>
                        </button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0"
                          aria-label={
                            combatant.visible
                              ? "Nascondi al party"
                              : "Mostra al party"
                          }
                          onClick={() =>
                            update.mutate({
                              combatantId: combatant.id,
                              values: { visible: !combatant.visible },
                            })
                          }
                        >
                          {combatant.visible ? (
                            <Eye className="size-3.5" />
                          ) : (
                            <EyeOff className="size-3.5 text-amber-300" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-muted-foreground hover:text-crimson-bright"
                          aria-label="Togli dal campo"
                          onClick={() => remove.mutate(combatant.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4">
        <Button size="sm" onClick={() => setFormOpen(true)}>
          <Plus className="size-3.5" />
          Aggiungi pedina
        </Button>
      </div>

      <CombatantForm
        battle={battle}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
    </TomePanel>
  );
}
