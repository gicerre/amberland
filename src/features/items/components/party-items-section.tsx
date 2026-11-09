"use client";

import {
  ArrowRightLeft,
  Backpack,
  Coins,
  FlaskConical,
  History,
  Package,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsoleSegmented, ImmersiveModal } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { normalizeName } from "@/features/characters/codex/derive";
import { EQUIPMENT_CATEGORY_LABELS } from "@/features/characters/constants";
import { cn } from "@/lib/utils";
import { BAG_PLACE, type ItemLogEntry, type PartyItem } from "@/types/items";

import {
  EMPTY_MONEY,
  addMoney,
  moneyInGold,
  placeOf,
  useItemLog,
  useItemMutations,
  usePartyItems,
  usePlaceLabel,
  usePurse,
  usePurses,
} from "../data";
import { AcquireItemDialog } from "./acquire-item-dialog";
import { formatMoney } from "./fields";
import { MoneyDialog } from "./money-dialog";
import { TransferItemDialog } from "./transfer-item-dialog";

type View = "bag" | "all";

/* ============================================================
 * Oggetti del party — Borsa Conservante + vista globale.
 *
 * "Borsa": ciò che il party conserva in comune.
 * "Tutto il party": il patrimonio complessivo, raggruppato per
 * oggetto, con la distribuzione (Borsa 3 · Syl 2). Non è un
 * inventario in più: è la somma degli inventari esistenti.
 * ============================================================ */

export function PartyItemsSection() {
  const { canContribute } = useAuth();
  const { data: items, isLoading } = usePartyItems();
  const [view, setView] = useState<View>("bag");
  const [search, setSearch] = useState("");
  const [acquireOpen, setAcquireOpen] = useState(false);
  const [moneyOpen, setMoneyOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

  const term = normalizeName(search);
  const filtered = useMemo(
    () =>
      (items ?? []).filter(
        (item) =>
          (view === "all" || item.location === "BAG") &&
          (!term || normalizeName(item.name).includes(term))
      ),
    [items, view, term]
  );

  return (
    <div>
      <PageHeader
        title="Oggetti del party"
        subtitle="La Borsa Conservante e tutto ciò che la compagnia porta con sé."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setLogOpen(true)}>
              <History className="size-4" />
              <span className="hidden sm:inline">Cronologia</span>
            </Button>
            {canContribute && (
              <>
                <Button variant="outline" onClick={() => setMoneyOpen(true)}>
                  <Coins className="size-4" />
                  Monete
                </Button>
                <Button onClick={() => setAcquireOpen(true)}>
                  <Plus className="size-4" />
                  Oggetto
                </Button>
              </>
            )}
          </div>
        }
      />

      <TreasuryStrip onOpen={canContribute ? () => setMoneyOpen(true) : undefined} />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ConsoleSegmented<View>
          options={[
            { value: "bag", label: "Borsa Conservante" },
            { value: "all", label: "Tutto il party" },
          ]}
          value={view}
          onChange={setView}
        />
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca un oggetto…"
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Backpack}
          title={view === "bag" ? "La Borsa è vuota" : "Il party non possiede oggetti"}
          description="Registra un bottino: senza destinatario finisce nella Borsa."
          action={
            canContribute ? (
              <Button onClick={() => setAcquireOpen(true)}>
                <Plus className="size-4" />
                Nuovo oggetto
              </Button>
            ) : undefined
          }
        />
      ) : view === "bag" ? (
        <ul className="space-y-2">
          {filtered.map((item) => (
            <li key={item.id}>
              <ItemRow item={item} canEdit={canContribute} />
            </li>
          ))}
        </ul>
      ) : (
        <GlobalView items={filtered} canEdit={canContribute} />
      )}

      <AcquireItemDialog
        open={acquireOpen}
        onOpenChange={setAcquireOpen}
        defaultTo={BAG_PLACE}
      />
      <MoneyDialog
        open={moneyOpen}
        onOpenChange={setMoneyOpen}
        defaultPlace={BAG_PLACE}
      />
      <ItemLogDialog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}

/* ── Tesoro del party + patrimonio complessivo ── */

function TreasuryStrip({ onOpen }: { onOpen?: () => void }) {
  const treasury = usePurse(BAG_PLACE);
  const { data: purses } = usePurses();
  const total = useMemo(
    () => (purses ?? []).reduce((sum, purse) => addMoney(sum, purse), EMPTY_MONEY),
    [purses]
  );

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className="mb-5 flex w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-hairline bg-surface-1 px-4 py-3 text-left transition-colors enabled:hover:border-hairline-strong enabled:hover:bg-surface-2"
    >
      <span className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-lg border border-hairline bg-surface-0 text-gold">
          <Coins className="size-5" />
        </span>
        <span>
          <span className="block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
            Tesoro del party
          </span>
          <span className="font-heading text-lg font-bold text-foreground">
            {formatMoney(treasury)}
          </span>
        </span>
      </span>
      <span className="ml-auto text-right">
        <span className="block text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          Patrimonio in monete (tesoro + PG)
        </span>
        <span className="font-heading text-base font-semibold text-gold-bright tabular-nums">
          ≈ {Math.floor(moneyInGold(total)).toLocaleString("it-IT")} mo
        </span>
      </span>
    </button>
  );
}

/* ── Riga oggetto con azioni ── */

