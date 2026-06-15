"use client";

import {
  BookOpen,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Feather,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { RichTextRenderer } from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { QUEST_EVENT_STYLE } from "@/features/entities/registry";
import {
  isFavorite,
  useFavorites,
  useToggleFavorite,
} from "@/features/personal-area/favorites/data";
import { cn } from "@/lib/utils";
import { PLAYER_VISIBLE } from "@/types/entities";
import type { Note } from "@/types/notes";

import { useNotes } from "./data";
import { NoteDetailDialog, NoteEditorDialog } from "./note-dialogs";

const ALL = "__all__";
const PAGE_SIZE = 10;

function formatDate(ts: { toMillis?: () => number } | null): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "";
  return new Date(ms).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Diario a libro — riusato dall'Area Personale (note OWNER_ONLY dell'autore)
 * e dall'Area Party (note PARTY_ONLY/PUBLIC). Pagine pergamena in ordine
 * cronologico inverso, paginazione a 10, sfogliamento, ricerca e segnalibri.
 */
export function DiaryBook({ scope }: { scope: "personal" | "party" }) {
  const { user, canContribute } = useAuth();
  const uid = user?.uid;
  const { data: allNotes, isLoading } = useNotes();
  const { data: favorites } = useFavorites();

  const [search, setSearch] = useState("");
  const [author, setAuthor] = useState(ALL);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detail, setDetail] = useState<Note | null>(null);

  // Note pertinenti alla macro-area.
  const scoped = useMemo(() => {
    return (allNotes ?? []).filter((note) => {
      if (scope === "personal") {
        return note.authorId === uid && note.visibility === "OWNER_ONLY";
      }
      return PLAYER_VISIBLE.includes(note.visibility);
    });
  }, [allNotes, scope, uid]);

  const authors = useMemo(
    () => [...new Set(scoped.map((n) => n.authorName).filter(Boolean))].sort(),
    [scoped]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return scoped.filter((note) => {
      if (author !== ALL && note.authorName !== author) return false;
      if (bookmarksOnly && !isFavorite(favorites, "note", note.id)) return false;
      if (
        term &&
        !note.title.toLowerCase().includes(term) &&
        !note.contentText.toLowerCase().includes(term) &&
        !note.authorName.toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [scoped, search, author, bookmarksOnly, favorites]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);

  useEffect(() => {
    setPage(0);
  }, [search, author, bookmarksOnly, scope]);

  const pageNotes = filtered.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gold/60" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cerca tra le pagine…"
            className="pl-9"
          />
        </div>
        {scope === "party" && authors.length > 1 && (
          <Select value={author} onValueChange={setAuthor}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Autore" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tutti gli autori</SelectItem>
              {authors.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant={bookmarksOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setBookmarksOnly((v) => !v)}
        >
          <Bookmark className="size-4" />
          Segnalibri
        </Button>
        {canContribute && (
          <Button className="ml-auto" onClick={() => setEditorOpen(true)}>
            <Feather className="size-4" />
            Nuova pagina
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={
            scope === "personal"
              ? "Il tuo diario è intonso"
              : "Nessuna cronaca ancora"
          }
          description={
            scope === "personal"
              ? "Le tue memorie meritano inchiostro: scrivi la prima pagina."
              : "Le imprese della compagnia attendono di essere narrate."
          }
          action={
            canContribute ? (
              <Button onClick={() => setEditorOpen(true)}>
                <Feather className="size-4" />
                Scrivi una pagina
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div
            key={safePage}
            className="grid animate-in fade-in-50 slide-in-from-right-4 gap-4 duration-300 lg:grid-cols-2"
          >
            {pageNotes.map((note) => (
              <DiaryPage
                key={note.id}
                note={note}
                bookmarked={isFavorite(favorites, "note", note.id)}
                canBookmark={canContribute}
                onOpen={() => setDetail(note)}
              />
            ))}
          </div>

          {pageCount > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-4" />
                Pagina precedente
              </Button>
              <span className="font-heading text-sm tracking-widest text-gold-bright">
                {safePage + 1} / {pageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= pageCount - 1}
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              >
                Pagina successiva
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {editorOpen && (
        <NoteEditorDialog
          open={editorOpen}
          onOpenChange={setEditorOpen}
          defaultVisibility={scope === "personal" ? "OWNER_ONLY" : "PARTY_ONLY"}
        />
      )}
      {detail && (
        <NoteDetailDialog
          note={detail}
          open={Boolean(detail)}
          onOpenChange={(open) => !open && setDetail(null)}
        />
      )}
    </div>
  );
}

function DiaryPage({
  note,
  bookmarked,
  canBookmark,
  onOpen,
}: {
  note: Note;
  bookmarked: boolean;
  canBookmark: boolean;
  onOpen: () => void;
}) {
  const toggleFav = useToggleFavorite();
  const evt = note.questStatus ? QUEST_EVENT_STYLE[note.questStatus] : null;
  return (
    <article
      className={cn(
        "parchment group relative cursor-pointer rounded-xl p-5 transition-transform hover:-translate-y-0.5",
        evt && cn("border-l-4", evt.stripe)
      )}
    >
      {canBookmark && (
        <button
          type="button"
          aria-label={bookmarked ? "Rimuovi segnalibro" : "Aggiungi segnalibro"}
          onClick={(event) => {
            event.stopPropagation();
            toggleFav.mutate({ kind: "note", id: note.id, label: note.title });
          }}
          className="absolute top-3 right-3 text-[#7a5c1e] transition-colors hover:text-[#b8860b]"
        >
          <Bookmark className={cn("size-5", bookmarked && "fill-[#b8860b]")} />
        </button>
      )}

      <div onClick={onOpen}>
        <h3 className="font-heading flex items-center gap-2 text-lg font-bold text-[#3a2d12]">
          {evt && (
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md",
                evt.iconWrap
              )}
              title={`Missione: ${evt.label}`}
            >
              <evt.icon className="size-3.5" />
            </span>
          )}
          {note.title}
        </h3>
        <p className="mt-0.5 text-xs text-[#5d4a23]/80">
          {formatDate(note.createdAt)} · di{" "}
          <span className="font-semibold">{note.authorName}</span>
        </p>
        {!isEmptyRichText(note.content as RichTextValue) && (
          <div className="mt-2 line-clamp-4 text-[15px] leading-relaxed text-[#4a3a1c]">
            <RichTextRenderer content={note.content as RichTextValue} />
          </div>
        )}
        <span className="mt-3 inline-block text-xs font-medium text-[#7a5c1e] group-hover:underline">
          Apri la pagina →
        </span>
      </div>
    </article>
  );
}
