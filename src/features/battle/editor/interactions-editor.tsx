"use client";

import { Trash2 } from "lucide-react";

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
import {
  INTERACTION_LABELS,
  OBJECT_STATE_LABELS,
} from "@/features/battle/library";
import type { ResolutionMethod } from "@/types/element-catalog";
import {
  INTERACTION_KINDS,
  OBJECT_STATES,
  type ElementInteraction,
  type InteractionKind,
  type MapObject,
  type ObjectState,
} from "@/types/battlemap";

import { useEditor } from "./use-editor";

/* ============================================================
 * Azioni disponibili su un elemento ambientale.
 *
 * L'effetto è dichiarativo — "questa azione apre la porta e la rende
 * attraversabile" — così durante lo scontro il motore sa applicarlo da
 * solo quando un giocatore preme il pulsante, senza che il Master debba
 * ricordarsi di aggiornare la mappa a mano.
 * ============================================================ */

export function InteractionsEditor({
  object,
  renderCheck,
}: {
  object: MapObject;
  /** L'editor delle prove vive nel pannello proprietà: lo si riusa. */
  renderCheck: (
    value: ElementInteraction["check"],
    onChange: (check: ElementInteraction["check"]) => void
  ) => React.ReactNode;
}) {
  const editor = useEditor();

  const patch = (interactions: ElementInteraction[], label: string) =>
    editor.updateElement("object", object.id, { interactions }, label);

  const update = (id: string, change: Partial<ElementInteraction>) =>
    patch(
      object.interactions.map((entry) =>
        entry.id === id ? { ...entry, ...change } : entry
      ),
      "Azione"
    );

  const add = (kind: InteractionKind) =>
    patch(
      [
        ...object.interactions,
        {
          id: `${kind.toLowerCase()}-${object.interactions.length + 1}`,
          kind,
          label: INTERACTION_LABELS[kind],
          description: "",
          check: null,
          setsState: null,
          setsBlocksMovement: null,
          setsBlocksSight: null,
          setsCover: null,
          visibleToPlayers: true,
          once: false,
          used: false,
        },
      ],
      "Nuova azione"
    );

  return (
    <div className="space-y-2 rounded-lg border border-hairline p-2">
      <p className="font-heading text-[0.65rem] tracking-[0.14em] text-gold/70 uppercase">
        Interazioni
      </p>

      {object.interactions.length === 0 && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Nessuna azione: l&apos;elemento resta scenografia, con le sue regole
          di passaggio e copertura.
        </p>
      )}

      {object.interactions.map((interaction) => (
        <div
          key={interaction.id}
          className="space-y-1.5 rounded-md border border-hairline bg-surface-2/40 p-2"
        >
          <div className="flex items-center gap-1.5">
            <Input
              value={interaction.label}
              className="h-7 text-xs"
              onChange={(event) =>
                update(interaction.id, { label: event.target.value })
              }
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-crimson-bright"
              aria-label="Rimuovi azione"
              onClick={() =>
                patch(
                  object.interactions.filter(
                    (entry) => entry.id !== interaction.id
                  ),
                  "Rimuovi azione"
                )
              }
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <Select
              value={interaction.setsState ?? "KEEP"}
              onValueChange={(value) =>
                update(interaction.id, {
                  setsState: value === "KEEP" ? null : (value as ObjectState),
                })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEEP">Stato invariato</SelectItem>
                {OBJECT_STATES.map((state) => (
                  <SelectItem key={state} value={state}>
                    → {OBJECT_STATE_LABELS[state]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={
                interaction.setsBlocksMovement === null
                  ? "KEEP"
                  : interaction.setsBlocksMovement
                    ? "BLOCK"
                    : "FREE"
              }
              onValueChange={(value) =>
                update(interaction.id, {
                  setsBlocksMovement:
                    value === "KEEP" ? null : value === "BLOCK",
                  setsBlocksSight:
                    value === "KEEP"
                      ? interaction.setsBlocksSight
                      : value === "BLOCK",
                  setsCover: value === "FREE" ? "NONE" : interaction.setsCover,
                })
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="KEEP">Passaggio invariato</SelectItem>
                <SelectItem value="FREE">→ Diventa attraversabile</SelectItem>
                <SelectItem value="BLOCK">→ Diventa invalicabile</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <label className="flex items-center gap-1.5">
              <Switch
                checked={interaction.visibleToPlayers}
                onCheckedChange={(checked) =>
                  update(interaction.id, { visibleToPlayers: checked })
                }
              />
              Offerta ai giocatori
            </label>
            <label className="flex items-center gap-1.5">
              <Switch
                checked={interaction.once}
                onCheckedChange={(checked) =>
                  update(interaction.id, { once: checked })
                }
              />
              Una volta sola
            </label>
          </div>

          {(interaction.availableStates?.length ?? 0) > 0 && (
            <p className="text-[10px] text-muted-foreground">
              Disponibile solo in:{" "}
              {interaction.availableStates!
                .map((id) => object.stateBehaviours?.[id]?.label ?? id)
                .join(", ")}
            </p>
          )}

          {(interaction.methods?.length ?? 0) > 0 ? (
            <MethodList
              methods={interaction.methods!}
              onChange={(methods) => update(interaction.id, { methods })}
            />
          ) : (
            renderCheck(interaction.check, (check) =>
              update(interaction.id, { check })
            )
          )}
        </div>
      ))}

      <Select value="" onValueChange={(value) => add(value as InteractionKind)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Aggiungi un'azione…" />
        </SelectTrigger>
        <SelectContent>
          {INTERACTION_KINDS.map((kind) => (
            <SelectItem key={kind} value={kind}>
              {INTERACTION_LABELS[kind]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * I modi di riuscirci. La CD è il valore che il Master ritocca davvero
 * (una porta rinforzata in una rocca nanica non è quella di una locanda),
 * quindi è l'unico numero modificabile qui; gli esiti restano in
 * lettura, perché descrivono che cosa accade e non quanto è difficile.
 */
function MethodList({
  methods,
  onChange,
}: {
  methods: ResolutionMethod[];
  onChange: (methods: ResolutionMethod[]) => void;
}) {
  const update = (id: string, change: Partial<ResolutionMethod>) =>
    onChange(
      methods.map((method) =>
        method.id === id ? { ...method, ...change } : method
      )
    );

  return (
    <div className="space-y-1.5">
      {methods.map((method) => (
        <div
          key={method.id}
          className="rounded-md border border-hairline bg-surface-1/60 p-1.5"
        >
          <div className="flex items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-[11px]">
              {method.label}
            </span>
            {method.check ? (
              <>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {method.check.skill} CD
                </span>
                <Input
                  type="number"
                  className="h-6 w-12 px-1 text-center text-[11px] tabular-nums"
                  value={method.check.dc}
                  onChange={(event) =>
                    update(method.id, {
                      check: {
                        ...method.check!,
                        difficulty: "CUSTOM",
                        dc: Number(event.target.value),
                      },
                    })
                  }
                />
              </>
            ) : (
              <span className="shrink-0 text-[10px] text-muted-foreground">
                automatico
              </span>
            )}
            <Switch
              checked={method.visibleToPlayers}
              onCheckedChange={(checked) =>
                update(method.id, { visibleToPlayers: checked })
              }
            />
          </div>

          {method.requiresTool && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Richiede: {method.requiresTool}
            </p>
          )}
          {method.outcomes.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {method.outcomes.map((outcome, index) => (
                <li
                  key={`${method.id}-${index}`}
                  className="truncate text-[10px] text-muted-foreground"
                >
                  <span
                    className={
                      outcome.kind.includes("FAIL")
                        ? "text-crimson-light/80"
                        : "text-emerald-300/80"
                    }
                  >
                    {OUTCOME_SHORT[outcome.kind]}
                  </span>{" "}
                  {outcome.message}
                  {outcome.toState ? ` → ${outcome.toState}` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

const OUTCOME_SHORT: Record<string, string> = {
  SUCCESS: "Riuscita:",
  FAILURE: "Fallita:",
  CRITICAL_SUCCESS: "Critico:",
  CRITICAL_FAILURE: "Disastro:",
};
