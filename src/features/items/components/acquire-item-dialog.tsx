"use client";

import { Loader2, Package, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConsoleField, ConsoleSegmented, ImmersiveModal } from "@/design-system";
import { EQUIPMENT_CATEGORY_LABELS } from "@/features/characters/constants";
import { useEntitiesByType } from "@/features/entities/data";
import { cn } from "@/lib/utils";
import type { Entity, EquipmentCategory } from "@/types/entities";
import { ITEM_RARITIES, type ItemPlace, type ItemRarity } from "@/types/items";

import { useItemMutations } from "../data";
import { PlaceSelect, QuantityStepper } from "./fields";

const CATEGORIES = Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[];

function rarityOf(entity: Entity): ItemRarity | null {
  const value = String(entity.fields.category ?? "");
  return (ITEM_RARITIES as readonly string[]).includes(value)
    ? (value as ItemRarity)
    : null;
}

function guessType(rarity: ItemRarity | null): EquipmentCategory {
  return rarity === "MAGIC" || rarity === "LEGENDARY" || rarity === "ARTIFACT"
    ? "magic"
    : "misc";
}

/**
 * Registra un oggetto nuovo nel patrimonio del party.
 * Senza destinatario va nella Borsa; con un PG, direttamente nel suo zaino.
 */
export function AcquireItemDialog({
  open,
  onOpenChange,
  defaultTo,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTo: ItemPlace;
}) {
  const { acquire } = useItemMutations();
  const { data: catalog } = useEntitiesByType("item", open);
  const [mode, setMode] = useState<"free" | "catalog">("free");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<Entity | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<EquipmentCategory>("misc");
  const [stackable, setStackable] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [to, setTo] = useState<ItemPlace>(defaultTo);

  const reset = () => {
    setMode("free");
    setSearch("");
    setPicked(null);
    setName("");
    setType("misc");
    setStackable(false);
    setQuantity(1);
    setNotes("");
    setTo(defaultTo);
  };

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (catalog ?? [])
      .filter((item) => item.fields.approvalStatus !== "PENDING_APPROVAL")
      .filter((item) => !term || item.name.toLowerCase().includes(term))
      .slice(0, 50);
  }, [catalog, search]);

  const pick = (entity: Entity) => {
    setPicked(entity);
    setType(guessType(rarityOf(entity)));
  };

  const finalName = mode === "catalog" ? (picked?.name ?? "") : name.trim();
  const canSubmit = finalName.length >= 2 && quantity >= 1;

  const submit = () => {
    if (!canSubmit) return;
    acquire.mutate(
      {
        draft: {
          catalogId: mode === "catalog" ? (picked?.id ?? null) : null,
          name: finalName,
          type,
          rarity: mode === "catalog" && picked ? rarityOf(picked) : null,
          imageUrl: mode === "catalog" ? (picked?.imageUrl ?? "") : "",
          stackable,
          notes: notes.trim(),
          charges: null,
        },
        quantity,
        to,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
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
      icon={<Plus />}
      title="Nuovo oggetto"
      description="Un bottino, un acquisto, un ritrovamento. Senza destinatario finisce nella Borsa."
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={!canSubmit || acquire.isPending}>
            {acquire.isPending && <Loader2 className="size-4 animate-spin" />}
            Aggiungi
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ConsoleSegmented<"free" | "catalog">
          options={[
            { value: "free", label: "Oggetto libero" },
            { value: "catalog", label: "Dal catalogo" },
          ]}
          value={mode}
          onChange={setMode}
        />

        {mode === "free" ? (
          <ConsoleField label="Nome">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Corda di canapa (15 m), Pozione di guarigione…"
            />
          </ConsoleField>
        ) : (
          <>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cerca nel catalogo…"
            />
            <ScrollArea className="h-40 rounded-lg border border-hairline bg-surface-0">
              <ul className="p-1">
                {candidates.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => pick(item)}
                      className={cn(
                        "flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                        picked?.id === item.id
                          ? "bg-gold-dim text-gold-bright"
                          : "hover:bg-surface-2"
                      )}
                    >
                      <Package className="size-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate">{item.name}</span>
                    </button>
                  </li>
                ))}
                {candidates.length === 0 && (
                  <li className="px-3 py-5 text-center text-sm text-muted-foreground italic">
                    Nessun oggetto nel catalogo.
                  </li>
                )}
              </ul>
            </ScrollArea>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <ConsoleField label="Tipo">
            <Select
              value={type}
              onValueChange={(value) => {
                const next = value as EquipmentCategory;
                setType(next);
                if (next === "consumable") setStackable(true);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {EQUIPMENT_CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConsoleField>
          <ConsoleField label="Destinazione">
            <PlaceSelect value={to} onChange={setTo} />
          </ConsoleField>
        </div>

        <div className="grid items-end gap-4 sm:grid-cols-2">
          <ConsoleField label="Quantità">
            <QuantityStepper value={quantity} onChange={setQuantity} />
          </ConsoleField>
          <label className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-hairline px-3 py-2 text-sm">
            <span>
              Impilabile
              <span className="block text-xs text-muted-foreground">
                Si unisce agli oggetti uguali
              </span>
            </span>
            <Switch checked={stackable} onCheckedChange={setStackable} />
          </label>
        </div>
        {!stackable && quantity > 1 && (
          <p className="text-xs text-muted-foreground">
            Verranno creati {quantity} oggetti distinti, ognuno con la propria identità.
          </p>
        )}

        <ConsoleField label="Note (opzionale)">
          <Textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={2}
            placeholder="Proprietà, incisioni, cariche…"
          />
        </ConsoleField>
      </div>
    </ImmersiveModal>
  );
}