function ItemRow({
  item,
  canEdit,
  showPlace = false,
}: {
  item: PartyItem;
  canEdit: boolean;
  showPlace?: boolean;
}) {
  const { consume } = useItemMutations();
  const labelOf = usePlaceLabel();
  const [moveOpen, setMoveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const place = placeOf(item);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-1 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-hairline bg-surface-0 text-muted-foreground">
        {item.type === "consumable" ? (
          <FlaskConical className="size-5" />
        ) : (
          <Package className="size-5" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 font-heading text-sm font-semibold text-foreground">
          <span className="truncate">{item.name}</span>
          {item.quantity > 1 && (
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              ×{item.quantity}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {showPlace ? labelOf(place) : EQUIPMENT_CATEGORY_LABELS[item.type]}
          {item.notes && ` · ${item.notes}`}
        </p>
      </div>
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          {item.type === "consumable" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Usa ${item.name}`}
              onClick={() => consume.mutate({ itemId: item.id, quantity: 1 })}
              disabled={consume.isPending}
            >
              <FlaskConical className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Sposta ${item.name}`}
            onClick={() => setMoveOpen(true)}
          >
            <ArrowRightLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Elimina ${item.name}`}
            className="text-muted-foreground hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      )}
      <TransferItemDialog
        open={moveOpen}
        onOpenChange={setMoveOpen}
        item={{
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          stackable: item.stackable,
          from: place,
        }}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Eliminare ${item.name}?`}
        description="L'oggetto esce dal patrimonio del party (perso, venduto, distrutto). Resta traccia nella cronologia."
        confirmLabel="Elimina"
        loading={consume.isPending}
        onConfirm={() =>
          consume.mutate(
            { itemId: item.id, quantity: item.quantity, action: "REMOVE" },
            { onSuccess: () => setDeleteOpen(false) }
          )
        }
      />
    </div>
  );
}

/* ── Vista globale: un gruppo per oggetto, con la distribuzione ── */

function GlobalView({ items, canEdit }: { items: PartyItem[]; canEdit: boolean }) {
  const labelOf = usePlaceLabel();
  const groups = useMemo(() => {
    const map = new Map<string, PartyItem[]>();
    for (const item of items) {
      const key = item.catalogId ?? `free:${normalizeName(item.name)}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()]
      .map(([key, members]) => ({
        key,
        name: members[0].name,
        total: members.reduce((sum, item) => sum + item.quantity, 0),
        members,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "it"));
  }, [items]);

  return (
    <ul className="space-y-3">
      {groups.map((group) => (
        <li
          key={group.key}
          className="rounded-xl border border-hairline bg-surface-0/60 p-3"
        >
          <div className="mb-1 flex items-baseline justify-between gap-3 px-1">
            <h3 className="truncate font-heading text-sm font-semibold text-foreground">
              {group.name}
            </h3>
            <span className="shrink-0 text-xs text-muted-foreground">
              Totale{" "}
              <strong className="font-heading text-sm text-gold-bright tabular-nums">
                {group.total}
              </strong>
            </span>
          </div>
          <p className="mb-2 px-1 text-xs text-muted-foreground">
            {group.members
              .map((item) => `${labelOf(placeOf(item))} ${item.quantity}`)
              .join(" · ")}
          </p>
          <ul className="space-y-1.5">
            {group.members.map((item) => (
              <li key={item.id}>
                <ItemRow item={item} canEdit={canEdit} showPlace />
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

/* ── Cronologia ── */

const LOG_LABELS: Record<ItemLogEntry["action"], string> = {
  ACQUIRE: "Acquisito",
  TRANSFER: "Spostato",
  CONSUME: "Usato",
  REMOVE: "Eliminato",
  UPDATE: "Modificato",
  MONEY_IN: "Incassato",
  MONEY_OUT: "Speso",
  MONEY_TRANSFER: "Monete spostate",
};

function describe(entry: ItemLogEntry): string {
  const what = entry.coins
    ? formatMoney(entry.coins)
    : `${entry.itemName}${entry.quantity > 1 ? ` ×${entry.quantity}` : ""}`;
  const route =
    entry.fromLabel && entry.toLabel
      ? `${entry.fromLabel} → ${entry.toLabel}`
      : entry.toLabel || entry.fromLabel;
  return [what, route, entry.reason].filter(Boolean).join(" · ");
}

function ItemLogDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: log, isLoading } = useItemLog(open);
  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      embers={false}
      icon={<History />}
      title="Cronologia"
      description="Ogni movimento di oggetti e monete: chi, cosa, da dove a dove."
    >
      <ScrollArea className="max-h-[70vh]">
        <ul className="space-y-2 pr-3">
          {isLoading && <Skeleton className="h-10 rounded-lg" />}
          {(log ?? []).map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-0.5 rounded-lg border border-hairline bg-surface-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <span className="min-w-0">
                <strong
                  className={cn(
                    "mr-1.5",
                    entry.action === "REMOVE" ? "text-destructive" : "text-gold-bright"
                  )}
                >
                  {LOG_LABELS[entry.action] ?? entry.action}
                </strong>
                {describe(entry)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {entry.byName} · {formatWhen(entry)}
              </span>
            </li>
          ))}
          {!isLoading && (log ?? []).length === 0 && (
            <li className="py-6 text-center text-sm text-muted-foreground italic">
              Nessun movimento registrato.
            </li>
          )}
        </ul>
      </ScrollArea>
    </ImmersiveModal>
  );
}

function formatWhen(entry: ItemLogEntry): string {
  const ms = entry.createdAt?.toMillis?.();
  if (!ms) return "adesso";
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
