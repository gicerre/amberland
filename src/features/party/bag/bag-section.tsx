"use client";

import {
  Backpack,
  Check,
  History,
  Loader2,
  Minus,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { useCelebration } from "@/components/shared/celebration";
import { EmptyState } from "@/components/shared/empty-state";
import { FantasyImage } from "@/components/shared/fantasy-image";
import { ImageUpload } from "@/components/shared/image-upload";
import { PageHeader } from "@/components/shared/page-header";
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
import { useEntitiesByType } from "@/features/entities/data";
import {
  ITEM_CATEGORY_BADGES,
  ITEM_CATEGORY_OPTIONS,
} from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import {
  useBagItems,
  useBagLog,
  useBagMutations,
  useStorableItems,
  type BagItem,
  type BagLogEntry,
} from "./data";

const ALL = "__all__";

const LOG_ACTION_LABELS: Record<string, string> = {
  ADD: "Inserito",
  UPDATE: "Aggiornato",
  REMOVE: "Rimosso",
  APPROVE: "Approvato",
};

function categoryLabel(value: string): string {
  return ITEM_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/** Borsa Conservante: inventario condiviso del party. */
export function BagSection() {
  const { user, isMaster, canContribute } = useAuth();
  const { data: entries, isLoading } = useBagItems();
  const { data: items } = useEntitiesByType("item");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(ALL);
  const [pendingOnly, setPendingOnly] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [editing, setEditing] = useState<BagItem | null>(null);

  // Stato di approvazione per oggetto (dal catalogo).
  const approvalById = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of items ?? []) {
      map.set(item.id, String(item.fields.approvalStatus ?? "APPROVED"));
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (entries ?? []).filter((entry) => {
      if (category !== ALL && entry.itemCategory !== category) return false;
      if (
        pendingOnly &&
        approvalById.get(entry.itemId) !== "PENDING_APPROVAL"
      )
        return false;
      if (
        term &&
        !entry.itemName.toLowerCase().includes(term) &&
        !entry.notes.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [entries, search, category, pendingOnly, approvalById]);

  return (
    <div>
      <PageHeader
        title="Borsa Conservante"
        subtitle="Il deposito condiviso del gruppo: tesori, scorte e cianfrusaglie."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setHistoryOpen(true)}>
              <History className="size-4" />
              Cronologia
            </Button>
            {canContribute && (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Aggiungi
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca nella Borsa…"
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
        <Button
          variant={pendingOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setPendingOnly((value) => !value)}
        >
          In approvazione
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[3/4] rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Backpack}
          title="La Borsa è vuota"
          description="Aggiungi oggetti per condividerli con il party."
          action={
            canContribute ? (
              <Button onClick={() => setAddOpen(true)}>
                <Plus className="size-4" />
                Aggiungi oggetto
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((entry) => (
            <BagCard
              key={entry.id}
              entry={entry}
              pending={approvalById.get(entry.itemId) === "PENDING_APPROVAL"}
              canManage={isMaster || entry.insertedBy === user?.uid}
              isMaster={isMaster}
              onEdit={() => setEditing(entry)}
            />
          ))}
        </div>
      )}

      <AddToBagDialog open={addOpen} onOpenChange={setAddOpen} />
      <HistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
      {editing && (
        <EditEntryDialog
          entry={editing}
          open={Boolean(editing)}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </div>
  );
}

function BagCard({
  entry,
  pending,
  canManage,
  isMaster,
  onEdit,
}: {
  entry: BagItem;
  pending: boolean;
  canManage: boolean;
  isMaster: boolean;
  onEdit: () => void;
}) {
  const { removeEntry, approveItem } = useBagMutations();
  const { trigger: triggerCelebration } = useCelebration();

  const catBadge = entry.itemCategory ? (ITEM_CATEGORY_BADGES[entry.itemCategory] ?? "border-gold/20") : "";
  const catLabel = entry.itemCategory ? categoryLabel(entry.itemCategory) : null;

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-xl border bg-gradient-to-b from-stone-surface to-stone-mid/80",
      "shadow-[0_8px_32px_-12px_rgba(0,0,0,0.7)]",
      pending ? "border-amber-500/40" : "border-gold/18"
    )}>
      {/* Striscia superiore */}
      <span className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

      {/* Immagine quadrata con badge sovrapposti */}
      <div className="relative aspect-square overflow-hidden">
        <FantasyImage
          src={entry.itemImage}
          alt={entry.itemName}
          fallbackIcon={Package}
          className="size-full"
          sizes="(max-width: 640px) 50vw, 33vw"
          position="center"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-stone-mid via-stone-mid/15 to-transparent" />

        {/* Badge categoria — top-right */}
        {catLabel && (
          <span className={cn(
            "absolute right-2 top-2 z-10 rounded border px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase",
            catBadge
          )}>
            {catLabel}
          </span>
        )}

        {/* Badge in attesa — top-left */}
        {pending && (
          <span className="absolute left-2 top-2 z-10 rounded border border-amber-500/50 bg-amber-500/10 px-1.5 py-0.5 font-heading text-[9px] font-bold text-amber-300 uppercase">
            Approvazione
          </span>
        )}

        {/* Quantità — angolo in basso a destra */}
        <span className="absolute bottom-2 right-2 z-10 flex size-7 items-center justify-center rounded-full border border-gold/50 bg-stone-mid/90 font-heading text-[11px] font-bold text-gold-bright">
          ×{entry.quantity}
        </span>

        {/* Nome in overlay sul fondo */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-3 pb-10">
          <h3 className="font-heading text-[14px] font-semibold leading-tight text-foreground transition-colors group-hover:text-gold-bright line-clamp-2">
            {entry.itemName}
          </h3>
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 pb-2 pt-2">
        {entry.notes && (
          <p className="mb-1.5 text-[11px] italic text-muted-foreground line-clamp-1">
            {entry.notes}
          </p>
        )}
        <div className="flex items-center justify-between gap-1">
          <p className="text-[10px] text-muted-foreground/70 truncate">
            da {entry.insertedByName || "—"}
          </p>
          {(canManage || (isMaster && pending)) && (
            <div className="flex shrink-0 items-center gap-0.5">
              {isMaster && pending && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[11px] text-emerald-300 hover:text-emerald-200"
                  onClick={() =>
                    approveItem.mutate(entry, {
                      onSuccess: () =>
                        triggerCelebration({
                          type: "item-acquired",
                          itemName: entry.itemName,
                          rarity: entry.itemCategory,
                        }),
                    })
                  }
                  disabled={approveItem.isPending}
                >
                  <Check className="size-3" />
                  Approva
                </Button>
              )}
              {canManage && (
                <>
                  <Button size="sm" variant="ghost" className="size-7 p-0" onClick={onEdit}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => removeEntry.mutate(entry)}
                    disabled={removeEntry.isPending}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddToBagDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addExisting, createAndAdd } = useBagMutations();
  const { data: storable } = useStorableItems(open);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Entity | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  // Nuovo oggetto
  const [name, setName] = useState("");
  const [category, setCategory] = useState("COMMON");
  const [imageUrl, setImageUrl] = useState("");

  const reset = () => {
    setMode("existing");
    setSearch("");
    setSelected(null);
    setQuantity(1);
    setNotes("");
    setName("");
    setCategory("COMMON");
    setImageUrl("");
  };

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (storable ?? [])
      .filter((item) => !term || item.name.toLowerCase().includes(term))
      .slice(0, 40);
  }, [storable, search]);

  const pending = addExisting.isPending || createAndAdd.isPending;
  const canSubmit =
    quantity > 0 &&
    (mode === "existing" ? Boolean(selected) : name.trim().length >= 2);

  const submit = () => {
    if (!canSubmit || pending) return;
    const done = {
      onSuccess: () => {
        reset();
        onOpenChange(false);
      },
    };
    if (mode === "existing" && selected) {
      addExisting.mutate({ item: selected, quantity, notes }, done);
    } else if (mode === "new") {
      createAndAdd.mutate(
        { name, category, imageUrl, quantity, notes },
        done
      );
    }
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
            Aggiungi alla Borsa
          </DialogTitle>
          <DialogDescription>
            Scegli un oggetto del catalogo o creane uno nuovo.
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex w-full rounded-lg border border-gold/20 bg-night/30 p-1">
          {(
            [
              ["existing", "Esistente"],
              ["new", "Nuovo"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
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

        <div className="space-y-4">
          {mode === "existing" ? (
            <>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cerca un oggetto conservabile…"
              />
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
                      Nessun oggetto conservabile trovato.
                    </li>
                  )}
                </ul>
              </ScrollArea>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Pozione di cura…"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ITEM_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Immagine (opzionale)</Label>
                <ImageUpload value={imageUrl} onChange={setImageUrl} folder="item" />
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <div className="space-y-2">
            <Label>Note (opzionale)</Label>
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={!canSubmit || pending}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            Aggiungi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditEntryDialog({
  entry,
  open,
  onOpenChange,
}: {
  entry: BagItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { updateEntry } = useBagMutations();
  const [quantity, setQuantity] = useState(entry.quantity);
  const [notes, setNotes] = useState(entry.notes);

  const submit = () =>
    updateEntry.mutate(
      { entry, quantity, notes },
      { onSuccess: () => onOpenChange(false) }
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">{entry.itemName}</DialogTitle>
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

function HistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: log } = useBagLog();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <History className="size-5 text-gold" />
            Cronologia della Borsa
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <ul className="space-y-2 pr-3">
            {(log ?? []).map((entry: BagLogEntry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-gold/15 bg-card/60 px-3 py-2 text-sm"
              >
                <span className="min-w-0 flex-1 truncate">
                  <strong className="text-gold-bright">
                    {LOG_ACTION_LABELS[entry.action] ?? entry.action}
                  </strong>{" "}
                  {entry.itemName} ×{entry.quantity}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {entry.byName} · {formatWhen(entry)}
                </span>
              </li>
            ))}
            {(log ?? []).length === 0 && (
              <li className="py-6 text-center text-sm text-muted-foreground italic">
                Nessun movimento registrato.
              </li>
            )}
          </ul>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function formatWhen(entry: BagLogEntry): string {
  const ms = entry.createdAt?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
