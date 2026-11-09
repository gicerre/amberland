"use client";

import { Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COIN_KEYS, COIN_LABELS } from "@/features/characters/constants";
import type { Money } from "@/types/entities";
import type { ItemPlace } from "@/types/items";

import { placeKey, usePartyMembers } from "../data";

/* Campi riusati dai dialog di oggetti e denaro. */

/** Selettore di collocazione: Borsa Conservante o un PG del party. */
export function PlaceSelect({
  value,
  onChange,
  exclude,
  allowBag = true,
  id,
}: {
  value: ItemPlace;
  onChange: (place: ItemPlace) => void;
  /** Collocazione da non proporre (l'origine). */
  exclude?: ItemPlace | null;
  allowBag?: boolean;
  id?: string;
}) {
  const { data: members } = usePartyMembers();
  const excluded = exclude ? placeKey(exclude) : null;

  return (
    <Select
      value={placeKey(value)}
      onValueChange={(key) =>
        onChange(key === "BAG" ? { location: "BAG" } : { location: "PC", characterId: key })
      }
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {allowBag && excluded !== "BAG" && (
          <SelectItem value="BAG">Borsa Conservante</SelectItem>
        )}
        {members
          .filter((member) => member.id !== excluded)
          .map((member) => (
            <SelectItem key={member.id} value={member.id}>
              Zaino di {member.name}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}

/** Quantità con − / + grandi (usabili al tavolo con una mano). */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = "Quantità",
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  const clamp = (next: number) =>
    Math.max(min, max !== undefined ? Math.min(max, next) : next);
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Diminuisci ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
      >
        <Minus />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(clamp(Number(event.target.value) || min))}
        className="h-10 text-center font-heading text-lg font-bold tabular-nums"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label={`Aumenta ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value + 1))}
        disabled={max !== undefined && value >= max}
      >
        <Plus />
      </Button>
    </div>
  );
}

/** Cinque campi moneta (pp, mo, me, ma, mr). */
export function CoinInputs({
  value,
  onChange,
}: {
  value: Money;
  onChange: (value: Money) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {COIN_KEYS.map((coin) => (
        <label key={coin} className="flex flex-col items-center gap-1">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value[coin] || ""}
            placeholder="0"
            onChange={(event) =>
              onChange({
                ...value,
                [coin]: Math.max(0, Math.floor(Number(event.target.value) || 0)),
              })
            }
            className="h-10 px-1 text-center font-heading font-bold tabular-nums"
          />
          <span className="text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            {COIN_LABELS[coin]}
          </span>
        </label>
      ))}
    </div>
  );
}

const COIN_SHORT: Record<(typeof COIN_KEYS)[number], string> = {
  pp: "mp",
  gp: "mo",
  ep: "me",
  sp: "ma",
  cp: "mr",
};

/** "12 mo · 5 ma" — solo le monete presenti. */
export function formatMoney(money: Money): string {
  const parts = COIN_KEYS.filter((coin) => money[coin] > 0).map(
    (coin) => `${money[coin]} ${COIN_SHORT[coin]}`
  );
  return parts.length > 0 ? parts.join(" · ") : "0 mo";
}
