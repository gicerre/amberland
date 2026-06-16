"use client";

import {
  ArrowLeftRight,
  Backpack,
  BookText,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Shield,
  ShieldCheck,
  Star,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { FantasyImage } from "@/components/shared/fantasy-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/auth-provider";
import {
  ITEM_CATEGORY_BADGES,
  ITEM_CATEGORY_OPTIONS,
} from "@/features/entities/registry";
import { NoteEditorDialog } from "@/features/party/diary/note-dialogs";
import { useBagItems } from "@/features/party/bag/data";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";
import type { InventoryItem } from "@/types/personal";

import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from "../favorites/data";
import {
  useAvailableForInventory,
  useInventory,
  useInventoryMutations,
} from "./data";

const ALL = "__all__";

function categoryLabel(value: string): string {
  return ITEM_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

type SortKey = "name" | "category" | "quantity";

/** Inventario personale: lo zaino dell'avventuriero. */
export function InventorySection() {
  const { canContribute } = useAuth();
  const { data: items, isLoading } = useInventory();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("category");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = (items ?? []).filter((item) => {
      if (category !== ALL && item.itemCategory !== category) return false;
      if (
        term &&
        !item.itemName.toLowerCase().includes(term) &&
        !item.notes.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "quantity") return b.quantity - a.quantity;
      if (sort === "name") return a.itemName.localeCompare(b.itemName, "it");
      const cat = a.itemCategory.localeCompare(b.itemCategory, "it");
      return cat !== 0 ? cat : a.itemName.localeCompare(b.itemName, "it");
    });
  }, [items, search, category, sort]);

  // Raggruppamento per categoria (quando l'ordinamento è per categoria).
  const groups = useMemo(() => {
    if (sort !== "category") return null;
    const map = new Map<string, InventoryItem[]>();
    for (const item of filtered) {
      const key = item.itemCategory || "—";
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [filtered, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca nello zaino…"
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutte le categorie</SelectItem>
            {ITEM_CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Ordina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Per categoria</SelectItem>
            <SelectItem value="name">Per nome</SelectItem>
            <SelectItem value="quantity">Per quantità</SelectItem>
          </SelectContent>
        </Select>
        {canContribute && (
          <Button className="ml-auto" onClick={() => setAddOpen(true)}>
            <Plus className="size-4" />
            Aggiungi
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="aspect-square rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Backpack}
          title="Zaino vuoto"
          description="Aggiungi l'equipaggiamento che il tuo eroe porta con sé."
          action={
            canContribute ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Aggiungi oggetto
              </Button>
            ) : undefined
          }
        />
      ) : groups ? (
        <div className="space-y-6">
          {groups.map(([cat, list]) => (
            <section key={cat}>
              <h3 className="mb-3 flex items-center gap-2 font-heading text-sm font-semibold tracking-[0.15em] text-gold/70 uppercase">
                {categoryLabel(cat)}
                <span className="text-muted-foreground">({list.length})</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {list.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onEdit={() => setEditing(item)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={() => setEditing(item)}
            />
          ))}
        </div>
      )}

      <AddToInventoryDialog open={addOpen} onOpenChange={setAddOpen} />
      {editing && (
        <EditInventoryDialog
          item={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  );
}

function InventoryCard({
  item,
  onEdit,
}: {
  item: InventoryItem;
  onEdit: () => void;
}) {
  const { toggleEquip, removeEntry, moveToBag } = useInventoryMutations();
  const { data: favorites } = useFavorites();
  const toggleFav = useToggleFavorite();
  const [linkOpen, setLinkOpen] = useState(false);
  const fav = isFavorite(favorites, "item", item.itemId);

  // Entità minima per il collegamento al diario.
  const itemEntity = {
    id: item.itemId,
    type: "item",
    name: item.itemName,
  } as Entity;

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-colors",
        item.equipped ? "border-gold/50" : "border-gold/20"
      )}
    >
      {item.equipped && (
        <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full border border-gold/40 bg-gold/15 px-2 py-0.5 text-[10px] font-medium text-gold-bright">
          <ShieldCheck className="size-3" />
          Equipaggiato
        </span>
      )}
      <button
        type="button"
        aria-label={fav ? "Rimuovi dai preferiti" : "Aggiungi ai preferiti"}
        onClick={() =>
          toggleFav.mutate({ kind: "item", id: item.itemId, label: item.itemName })
        }
        className="absolute top-2 right-2 z-10 rounded-full p-1 text-gold/70 transition-colors hover:bg-gold/15 hover:text-gold"
      >
        <Star className={cn("size-4", fav && "fill-gold text-gold")} />
      </button>

      <div className="flex gap-3 p-3">
        <div className="size-20 shrink-0 overflow-hidden rounded-lg border border-gold/15">
          <FantasyImage
            src={item.itemImage}
            alt={item.itemName}
            fallbackIcon={Package}
            className="size-20"
            sizes="80px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2 pr-6">
            <h3 className="font-heading font-semibold text-foreground">
              {item.itemName}
            </h3>
            <Badge
              variant="outline"
              className="shrink-0 border-gold/40 text-gold-bright"
            >
              ×{item.quantity}
            </Badge>
          </div>
          {item.itemCategory && (
            <Badge
              variant="outline"
              className={cn(
                "mt-1 text-[10px]",
                ITEM_CATEGORY_BADGES[item.itemCategory] ?? "border-gold/20"
              )}
            >
              {categoryLabel(item.itemCategory)}
            </Badge>
          )}
          {item.notes && (
            <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
              {item.notes}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-0.5 border-t border-gold/10 px-1.5 py-1">
        <Button
          size="sm"
          variant="ghost"
          className={item.equipped ? "text-gold" : "text-muted-foreground"}
          onClick={() => toggleEquip.mutate(item)}
          disabled={toggleEquip.isPending}
          title={item.equipped ? "Riponi" : "Equipaggia"}
        >
          <Shield className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setLinkOpen(true)}
          title="Collega al diario"
        >
          <BookText className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => moveToBag.mutate(item)}
          disabled={moveToBag.isPending}
          title="Sposta nella Borsa Conservante"
        >
          <ArrowLeftRight className="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={onEdit} title="Dettagli">
          <Pencil className="size-3.5" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={() => removeEntry.mutate(item)}
          disabled={removeEntry.isPending}
          title="Rimuovi"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      {linkOpen && (
        <NoteEditorDialog
          open={linkOpen}
          onOpenChange={setLinkOpen}
          linkTo={itemEntity}
        />
      )}
    </div>
  );
}

function AddToInventoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: available } = useAvailableForInventory();
  const { data: bag } = useBagItems();
  const { addExisting, moveFromBag } = useInventoryMutations();
  const [mode, setMode] = useState<"catalog" | "bag">("catalog");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Entity | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const reset = () => {
    setMode("catalog");
    setSearch("");
    setSelected(null);
    setQuantity(1);
    setNotes("");
  };

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (available ?? [])
      .filter((item) => !term || item.name.toLowerCase().includes(term))
      .slice(0, 40);
  }, [available, search]);

  const bagCandidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (bag ?? []).filter(
      (item) => !term || item.itemName.toLowerCase().includes(term)
    );
  }, [bag, search]);

  const submit = () => {
    if (mode !== "catalog" || !selected || addExisting.isPending) return;
    addExisting.mutate(
      { item: selected, quantity, notes },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Backpack className="size-5 text-gold" />
            Aggiungi allo zaino
          </DialogTitle>
          <DialogDescription>
            Oggetti conservabili dal catalogo o presi dalla Borsa Conservante.
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex w-full rounded-lg border border-gold/20 bg-night/30 p-1">
          {(
            [
              ["catalog", "Dal catalogo"],
              ["bag", "Dalla Borsa"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setSelected(null);
              }}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === value
                  ? "bg-gold/20 text-gold-bright"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca un oggetto…"
        />

        {mode === "catalog" ? (
          <>
            <ScrollArea className="h-40 rounded-lg border border-gold/15">
              <ul className="p-1">
                {candidates.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                        selected?.id === item.id
                          ? "bg-gold/15 text-gold-bright"
                          : "hover:bg-accent"
                      )}
                    >
                      <Package className="size-4 shrink-0 text-gold/70" />
                      <span className="flex-1 truncate">{item.name}</span>
                    </button>
                  </li>
                ))}
                {candidates.length === 0 && (
                  <li className="px-2.5 py-4 text-center text-sm text-muted-foreground italic">
                    Nessun oggetto conservabile disponibile.
                  </li>
                )}
              </ul>
            </ScrollArea>

            <div className="space-y-2">
              <Label>Quantità</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                >
                  <Minus />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Number(event.target.value) || 1))
                  }
                  className="text-center"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note (opzionale)</Label>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button
                onClick={submit}
                disabled={!selected || addExisting.isPending}
              >
                {addExisting.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Aggiungi
              </Button>
            </DialogFooter>
          </>
        ) : (
          <ScrollArea className="h-56 rounded-lg border border-gold/15">
            <ul className="p-1">
              {bagCandidates.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm"
                >
                  <Package className="size-4 shrink-0 text-gold/70" />
                  <span className="flex-1 truncate">
                    {item.itemName}{" "}
                    <span className="text-muted-foreground">×{item.quantity}</span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      moveFromBag.mutate(item, {
                        onSuccess: () => onOpenChange(false),
                      })
                    }
                    disabled={moveFromBag.isPending}
                  >
                    Prendi
                  </Button>
                </li>
              ))}
              {bagCandidates.length === 0 && (
                <li className="px-2.5 py-4 text-center text-sm text-muted-foreground italic">
                  La Borsa Conservante è vuota.
                </li>
              )}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditInventoryDialog({
  item,
  open,
  onOpenChange,
}: {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateEntry } = useInventoryMutations();
  const [quantity, setQuantity] = useState(item.quantity);
  const [notes, setNotes] = useState(item.notes);

  const submit = () =>
    updateEntry.mutate(
      { entry: item, quantity, notes },
      { onSuccess: () => onOpenChange(false) }
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{item.itemName}</DialogTitle>
          <DialogDescription>Aggiorna quantità e note.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Quantità</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(1, Number(event.target.value) || 1))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={updateEntry.isPending}>
            {updateEntry.isPending && <Loader2 className="size-4 animate-spin" />}
            Salva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
