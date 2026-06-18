"use client";

import {
  Check,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { ImageUpload } from "@/components/shared/image-upload";
import {
  RichTextEditor,
  RichTextRenderer,
} from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  richTextToPlainText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useAuth } from "@/features/auth/auth-provider";
import { useAllEntities } from "@/features/entities/data";
import { ENTITY_REGISTRY } from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import { GOAL_PRIORITIES, GOAL_STATUSES } from "@/types/personal";
import type { Goal, GoalLink, GoalPriority, GoalStatus } from "@/types/personal";

import {
  GOAL_PRIORITY_BADGES,
  GOAL_PRIORITY_LABELS,
  GOAL_STATUS_BADGES,
  GOAL_STATUS_LABELS,
} from "../constants";
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from "../favorites/data";
import { useGoalMutations, useGoals, type GoalDraft } from "./data";

const ALL = "__all__";

/** Bacheca degli obiettivi personali. */
export function GoalsSection() {
  const { canContribute } = useAuth();
  const { data: goals, isLoading } = useGoals();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>(ALL);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (goals ?? []).filter((goal) => {
      if (status !== ALL && goal.status !== status) return false;
      if (
        term &&
        !goal.title.toLowerCase().includes(term) &&
        !richTextToPlainText(goal.description as RichTextValue)
          .toLowerCase()
          .includes(term) &&
        !goal.tags.some((t) => t.toLowerCase().includes(term))
      )
        return false;
      return true;
    });
  }, [goals, search, status]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca tra gli obiettivi…"
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Stato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Tutti gli stati</SelectItem>
            {GOAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {GOAL_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {canContribute && (
          <Button className="ml-auto" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Nuovo obiettivo
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nessun obiettivo"
          description="Ogni eroe ha bisogno di una meta. Affiggi la prima alla bacheca."
          action={
            canContribute ? (
              <Button onClick={() => setCreating(true)}>
                <Plus className="size-4" />
                Nuovo obiettivo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onEdit={() => setEditing(goal)} />
          ))}
        </div>
      )}

      {creating && (
        <GoalEditorDialog open onOpenChange={(o) => !o && setCreating(false)} />
      )}
      {editing && (
        <GoalEditorDialog
          goal={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function GoalCard({ goal, onEdit }: { goal: Goal; onEdit: () => void }) {
  const { setStatus, remove } = useGoalMutations();
  const { data: favorites } = useFavorites();
  const toggleFav = useToggleFavorite();
  const fav = isFavorite(favorites, "goal", goal.id);
  const done = goal.status === "DONE";

  return (
    <article
      className={cn(
        "parchment relative rounded-xl p-4 sm:p-5",
        done && "opacity-80"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={done}
          onCheckedChange={(checked) =>
            setStatus.mutate({ goal, status: checked === true ? "DONE" : "TODO" })
          }
          disabled={setStatus.isPending}
          aria-label="Completa obiettivo"
          className="mt-1"
        />
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "font-heading text-lg font-bold",
              done && "line-through"
            )}
          >
            {goal.title}
          </h3>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <Badge variant="outline" className={GOAL_STATUS_BADGES[goal.status]}>
              {GOAL_STATUS_LABELS[goal.status]}
            </Badge>
            <Badge
              variant="outline"
              className={GOAL_PRIORITY_BADGES[goal.priority]}
            >
              {GOAL_PRIORITY_LABELS[goal.priority]}
            </Badge>
          </div>

          {!isEmptyRichText(goal.description as RichTextValue) && (
            <div className="mt-2 line-clamp-3 text-sm text-[#4a3a1c]">
              <RichTextRenderer content={goal.description as RichTextValue} />
            </div>
          )}

          {goal.links.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {goal.links.map((link) => {
                const Icon = ENTITY_REGISTRY[link.entityType]?.icon ?? Link2;
                return (
                  <span
                    key={link.entityId}
                    className="flex items-center gap-1 rounded-full bg-black/10 px-2 py-0.5 text-[11px] text-[#4a3a1c]"
                  >
                    <Icon className="size-3" />
                    {link.entityName}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            aria-label="Preferito"
            onClick={() =>
              toggleFav.mutate({ kind: "goal", id: goal.id, label: goal.title })
            }
            className="rounded p-1 text-[#7a5c1e] hover:bg-black/10"
          >
            <Star className={cn("size-4", fav && "fill-[#b8860b]")} />
          </button>
          <button
            type="button"
            aria-label="Modifica"
            onClick={onEdit}
            className="rounded p-1 text-[#5d4a23] hover:bg-black/10"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Rimuovi"
            onClick={() => remove.mutate(goal)}
            disabled={remove.isPending}
            className="rounded p-1 text-[#5d4a23] hover:bg-black/10 hover:text-[#7a2020]"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </article>
  );
}

function GoalEditorDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal?: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { create, update } = useGoalMutations();
  const [title, setTitle] = useState(goal?.title ?? "");
  const [description, setDescription] = useState<RichTextValue>(
    (goal?.description as RichTextValue) ?? ""
  );
  const [priority, setPriority] = useState<GoalPriority>(
    goal?.priority ?? "MEDIUM"
  );
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? "TODO");
  const [tagsText, setTagsText] = useState((goal?.tags ?? []).join(", "));
  const [image, setImage] = useState(goal?.gallery?.[0] ?? "");
  const [links, setLinks] = useState<GoalLink[]>(goal?.links ?? []);

  const pending = create.isPending || update.isPending;
  const canSubmit = title.trim().length >= 2 && !pending;

  const submit = () => {
    if (!canSubmit) return;
    const draft: GoalDraft = {
      title,
      description,
      gallery: image ? [image] : [],
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      priority,
      status,
      links,
    };
    const done = { onSuccess: () => onOpenChange(false) };
    if (goal) update.mutate({ goal, draft }, done);
    else create.mutate(draft, done);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Target className="size-5 text-gold" />
            {goal ? "Modifica obiettivo" : "Nuovo obiettivo"}
          </DialogTitle>
          <DialogDescription>
            Affiggi un&rsquo;impresa alla tua bacheca personale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Titolo</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Scoprire chi ha avvelenato il pozzo di Vyones"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Priorità</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as GoalPriority)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {GOAL_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stato</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as GoalStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {GOAL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrizione</Label>
            <RichTextEditor value={description} onChange={setDescription} />
          </div>

          <div className="space-y-2">
            <Label>Tag (separati da virgola)</Label>
            <Input
              value={tagsText}
              onChange={(event) => setTagsText(event.target.value)}
              placeholder="indagine, urgente, Vyones"
            />
          </div>

          <div className="space-y-2">
            <Label>Immagine (opzionale)</Label>
            <ImageUpload value={image} onChange={setImage} folder="misc" />
          </div>

          <GoalLinksPicker links={links} onChange={setLinks} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {goal ? "Salva" : "Crea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function GoalLinksPicker({
  links,
  onChange,
}: {
  links: GoalLink[];
  onChange: (links: GoalLink[]) => void;
}) {
  const { data: entities } = useAllEntities();
  const [search, setSearch] = useState("");

  const linkedIds = useMemo(
    () => new Set(links.map((l) => l.entityId)),
    [links]
  );

  // Mostriamo anche le entità già collegate (marcate): clic = toggle.
  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (entities ?? [])
      .filter((e) => e.name.toLowerCase().includes(term))
      .slice(0, 10);
  }, [entities, search]);

  const toggle = (entity: { id: string; type: GoalLink["entityType"]; name: string }) => {
    if (linkedIds.has(entity.id)) {
      onChange(links.filter((l) => l.entityId !== entity.id));
    } else {
      onChange([
        ...links,
        { entityId: entity.id, entityType: entity.type, entityName: entity.name },
      ]);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Link2 className="size-3.5 text-gold" />
        Entità collegate
      </Label>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {links.map((link) => {
            const Icon = ENTITY_REGISTRY[link.entityType]?.icon ?? Link2;
            return (
              <span
                key={link.entityId}
                className="flex items-center gap-1 rounded-full border border-gold/25 bg-night/40 px-2 py-0.5 text-xs"
              >
                <Icon className="size-3 text-gold/70" />
                {link.entityName}
                <button
                  type="button"
                  aria-label="Rimuovi collegamento"
                  onClick={() =>
                    onChange(links.filter((l) => l.entityId !== link.entityId))
                  }
                  className="ml-0.5 text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cerca personaggi, luoghi, oggetti, eventi…"
      />
      {candidates.length > 0 && (
        <ScrollArea className="max-h-40 rounded-lg border border-gold/15">
          <ul className="p-1">
            {candidates.map((entity) => {
              const Icon = ENTITY_REGISTRY[entity.type]?.icon ?? Link2;
              const selected = linkedIds.has(entity.id);
              return (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => toggle(entity)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                      selected ? "bg-gold/15 text-gold-bright" : "hover:bg-accent"
                    )}
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center">
                      {selected ? (
                        <Check className="size-4 text-gold" />
                      ) : (
                        <Icon className="size-4 text-gold/70" />
                      )}
                    </span>
                    <span className="flex-1 truncate">{entity.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {ENTITY_REGISTRY[entity.type]?.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
