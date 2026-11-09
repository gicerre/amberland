"use client";

import { Backpack, Loader2, Package, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConsoleField, ImmersiveModal } from "@/design-system";
import { EQUIPMENT_CATEGORY_LABELS } from "@/features/characters/constants";
import { cn } from "@/lib/utils";
import { BAG_PLACE, type ItemPlace } from "@/types/items";

import { useItemMutations, useItemsAt } from "../data";
import { QuantityStepper } from "./fields";

/** Preleva un oggetto dalla Borsa Conservante e lo mette nello zaino `to`. */
export function TakeFromBagDialog({
  open,
  onOpenChange,
  to,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: ItemPlace;
}) {
  const { data: bag } = useItemsAt(BAG_PLACE);
  const { transfer } = useItemMutations();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const selected = bag.find((item) => item.id === selectedId) ?? null;
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return bag.filter((item) => !term || item.name.toLowerCase().includes(term));
  }, [bag, search]);

  const close = () => {
    setSearch("");
    setSelectedId(null);
    setQuantity(1);
    onOpenChange(false);
  };

  const submit = () => {
    if (!selected) return;
    transfer.mutate(
      {
        itemId: selected.id,
        quantity: selected.stackable ? Math.min(quantity, selected.quantity) : 1,
        to,
      },
      { onSuccess: close }
    );
  };

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={(value) => (value ? onOpenChange(true) : close())}
      size="md"
      embers={false}
      icon={<Backpack />}
      title="Prendi dalla Borsa"
      description="Scegli cosa prelevare: passa nel tuo zaino e sparisce dalla Borsa."
      footer={
        <>
          <Button variant="outline" onClick={close}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={!selected || transfer.isPending}>
            {transfer.isPending && <Loader2 className="size-4 animate-spin" />}
            Prendi
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca nella Borsa…"
            className="pl-9"
          />
        </div>
        <ScrollArea className="h-60 rounded-lg border border-hairline bg-surface-0">
          <ul className="p-1">
            {visible.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedId(item.id);
                    setQuantity(1);
                  }}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    selectedId === item.id
                      ? "bg-gold-dim text-gold-bright"
                      : "hover:bg-surface-2"
                  )}
                >
                  <Package className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {EQUIPMENT_CATEGORY_LABELS[item.type]}
                    </span>
                  </span>
                  <span className="shrink-0 font-heading text-sm font-bold tabular-nums">
                    ×{item.quantity}
                  </span>
                </button>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-muted-foreground italic">
                {bag.length === 0 ? "La Borsa è vuota." : "Nessun oggetto trovato."}
              </li>
            )}
          </ul>
        </ScrollArea>
        {selected?.stackable && selected.quantity > 1 && (
          <ConsoleField label={`Quanti? (disponibili ${selected.quantity})`}>
            <QuantityStepper
              value={quantity}
              onChange={setQuantity}
              min={1}
              max={selected.quantity}
            />
          </ConsoleField>
        )}
      </div>
    </ImmersiveModal>
  );
}
