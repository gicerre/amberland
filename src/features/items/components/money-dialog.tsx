"use client";

import { Coins, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ConsoleField, ConsoleSegmented, ImmersiveModal } from "@/design-system";
import type { Money } from "@/types/entities";
import type { ItemPlace } from "@/types/items";

import {
  EMPTY_MONEY,
  addMoney,
  moneyIsEmpty,
  useItemMutations,
  usePartyMembers,
  usePurse,
} from "../data";
import { CoinInputs, PlaceSelect, formatMoney } from "./fields";

type Mode = "in" | "split" | "out" | "move";

/** Movimenti di denaro: incassa, dividi il bottino, spendi, trasferisci. */
export function MoneyDialog({
  open,
  onOpenChange,
  defaultPlace,
  defaultMode = "in",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPlace: ItemPlace;
  defaultMode?: Mode;
}) {
  const { adjustMoney, transferMoney, splitMoney } = useItemMutations();
  const { data: members } = usePartyMembers();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [coins, setCoins] = useState<Money>(EMPTY_MONEY);
  const [place, setPlace] = useState<ItemPlace>(defaultPlace);
  const [to, setTo] = useState<ItemPlace>({ location: "BAG" });
  const [reason, setReason] = useState("");
  const [splitIds, setSplitIds] = useState<string[] | null>(null);
  const available = usePurse(place);

  const selectedSplit = splitIds ?? members.map((member) => member.id);
  const pending =
    adjustMoney.isPending || transferMoney.isPending || splitMoney.isPending;

  const reset = () => {
    setMode(defaultMode);
    setCoins(EMPTY_MONEY);
    setPlace(defaultPlace);
    setTo({ location: "BAG" });
    setReason("");
    setSplitIds(null);
  };
  const done = {
    onSuccess: () => {
      reset();
      onOpenChange(false);
    },
  };

  const submit = () => {
    if (moneyIsEmpty(coins)) return;
    if (mode === "in") adjustMoney.mutate({ place, delta: coins, reason }, done);
    if (mode === "out")
      adjustMoney.mutate(
        { place, delta: addMoney(EMPTY_MONEY, coins, -1), reason },
        done
      );
    if (mode === "move") transferMoney.mutate({ from: place, to, coins }, done);
    if (mode === "split")
      splitMoney.mutate({ coins, characterIds: selectedSplit }, done);
  };

  const toggleSplit = (id: string, checked: boolean) =>
    setSplitIds(
      checked
        ? [...selectedSplit, id]
        : selectedSplit.filter((existing) => existing !== id)
    );

  const labels: Record<Mode, string> = {
    in: "Incassa",
    split: "Dividi",
    out: "Spendi",
    move: "Trasferisci",
  };

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
      size="md"
      embers={false}
      icon={<Coins />}
      title="Monete"
      description="Ogni movimento aggiorna subito le borse coinvolte e resta nella cronologia."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={pending || moneyIsEmpty(coins)}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {labels[mode]}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ConsoleSegmented<Mode>
          options={(Object.keys(labels) as Mode[]).map((value) => ({
            value,
            label: labels[value],
          }))}
          value={mode}
          onChange={setMode}
        />

        {mode !== "split" && (
          <ConsoleField
            label={mode === "in" ? "Chi incassa" : "Da quale borsa"}
            hint={mode === "in" ? undefined : `Disponibili: ${formatMoney(available)}`}
          >
            <PlaceSelect value={place} onChange={setPlace} />
          </ConsoleField>
        )}

        {mode === "move" && (
          <ConsoleField label="Verso">
            <PlaceSelect value={to} onChange={setTo} exclude={place} />
          </ConsoleField>
        )}

        {mode === "split" && (
          <ConsoleField
            label="Fra chi dividere"
            hint="Parti uguali per taglio di moneta; il resto va al tesoro del party."
          >
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {members.map((member) => (
                <li key={member.id}>
                  <label className="flex min-h-10 items-center gap-2.5 rounded-lg border border-hairline px-3 text-sm">
                    <Checkbox
                      checked={selectedSplit.includes(member.id)}
                      onCheckedChange={(checked) =>
                        toggleSplit(member.id, checked === true)
                      }
                    />
                    {member.name}
                  </label>
                </li>
              ))}
            </ul>
          </ConsoleField>
        )}

        <ConsoleField label="Importo">
          <CoinInputs value={coins} onChange={setCoins} />
        </ConsoleField>

        {(mode === "in" || mode === "out") && (
          <ConsoleField label="Causale (opzionale)">
            <Input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder={mode === "in" ? "Ricompensa della gilda…" : "Locanda, frecce…"}
            />
          </ConsoleField>
        )}
      </div>
    </ImmersiveModal>
  );
}
