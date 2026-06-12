"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { where } from "firebase/firestore";
import { toast } from "sonner";

import {
  richTextToPlainText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { useAuth } from "@/features/auth/auth-provider";
import { COLLECTIONS } from "@/lib/constants";
import { createCrudService } from "@/lib/firebase/firestore";
import { PLAYER_VISIBLE, type Entity, type Visibility } from "@/types/entities";
import type {
  Note,
  NoteContent,
  NoteLink,
  NoteLogAction,
  NoteLogEntry,
} from "@/types/notes";

type NoteInput = Omit<Note, "id" | "createdAt" | "updatedAt">;
type NoteLinkInput = Omit<NoteLink, "id" | "createdAt" | "updatedAt">;
type NoteLogInput = Omit<NoteLogEntry, "id" | "createdAt" | "updatedAt">;

const noteService = createCrudService<Note, NoteInput>(COLLECTIONS.notes);
const noteLinkService = createCrudService<NoteLink, NoteLinkInput>(
  COLLECTIONS.noteLinks
);
const noteLogService = createCrudService<NoteLogEntry, NoteLogInput>(
  COLLECTIONS.noteLog
);

export const NOTES_KEY = "notes";
export const NOTE_LINKS_KEY = "note_links";

function byCreatedDesc<T extends { createdAt: { toMillis?: () => number } | null }>(
  items: T[]
): T[] {
  return [...items].sort(
    (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
  );
}

/* ----------------------------- Lettura ----------------------------- */

/** Tutte le note leggibili (Master: tutte; Player: pubbliche/party + proprie). */
export function useNotes() {
  const { isMaster, user, role } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: [NOTES_KEY, "all", isMaster, uid ?? ""],
    enabled: role !== null,
    queryFn: async (): Promise<Note[]> => {
      // Master/Admin: tutte le note. Giocatori: pubbliche/party + le proprie.
      if (isMaster) return byCreatedDesc(await noteService.list());
      const [shared, mine] = await Promise.all([
        noteService.list(where("visibility", "in", PLAYER_VISIBLE)),
        uid ? noteService.list(where("authorId", "==", uid)) : Promise.resolve([]),
      ]);
      const map = new Map<string, Note>();
      [...shared, ...mine].forEach((note) => map.set(note.id, note));
      return byCreatedDesc([...map.values()]);
    },
  });
}

async function fetchNotesByIds(ids: string[]): Promise<Note[]> {
  const results = await Promise.all(
    ids.map(async (id) => {
      try {
        return await noteService.get(id);
      } catch {
        return null;
      }
    })
  );
  return results.filter((note): note is Note => note !== null);
}

/** Note collegate a un'entità (sezione «Note Collegate»). */
export function useEntityNotes(entityId: string | undefined) {
  const { role } = useAuth();
  return useQuery({
    queryKey: [NOTES_KEY, "forEntity", entityId ?? ""],
    enabled: role !== null && Boolean(entityId),
    queryFn: async (): Promise<{ notes: Note[]; links: NoteLink[] }> => {
      const links = await noteLinkService.list(
        where("entityId", "==", entityId)
      );
      const notes = await fetchNotesByIds(links.map((link) => link.noteId));
      return { notes: byCreatedDesc(notes), links };
    },
  });
}

/** Collegamenti di una nota (entità a cui è agganciata). */
export function useNoteLinks(noteId: string | undefined) {
  return useQuery({
    queryKey: [NOTE_LINKS_KEY, noteId ?? ""],
    enabled: Boolean(noteId),
    queryFn: () => noteLinkService.list(where("noteId", "==", noteId)),
  });
}

/** Cronologia di una nota. */
export function useNoteLog(noteId: string | undefined) {
  return useQuery({
    queryKey: [NOTES_KEY, "log", noteId ?? ""],
    enabled: Boolean(noteId),
    queryFn: async () =>
      byCreatedDesc(await noteLogService.list(where("noteId", "==", noteId))),
  });
}

/* --------------------------- Mutazioni ----------------------------- */

export function useNoteMutations() {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const me = { id: user?.uid ?? "", name: profile?.username ?? "" };

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [NOTES_KEY] });
    void queryClient.invalidateQueries({ queryKey: [NOTE_LINKS_KEY] });
  };

  // Best-effort: la cronologia non deve mai far fallire l'operazione.
  const log = async (noteId: string, action: NoteLogAction, detail = "") => {
    try {
      await noteLogService.create({
        noteId,
        action,
        detail,
        byId: me.id,
        byName: me.name,
      });
    } catch {
      /* cronologia non critica */
    }
  };

  const create = useMutation({
    mutationFn: async ({
      title,
      content,
      visibility,
      links,
    }: {
      title: string;
      content: NoteContent;
      visibility: Visibility;
      /** Entità a cui collegare la nota appena creata (una o più). */
      links?: Entity[];
    }) => {
      const noteId = await noteService.create({
        title: title.trim(),
        content,
        contentText: richTextToPlainText(content as RichTextValue),
        visibility,
        authorId: me.id,
        authorName: me.name,
        lastEditedBy: me.id,
        lastEditedByName: me.name,
      });
      await log(noteId, "CREATE");
      for (const entity of links ?? []) {
        await noteLinkService.create({
          noteId,
          entityType: entity.type,
          entityId: entity.id,
          entityName: entity.name,
        });
        await log(noteId, "LINK", entity.name);
      }
      return noteId;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Nota salvata");
    },
    onError: (error: Error) =>
      toast.error("Salvataggio non riuscito", { description: error.message }),
  });

  const update = useMutation({
    mutationFn: async ({
      note,
      title,
      content,
      visibility,
    }: {
      note: Note;
      title: string;
      content: NoteContent;
      visibility: Visibility;
    }) => {
      await noteService.update(note.id, {
        title: title.trim(),
        content,
        contentText: richTextToPlainText(content as RichTextValue),
        visibility,
        lastEditedBy: me.id,
        lastEditedByName: me.name,
      });
      await log(note.id, "EDIT");
      if (note.visibility !== visibility) {
        await log(note.id, "VISIBILITY", visibility);
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Nota aggiornata");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: async (note: Note) => {
      const links = await noteLinkService.list(where("noteId", "==", note.id));
      await Promise.all(links.map((link) => noteLinkService.remove(link.id)));
      await noteService.remove(note.id);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Nota eliminata");
    },
    onError: (error: Error) =>
      toast.error("Eliminazione non riuscita", { description: error.message }),
  });

  const link = useMutation({
    mutationFn: async ({ note, entity }: { note: Note; entity: Entity }) => {
      const existing = await noteLinkService.list(
        where("noteId", "==", note.id),
        where("entityId", "==", entity.id)
      );
      if (existing.length > 0) return;
      await noteLinkService.create({
        noteId: note.id,
        entityType: entity.type,
        entityId: entity.id,
        entityName: entity.name,
      });
      await log(note.id, "LINK", entity.name);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Nota collegata");
    },
    onError: (error: Error) =>
      toast.error("Collegamento non riuscito", { description: error.message }),
  });

  const unlink = useMutation({
    mutationFn: (link: NoteLink) => noteLinkService.remove(link.id),
    onSuccess: (_data, link) => {
      invalidate();
      void log(link.noteId, "UNLINK", link.entityName);
      toast.success("Collegamento rimosso");
    },
    onError: (error: Error) =>
      toast.error("Rimozione non riuscita", { description: error.message }),
  });

  return { create, update, remove, link, unlink };
}
