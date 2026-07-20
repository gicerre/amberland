"use client";

import {
  CalendarCog,
  ChevronDown,
  ChevronUp,
  Loader2,
  Milestone,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConsoleField,
  ConsoleNav,
  ConsolePanel,
  ConsoleSectionHeading,
  FormConsole,
  ImmersiveModal,
  type ConsoleSection,
} from "@/design-system";
import type {
  CalendarEra,
  CalendarMonth,
  NarrativeArc,
} from "@/types/chronicles";

import {
  useArcs,
  useArcsMutation,
  useCalendar,
  useCalendarMutation,
  useRecomputeDates,
} from "../data";

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

function move<T>(list: T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

interface FormState {
  eras: CalendarEra[];
  months: CalendarMonth[];
  yearSuffix: string;
  arcs: NarrativeArc[];
}

const calendarKey = (state: Pick<FormState, "eras" | "months" | "yearSuffix">) =>
  JSON.stringify({
    eras: state.eras,
    months: state.months,
    yearSuffix: state.yearSuffix,
  });

/**
 * Console del Master per la spina dorsale del Libro: il calendario di
 * Amberland (ere, mesi, suffisso dell'anno) e gli archi narrativi.
 * L'ordine delle righe È l'ordine cronologico: dopo aver riordinato
 * ere o mesi va eseguito «Ricalcola date».
 */
export function CalendarArcsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: calendar } = useCalendar();
  const { data: arcs } = useArcs();
  const calendarMutation = useCalendarMutation();
  const arcsMutation = useArcsMutation();
  const recompute = useRecomputeDates();

  const [form, setForm] = useState<FormState | null>(null);
  const [section, setSection] = useState("calendario");

  // Idratazione al primo open (mai sui refetch: si perderebbero le modifiche).
  useEffect(() => {
    if (!open) {
      setForm(null);
      setSection("calendario");
      return;
    }
    if (form || !calendar || !arcs) return;
    setForm({
      eras: calendar.eras,
      months: calendar.months,
      yearSuffix: calendar.yearSuffix,
      arcs,
    });
  }, [open, form, calendar, arcs]);

  const patch = (partial: Partial<FormState>) =>
    setForm((current) => (current ? { ...current, ...partial } : current));

  const savedCalendarKey = useMemo(
    () =>
      calendarKey({
        eras: calendar?.eras ?? [],
        months: calendar?.months ?? [],
        yearSuffix: calendar?.yearSuffix ?? "",
      }),
    [calendar]
  );
  const savedArcsKey = useMemo(() => JSON.stringify(arcs ?? []), [arcs]);
  const calendarDirty = form !== null && calendarKey(form) !== savedCalendarKey;
  const arcsDirty = form !== null && JSON.stringify(form.arcs) !== savedArcsKey;
  const dirty = calendarDirty || arcsDirty;

  const saving = calendarMutation.isPending || arcsMutation.isPending;

  const handleSave = () => {
    if (!form) return;
    if (form.eras.some((era) => !era.name.trim())) {
      toast.error("Ogni era ha bisogno di un nome");
      setSection("calendario");
      return;
    }
    if (form.months.some((month) => !month.name.trim())) {
      toast.error("Ogni mese ha bisogno di un nome");
      setSection("calendario");
      return;
    }
    if (form.months.some((month) => !Number.isFinite(month.days) || month.days < 1)) {
      toast.error("Ogni mese deve avere almeno un giorno");
      setSection("calendario");
      return;
    }
    if (form.arcs.some((arc) => !arc.name.trim())) {
      toast.error("Ogni arco ha bisogno di un nome");
      setSection("archi");
      return;
    }

    // L'ordine delle righe diventa l'ordine canonico (index → order).
    const cleaned: FormState = {
      eras: form.eras.map((era) => ({
        ...era,
        name: era.name.trim(),
        abbreviation: era.abbreviation.trim(),
      })),
      months: form.months.map((month) => ({
        ...month,
        name: month.name.trim(),
      })),
      yearSuffix: form.yearSuffix.trim(),
      arcs: form.arcs.map((arc, index) => ({
        ...arc,
        name: arc.name.trim(),
        description: arc.description.trim(),
        order: index,
      })),
    };
    setForm(cleaned);

    if (calendarKey(cleaned) !== savedCalendarKey) {
      calendarMutation.mutate({
        eras: cleaned.eras,
        months: cleaned.months,
        yearSuffix: cleaned.yearSuffix,
      });
    }
    if (JSON.stringify(cleaned.arcs) !== savedArcsKey) {
      arcsMutation.mutate(cleaned.arcs);
    }
  };

  const sections: ConsoleSection[] = useMemo(
    () => [
      { id: "calendario", label: "Calendario", icon: <CalendarCog /> },
      { id: "archi", label: "Archi narrativi", icon: <Milestone /> },
    ],
    []
  );

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      flush
      icon={<CalendarCog />}
      title="Calendario & Archi"
      description="Ere, mesi e archi narrativi: l'ossatura su cui si ordina il Libro delle Cronache."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Chiudi
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Salva
          </Button>
        </>
      }
    >
      <FormConsole
        nav={
          <ConsoleNav
            sections={sections}
            active={section}
            onChange={setSection}
          />
        }
      >
        {section === "calendario" && form && (
          <ConsolePanel sectionKey="calendario">
            <ConsoleSectionHeading
              icon={<CalendarCog />}
              title="Calendario di Amberland"
              subtitle="Le ere e i mesi, nell'ordine in cui scorrono: le date del Libro si ordinano su questa struttura."
            />

            <ListHeader
              label="Ere"
              addLabel="Era"
              onAdd={() =>
                patch({
                  eras: [
                    ...form.eras,
                    { id: newId(), name: "", abbreviation: "" },
                  ],
                })
              }
            />
            {form.eras.length === 0 ? (
              <EmptyHint text="Nessuna era: gli anni contano da soli, con l'eventuale suffisso qui sotto." />
            ) : (
              <ul className="space-y-2">
                {form.eras.map((era, index) => (
                  <li
                    key={era.id}
                    className="flex items-center gap-2 rounded-lg border border-hairline bg-night/30 p-2.5"
                  >
                    <Input
                      value={era.name}
                      onChange={(event) =>
                        patch({
                          eras: form.eras.map((candidate) =>
                            candidate.id === era.id
                              ? { ...candidate, name: event.target.value }
                              : candidate
                          ),
                        })
                      }
                      aria-label="Nome dell'era"
                      placeholder="Terza Era"
                      className="min-w-0 flex-1"
                    />
                    <Input
                      value={era.abbreviation}
                      onChange={(event) =>
                        patch({
                          eras: form.eras.map((candidate) =>
                            candidate.id === era.id
                              ? {
                                  ...candidate,
                                  abbreviation: event.target.value,
                                }
                              : candidate
                          ),
                        })
                      }
                      aria-label="Sigla dell'era"
                      placeholder="T.E."
                      className="w-24"
                    />
                    <RowControls
                      index={index}
                      count={form.eras.length}
                      itemLabel="era"
                      onMove={(delta) =>
                        patch({ eras: move(form.eras, index, delta) })
                      }
                      onRemove={() =>
                        patch({
                          eras: form.eras.filter(
                            (candidate) => candidate.id !== era.id
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}

            <ListHeader
              label="Mesi"
              addLabel="Mese"
              onAdd={() =>
                patch({
                  months: [...form.months, { id: newId(), name: "", days: 30 }],
                })
              }
            />
            {form.months.length === 0 ? (
              <EmptyHint text="Nessun mese: le date del Libro indicheranno solo l'anno." />
            ) : (
              <ul className="space-y-2">
                {form.months.map((month, index) => (
                  <li
                    key={month.id}
                    className="flex items-center gap-2 rounded-lg border border-hairline bg-night/30 p-2.5"
                  >
                    <Input
                      value={month.name}
                      onChange={(event) =>
                        patch({
                          months: form.months.map((candidate) =>
                            candidate.id === month.id
                              ? { ...candidate, name: event.target.value }
                              : candidate
                          ),
                        })
                      }
                      aria-label="Nome del mese"
                      placeholder="Luna Rossa"
                      className="min-w-0 flex-1"
                    />
                    <label className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={1}
                        value={Number.isFinite(month.days) ? month.days : ""}
                        onChange={(event) =>
                          patch({
                            months: form.months.map((candidate) =>
                              candidate.id === month.id
                                ? {
                                    ...candidate,
                                    days: Number.isNaN(
                                      event.target.valueAsNumber
                                    )
                                      ? 0
                                      : event.target.valueAsNumber,
                                  }
                                : candidate
                            ),
                          })
                        }
                        aria-label="Giorni del mese"
                        className="w-20"
                      />
                      <span className="text-xs text-muted-foreground">
                        giorni
                      </span>
                    </label>
                    <RowControls
                      index={index}
                      count={form.months.length}
                      itemLabel="mese"
                      onMove={(delta) =>
                        patch({ months: move(form.months, index, delta) })
                      }
                      onRemove={() =>
                        patch({
                          months: form.months.filter(
                            (candidate) => candidate.id !== month.id
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}

            <ConsoleField
              label="Suffisso dell'anno"
              hint="Mostrato quando la data non indica un'era (es. «1247 E.R.»)."
            >
              <Input
                value={form.yearSuffix}
                onChange={(event) => patch({ yearSuffix: event.target.value })}
                placeholder="E.R."
                className="w-32"
              />
            </ConsoleField>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-night/30 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm tracking-wide text-foreground/85">
                  Ricalcola le date del Libro
                </p>
                <p className="text-xs text-muted-foreground">
                  Dopo aver riordinato ere o mesi, riallinea ordine ed
                  etichette di tutti i capitoli.
                  {dirty && " Prima salva le modifiche."}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={dirty || recompute.isPending || !form}
                onClick={() =>
                  recompute.mutate({
                    eras: form.eras,
                    months: form.months,
                    yearSuffix: form.yearSuffix,
                    updatedAt: null,
                  })
                }
              >
                {recompute.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCcw className="size-3.5" />
                )}
                Ricalcola date
              </Button>
            </div>
          </ConsolePanel>
        )}

        {section === "archi" && form && (
          <ConsolePanel sectionKey="archi">
            <ConsoleSectionHeading
              icon={<Milestone />}
              title="Archi narrativi"
              subtitle="Le grandi stagioni della campagna: i capitoli si possono raggruppare per arco."
            />

            <ListHeader
              label="Archi"
              addLabel="Arco"
              onAdd={() =>
                patch({
                  arcs: [
                    ...form.arcs,
                    {
                      id: newId(),
                      name: "",
                      description: "",
                      order: form.arcs.length,
                    },
                  ],
                })
              }
            />
            {form.arcs.length === 0 ? (
              <EmptyHint text="Nessun arco narrativo: aggiungine uno per raggruppare i capitoli della stessa stagione." />
            ) : (
              <ul className="space-y-2">
                {form.arcs.map((arc, index) => (
                  <li
                    key={arc.id}
                    className="flex items-start gap-2 rounded-lg border border-hairline bg-night/30 p-2.5"
                  >
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                      <Input
                        value={arc.name}
                        onChange={(event) =>
                          patch({
                            arcs: form.arcs.map((candidate) =>
                              candidate.id === arc.id
                                ? { ...candidate, name: event.target.value }
                                : candidate
                            ),
                          })
                        }
                        aria-label="Nome dell'arco"
                        placeholder="L'ombra sul Nord"
                      />
                      <Input
                        value={arc.description}
                        onChange={(event) =>
                          patch({
                            arcs: form.arcs.map((candidate) =>
                              candidate.id === arc.id
                                ? {
                                    ...candidate,
                                    description: event.target.value,
                                  }
                                : candidate
                            ),
                          })
                        }
                        aria-label="Descrizione dell'arco"
                        placeholder="Breve descrizione (facoltativa)"
                      />
                    </div>
                    <RowControls
                      index={index}
                      count={form.arcs.length}
                      itemLabel="arco"
                      onMove={(delta) =>
                        patch({ arcs: move(form.arcs, index, delta) })
                      }
                      onRemove={() =>
                        patch({
                          arcs: form.arcs.filter(
                            (candidate) => candidate.id !== arc.id
                          ),
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </ConsolePanel>
        )}
      </FormConsole>
    </ImmersiveModal>
  );
}

/* --------------------------- Sottocomponenti ------------------------ */

function ListHeader({
  label,
  addLabel,
  onAdd,
}: {
  label: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-heading text-[0.7rem] font-semibold tracking-[0.14em] text-gold/75 uppercase">
        {label}
      </span>
      <Button type="button" size="sm" variant="outline" onClick={onAdd}>
        <Plus className="size-3.5" />
        {addLabel}
      </Button>
    </div>
  );
}

function RowControls({
  index,
  count,
  itemLabel,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  itemLabel: string;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Sposta ${itemLabel} su`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ChevronUp />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Sposta ${itemLabel} giù`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ChevronDown />
      </Button>
      <Button
        type="button"
        variant="destructive"
        size="icon-sm"
        aria-label={`Rimuovi ${itemLabel}`}
        onClick={onRemove}
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-hairline px-4 py-5 text-center text-sm text-muted-foreground italic">
      {text}
    </p>
  );
}
