"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { CalendarDefinition, WorldDate } from "@/types/chronicles";

import { formatWorldDate, monthOf } from "../calendar";

const UNKNOWN = "__unknown__";

/**
 * Selettore di una data del calendario di Amberland: era, anno (anche
 * negativo), mese e giorno — con «ignoto» per le parti non precisate.
 * Se il Master non ha ancora definito ere/mesi, restano solo gli anni.
 */
export function WorldDatePicker({
  value,
  onChange,
  calendar,
}: {
  value: WorldDate | null;
  onChange: (date: WorldDate | null) => void;
  calendar: CalendarDefinition;
}) {
  const patch = (partial: Partial<WorldDate>) => {
    const base: WorldDate = value ?? {
      eraId: null,
      year: 1,
      month: null,
      day: null,
    };
    onChange({ ...base, ...partial });
  };

  const month = value ? monthOf(value, calendar) : null;
  const daysInMonth = month?.days ?? 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-black/30 px-4 py-3">
        <span className="font-heading text-sm tracking-wide text-foreground/85">
          Perso nel tempo immemore
        </span>
        <Switch
          checked={value === null}
          onCheckedChange={(unknown) =>
            onChange(
              unknown
                ? null
                : { eraId: null, year: 1, month: null, day: null }
            )
          }
        />
      </div>

      {value !== null && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {calendar.eras.length > 0 && (
            <label className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Era</span>
              <Select
                value={value.eraId ?? UNKNOWN}
                onValueChange={(selected) =>
                  patch({ eraId: selected === UNKNOWN ? null : selected })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Era…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNKNOWN}>— nessuna —</SelectItem>
                  {calendar.eras.map((era) => (
                    <SelectItem key={era.id} value={era.id}>
                      {era.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          <label className="space-y-1.5">
            <span className="text-xs text-muted-foreground">Anno</span>
            <Input
              type="number"
              value={Number.isFinite(value.year) ? value.year : ""}
              onChange={(event) =>
                patch({
                  year: Number.isNaN(event.target.valueAsNumber)
                    ? 0
                    : event.target.valueAsNumber,
                })
              }
            />
          </label>

          {calendar.months.length > 0 && (
            <label className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Mese</span>
              <Select
                value={value.month === null ? UNKNOWN : String(value.month)}
                onValueChange={(selected) =>
                  patch(
                    selected === UNKNOWN
                      ? { month: null, day: null }
                      : { month: Number(selected) }
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Mese…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNKNOWN}>— ignoto —</SelectItem>
                  {calendar.months.map((candidate, index) => (
                    <SelectItem key={candidate.id} value={String(index + 1)}>
                      {candidate.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}

          {value.month !== null && daysInMonth > 0 && (
            <label className="space-y-1.5">
              <span className="text-xs text-muted-foreground">Giorno</span>
              <Select
                value={value.day === null ? UNKNOWN : String(value.day)}
                onValueChange={(selected) =>
                  patch({ day: selected === UNKNOWN ? null : Number(selected) })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Giorno…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNKNOWN}>— ignoto —</SelectItem>
                  {Array.from({ length: daysInMonth }, (_, index) => (
                    <SelectItem key={index + 1} value={String(index + 1)}>
                      {index + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground italic">
        {value === null
          ? "La data resterà ignota: il capitolo chiude il Libro, nel «Tempo immemore»."
          : `Nel Libro: ${formatWorldDate(value, calendar)}`}
      </p>
    </div>
  );
}
