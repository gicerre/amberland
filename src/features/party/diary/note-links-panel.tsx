"use client";

import { BookText, Link2, Lock, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/features/auth/auth-provider";
import { VISIBILITY_BADGES, VISIBILITY_LABELS } from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";
import type { Note } from "@/types/notes";

import { useEntityNotes, useNotes, useNoteMutations } from "./data";
import { NoteDetailDialog, NoteEditorDialog } from "./note-dialogs";

/**
 * Sezione «Note Collegate» riusabile su ogni entità: mostra le note
 * agganciate, permette di crearne di nuove (collegate), collegarne di
 * esistenti e scollegarle. Stesso ecosistema del Diario.
 */
export function NoteLinksPanel({ entity }: { entity: Entity }) {
  const { isMaster, user, canContribute } = useAuth();
  const { data } = useEntityNotes(entity.id);
  const { unlink } = useNoteMutations();
  const [createOpen, setCreateOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [active, setActive] = useState<Note | null>(null);

  const notes = data?.notes ?? [];
  const links = data?.links ?? [];
  const linkOf = (noteId: string) => links.find((l) => l.noteId === noteId);

  return (
    <section className="rounded-xl border border-gold/15 bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-wider">
          <BookText className="size-4.5 text-gold" />
          Note collegate
        </h2>
        {canContribute && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-3.5" />
              Collega
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              Nuova
            </Button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground italic">
          Nessuna nota collegata… ancora.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((note) => {
            const link = linkOf(note.id);
            const canUnlink = isMaster || note.authorId === user?.uid;
            // Le note personali (OWNER_ONLY) hanno un look distinto da quelle
            // condivise del party: le vede comunque solo l'autore.
            const isPersonal = note.visibility === "OWNER_ONLY";
            return (
              <li
                key={note.id}
                className={cn(
                  "group flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
                  isPersonal
                    ? "border-sky-700/40 bg-sky-950/25 hover:border-sky-600/60"
                    : "border-transparent hover:border-gold/25 hover:bg-gold/5"
                )}
              >
                {isPersonal ? (
                  <Lock className="size-4 shrink-0 text-sky-300/80" />
                ) : (
                  <BookText className="size-4 shrink-0 text-gold/70" />
                )}
                <button
                  type="button"
                  onClick={() => setActive(note)}
                  className={cn(
                    "min-w-0 flex-1 truncate text-left font-medium text-foreground",
                    isPersonal ? "hover:text-sky-300" : "hover:text-gold-bright"
                  )}
                >
                  {note.title}
                </button>
                {isPersonal ? (
                  <Badge
                    variant="outline"
                    className="shrink-0 border-sky-700/50 bg-sky-950/40 text-[10px] text-sky-300"
                  >
                    Personale
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className={`shrink-0 text-[10px] ${VISIBILITY_BADGES[note.visibility]}`}
                  >
                    {VISIBILITY_LABELS[note.visibility]}
                  </Badge>
                )}
                {canUnlink && link && (
                  <button
                    type="button"
                    aria-label="Scollega"
                    onClick={() => unlink.mutate(link)}
                    className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <NoteEditorDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        linkTo={entity}
      />
      <LinkExistingDialog
        entity={entity}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        linkedIds={notes.map((note) => note.id)}
      />
      {active && (
        <NoteDetailDialog
          note={active}
          open={Boolean(active)}
          onOpenChange={(open) => !open && setActive(null)}
        />
      )}
    </section>
  );
}

function LinkExistingDialog({
  entity,
  open,
  onOpenChange,
  linkedIds,
}: {
  entity: Entity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedIds: string[];
}) {
  const { data: notes } = useNotes();
  const { link } = useNoteMutations();
  const [search, setSearch] = useState("");

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (notes ?? [])
      .filter((note) => !linkedIds.includes(note.id))
      .filter((note) => !term || note.title.toLowerCase().includes(term))
      .slice(0, 40);
  }, [notes, linkedIds, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Collega una nota a «{entity.name}»
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca una nota…"
          />
          <ScrollArea className="h-56 rounded-lg border border-gold/15">
            <ul className="p-1">
              {candidates.map((note) => (
                <li key={note.id}>
                  <button
                    type="button"
                    onClick={() =>
                      link.mutate(
                        { note, entity },
                        { onSuccess: () => onOpenChange(false) }
                      )
                    }
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                  >
                    <BookText className="size-4 shrink-0 text-gold/70" />
                    <span className="flex-1 truncate">{note.title}</span>
                  </button>
                </li>
              ))}
              {candidates.length === 0 && (
                <li className="px-2.5 py-4 text-center text-sm text-muted-foreground italic">
                  Nessuna nota disponibile.
                </li>
              )}
            </ul>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
