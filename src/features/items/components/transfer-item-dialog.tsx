"use client";

import { ArrowRightLeft, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConsoleField, ImmersiveModal } from "@/design-system";
import type { ItemPlace } from "@/types/items";

import { samePlace, useItemMutations, usePartyMembers } from "../data";
import { PlaceSelect, QuantityStepper } from "./fields";

export interface TransferableItem {
  id: string;
  name: string;
  quantity: number;
  stackable: boolean;
  from: ItemPlace;
}

/**
 * Sposta un oggetto verso la Borsa o lo zaino di un altro PG.
 * Le pile si dividono (quantità scelta), gli oggetti unici si spostano interi.
 */
export function TransferItemDialog({
  open,
  onOpenChange,
  item,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: TransferableItem;
}) {
  const { transfer } = useItemMutations();
  const { data: members } = usePartyMembers();

  // Dallo zaino la destinazione naturale è la Borsa; dalla Borsa, un PG.
  const defaultTo = (): ItemPlace =>
    item.from.location === "BAG" && members[0]
      ? { location: "PC", characterId: members[0].id }
      : { location: "BAG" };

  const [chosen, setTo] = useState<ItemPlace>(defaultTo);
  const [quantity, setQuantity] = useState(item.quantity);
  // I membri arrivano in modo asincrono: mai proporre l'origine come meta.
  const to = samePlace(chosen, item.from) ? defaultTo() : chosen;

  const submit = () =>
    transfer.mutate(
      { itemId: item.id, quantity: Math.min(quantity, item.quantity), to },
      { onSuccess: () => onOpenChange(false) }
    );

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      embers={false}
      icon={<ArrowRightLeft />}
      title={`Sposta ${item.name}`}
      description={
        item.stackable
          ? `Ce ne sono ${item.quantity}: scegli quanti e dove.`
          : "Oggetto unico: si sposta intero, con le sue proprietà."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={submit}
            disabled={transfer.isPending || samePlace(to, item.from)}
          >
            {transfer.isPending && <Loader2 className="size-4 animate-spin" />}
            Sposta
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <ConsoleField label="Destinazione">
          <PlaceSelect
            value={to}
            onChange={setTo}
            exclude={item.from}
          />
        </ConsoleField>
        {item.stackable && item.quantity > 1 && (
          <ConsoleField label="Quantità">
            <QuantityStepper
              value={Math.min(quantity, item.quantity)}
              onChange={setQuantity}
              min={1}
              max={item.quantity}
            />
          </ConsoleField>
        )}
      </div>
    </ImmersiveModal>
  );
}
