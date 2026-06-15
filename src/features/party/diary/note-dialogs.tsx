"use client";

import { Link2, Loader2, Pencil, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  RichTextEditor,
  RichTextRenderer,
} from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
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
import { EntityMultiPicker } from "@/components/shared/entity-multi-picker";
import { useAuth } from "@/features/auth/auth-provider";
import { useAllEntities } from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  QUEST_EVENT_STYLE,
  VISIBILITY_BADGES,
  VISIBILITY_LABELS,
} from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import {
  VISIBILITIES,
  type Entity,
  type Visibility,
} from "@/types/entities";
import type { Note, NoteContent } from "@/types/notes";

import { useNoteLinks, useNoteMutations } from "./data";

function formatDateTime(ts: { toMillis?: () => number } | null): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Crea o modifica una nota (con editor WYSIWYG). */
export function NoteEditorDialog({
  open,
  onOpenChange,
  note,
  linkTo,
  defaultVisibility = "PARTY_ONLY",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nota da modificare; assente = creazione. */
  note?: Note;
  /** Entità a cui collegare la nota appena creata. */
  linkTo?: Entity;
  /** Visibilità iniziale in creazione (es. OWNER_ONLY per il diario personale). */
  defaultVisibility?: Visibility;
}) {
  const { create, update } = useNoteMutations();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<RichTextValue>("");
  const [visibility, setVisibility] = useState<Visibility>(defaultVisibility);
  // Collegamenti a entità (staged in creazione; in modifica si gestiscono dal dettaglio).
  const [links, setLinks] = useState<Entity[]>([]);

  useEffect(() => {
    if (!open) return;
    setTitle(note?.title ?? "");
    setContent(note?.content ?? "");
    setVisibility(note?.visibility ?? defaultVisibility);
    setLinks(note ? [] : linkTo ? [linkTo] : []);
  }, [open, note, defaultVisibility, linkTo]);

  const pending = create.isPending || update.isPending;

  const submit = () => {
    if (title.trim().length < 2) {
      toast.error("Il titolo è troppo corto");
      return;
    }
    const payloadContent: NoteContent = content ?? "";
    const done = { onSuccess: () => onOpenChange(false) };
    if (note) {
      update.mutate(
        { note, title, content: payloadContent, visibility },
        done
      );
    } else {
      create.mutate(
        { title, content: payloadContent, visibility, links },
        done
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-heading">
            {note ? "Modifica nota" : "Nuova nota"}
          </DialogTitle>
          <DialogDescription>
            {linkTo
              ? `Collegata a «${linkTo.name}»`
              : "Scrivi un ricordo, un indizio, una cronaca."}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
          <div className="space-y-2">
            <Label>Titolo</Label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titolo della nota"
            />
          </div>
          <div className="space-y-2">
            <Label>Contenuto</Label>
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Scrivi qui…"
              folder="misc"
            />
          </div>
          <div className="space-y-2">
            <Label>Visibilità</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as Visibility)}
            >
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {VISIBILITY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!note && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Link2 className="size-3.5 text-gold" />
                Collegamenti a entità
              </Label>
              <EntityMultiPicker value={links} onChange={setLinks} />
              <p className="text-xs text-muted-foreground">
                Collega la nota a personaggi, luoghi, oggetti, eventi… (puoi
                sceglierne più d&rsquo;una).
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={submit} disabled={pending || isEmptyRichText(content)}>
            {pending && <Loader2 className="size-4 animate-spin" />}
            {note ? "Salva" : "Crea nota"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Dettaglio di una nota: contenuto, collegamenti, azioni. */
export function NoteDetailDialog({
  note,
  open,
  onOpenChange,
}: {
  note: Note;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isMaster, user } = useAuth();
  const { data: links } = useNoteLinks(open ? note.id : undefined);
  const { remove, unlink, link } = useNoteMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canEdit = isMaster || note.authorId === user?.uid;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading flex items-center gap-2 text-xl">
              {note.questStatus && QUEST_EVENT_STYLE[note.questStatus] && (
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-md",
                    QUEST_EVENT_STYLE[note.questStatus].iconWrap
                  )}
                >
                  {(() => {
                    const Icon = QUEST_EVENT_STYLE[note.questStatus].icon;
                    return <Icon className="size-4" />;
                  })()}
                </span>
              )}
              {note.title}
            </DialogTitle>
            <DialogDescription>
              <span className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className={VISIBILITY_BADGES[note.visibility]}
                >
                  {VISIBILITY_LABELS[note.visibility]}
                </Badge>
                <span>
                  di <strong className="text-foreground">{note.authorName}</strong>
                  {note.createdAt && ` · ${formatDateTime(note.createdAt)}`}
                  {note.lastEditedByName &&
                    note.lastEditedByName !== note.authorName &&
                    ` · modificata da ${note.lastEditedByName}`}
                  {note.updatedAt &&
                    note.createdAt &&
                    note.updatedAt.toMillis?.() - note.createdAt.toMillis?.() >
                      60000 &&
                    ` (agg. ${formatDateTime(note.updatedAt)})`}
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <RichTextRenderer content={note.content as RichTextValue} />

            {((links ?? []).length > 0 || canEdit) && (
              <div className="mt-6 border-t border-gold/15 pt-4">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
                  <Link2 className="size-3.5" />
                  Collegata a
                </p>
                {(links ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(links ?? []).map((entityLink) => {
                      const config = ENTITY_REGISTRY[entityLink.entityType];
                      return (
                        <span
                          key={entityLink.id}
                          className="group flex items-center gap-1 rounded-full border border-gold/25 bg-card/60 py-0.5 pr-1 pl-2.5 text-sm"
                        >
                          <Link
                            href={`/entita/${entityLink.entityId}`}
                            className="hover:text-gold-bright"
                            onClick={() => onOpenChange(false)}
                          >
                            {config?.label}: {entityLink.entityName}
                          </Link>
                          {canEdit && (
                            <button
                              type="button"
                              aria-label="Scollega"
                              onClick={() => unlink.mutate(entityLink)}
                              className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                            >
                              <X className="size-3" />
                            </button>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}
                {canEdit && (
                  <div className="mt-3">
                    <EntityLinkPicker
                      excludeIds={
                        new Set((links ?? []).map((l) => l.entityId))
                      }
                      onPick={(entity) => link.mutate({ note, entity })}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {canEdit && (
            <DialogFooter>
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" />
                Elimina
              </Button>
              <Button onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Modifica
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {canEdit && (
        <>
          <NoteEditorDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            note={note}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Eliminare «${note.title}»?`}
            description="La nota e i suoi collegamenti verranno rimossi ovunque."
            loading={remove.isPending}
            onConfirm={() =>
              remove.mutate(note, {
                onSuccess: () => {
                  setDeleteOpen(false);
                  onOpenChange(false);
                },
              })
            }
          />
        </>
      )}
    </>
  );
}

/**
 * Picker riusabile per collegare una nota a un'entità esistente: ricerca
 * tra le entità leggibili e propone i risultati. `excludeIds` esclude le
 * entità già collegate.
 */
function EntityLinkPicker({
  excludeIds,
  onPick,
}: {
  excludeIds: Set<string>;
  onPick: (entity: Entity) => void;
}) {
  const { data: entities } = useAllEntities();
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return [];
    return (entities ?? [])
      .filter((e) => !excludeIds.has(e.id) && e.name.toLowerCase().includes(term))
      .slice(0, 8);
  }, [entities, search, excludeIds]);

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Cerca un'entità da collegare…"
      />
      {candidates.length > 0 && (
        <ScrollArea className="max-h-40 rounded-lg border border-gold/15">
          <ul className="p-1">
            {candidates.map((entity) => {
              const Icon = ENTITY_REGISTRY[entity.type]?.icon ?? Link2;
              return (
                <li key={entity.id}>
                  <button
                    type="button"
                    onClick={() => onPick(entity)}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <Icon className="size-4 shrink-0 text-gold/70" />
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
