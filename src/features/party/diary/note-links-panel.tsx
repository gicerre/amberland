"use client";

import { BookText, Link2, Lock, Plus, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImmersiveModal } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import {
  QUEST_EVENT_STYLE,
  VISIBILITY_BADGES,
  VISIBILITY_LABELS,
} from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";
import type { Note } from "@/types/notes";

import { useEntityNotes, useNoteMutations, useNotes } from "./data";
import { QuestStatusIcon } from "@/features/entities/components/quest-status-icon";

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
    <section className="fantasy-stripe-top relative overflow-hidden rounded-2xl border border-amber-900/25 bg-gradient-to-br from-amber-900/10 via-card to-night/70 p-5 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)] sm:p-6">
      {/* Bagliore caldo di pergamena */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(200,167,93,0.12),transparent_60%)]"
      />
      {/* Righe del quaderno — segnale di "pagina di appunti" */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.05] bg-[repeating-linear-gradient(0deg,transparent,transparent_27px,rgba(212,175,55,0.7)_28px)]"
      />

      <div className="relative z-0 mb-4 flex items-center justify-between gap-3">
        <h2 className="font-heading flex items-center gap-2 text-lg font-semibold tracking-wider">
          <BookText className="size-4.5 text-amber-bright" />
          Note collegate
        </h2>
        {canContribute && (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" onClick={() => setLinkOpen(true)}>
              <Link2 className="size-3.5" />
              <span className="sm:inline hidden">Collega</span>
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-3.5" />
              <span className="sm:inline hidden">Nuova</span>
            </Button>
          </div>
        )}
      </div>

      {notes.length === 0 ? (
        <p className="relative z-0 py-4 text-center text-sm text-muted-foreground italic">
          Nessuna nota collegata… ancora.
        </p>
      ) : (
        <ul className="relative z-0 grid gap-2.5 sm:grid-cols-2">
          {notes.map((note) => {
            const link = linkOf(note.id);
            const canUnlink = isMaster || note.authorId === user?.uid;
            // Le note personali (OWNER_ONLY) hanno un look distinto da quelle
            // condivise del party: le vede comunque solo l'autore.
            const isPersonal = note.visibility === "OWNER_ONLY";
            const evt = note.questStatus
              ? QUEST_EVENT_STYLE[note.questStatus]
              : null;
            return (
              <li
                key={note.id}
                className={cn(
                  "group relative overflow-hidden rounded-lg border shadow-[0_4px_16px_-10px_rgba(0,0,0,0.8)] transition-all duration-300 hover:-translate-y-0.5",
                  isPersonal
                    ? "border-sky-700/40 bg-gradient-to-br from-sky-950/40 to-stone-mid/70 hover:border-sky-600/60 hover:shadow-[0_10px_26px_-12px_rgba(0,0,0,0.9),0_0_18px_rgba(56,189,248,0.18)]"
                    : "border-amber-900/30 bg-gradient-to-br from-amber-950/25 via-stone-surface/90 to-stone-mid/70 hover:border-gold/45 hover:shadow-[0_10px_26px_-12px_rgba(0,0,0,0.9),0_0_18px_rgba(212,175,55,0.16)]"
                )}
              >
                {/* Angolo piegato — un foglio appuntato */}
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-0 right-0 border-t-[16px] border-l-[16px] border-l-transparent transition-colors",
                    isPersonal
                      ? "border-t-sky-700/45 group-hover:border-t-sky-500/60"
                      : "border-t-gold/25 group-hover:border-t-gold/45"
                  )}
                />

                <button
                  type="button"
                  onClick={() => setActive(note)}
                  className="flex w-full items-start gap-3 p-3 pr-9 text-left"
                >
                  {/* Icona nel margine del foglio */}
                  <span
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border",
                      isPersonal
                        ? "border-sky-700/40 bg-sky-950/40"
                        : "border-hairline-strong bg-night/40"
                    )}
                  >
                    {evt ? (
                      <QuestStatusIcon
                        status={note.questStatus}
                        className="size-5"
                      />
                    ) : isPersonal ? (
                      <Lock className="size-4 text-sky-300/80" />
                    ) : (
                      <BookText className="size-4 text-gold/70" />
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate font-heading text-[15px] font-semibold leading-snug text-foreground transition-colors",
                        isPersonal
                          ? "group-hover:text-sky-300"
                          : "group-hover:text-gold-bright"
                      )}
                    >
                      {note.title}
                    </span>
                    {/* Riga di scrittura sotto il titolo */}
                    <span
                      aria-hidden
                      className={cn(
                        "mt-1 mb-1.5 block h-px w-full",
                        isPersonal
                          ? "bg-gradient-to-r from-sky-700/40 to-transparent"
                          : "bg-gradient-to-r from-gold/30 to-transparent"
                      )}
                    />
                    {isPersonal ? (
                      <Badge
                        variant="outline"
                        className="border-sky-700/50 bg-sky-950/40 text-[10px] text-sky-300"
                      >
                        Personale
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${VISIBILITY_BADGES[note.visibility]}`}
                      >
                        {VISIBILITY_LABELS[note.visibility]}
                      </Badge>
                    )}
                  </span>
                </button>

                {canUnlink && link && (
                  <button
                    type="button"
                    aria-label="Scollega"
                    onClick={() => unlink.mutate(link)}
                    className="absolute bottom-2 right-2 flex size-6 items-center justify-center rounded-full border border-transparent text-muted-foreground opacity-0 transition-all hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
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
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={<Link2 />}
      title={`Collega una nota a «${entity.name}»`}
      description="Scegli una cronaca esistente da agganciare a questa voce."
    >
      <div className="space-y-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Cerca una nota…"
        />
        <ScrollArea className="h-72 rounded-lg border border-hairline bg-black/20">
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
    </ImmersiveModal>
  );
}
