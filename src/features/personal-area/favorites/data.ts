"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { COLLECTIONS } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import type { Favorite, FavoriteKind } from "@/types/personal";

/* ============================================================
 * Preferiti — risorse salvate dall'utente (oggetti, note, obiettivi,
 * personaggi). Conservati nel documento `personal_areas/{uid}`.
 * ============================================================ */

export const FAVORITES_KEY = "favorites";

function favoriteId(kind: FavoriteKind, id: string): string {
  return `${kind}:${id}`;
}

export function useFavorites() {
  const { user, role } = useAuth();
  const uid = user?.uid;
  return useQuery({
    queryKey: [FAVORITES_KEY, uid ?? ""],
    enabled: role !== null && Boolean(uid),
    queryFn: async (): Promise<Favorite[]> => {
      const snapshot = await getDoc(doc(db, COLLECTIONS.personalAreas, uid!));
      if (!snapshot.exists()) return [];
      return (snapshot.data().favorites as Favorite[]) ?? [];
    },
  });
}

/** Indica se una risorsa è tra i preferiti. */
export function isFavorite(
  favorites: Favorite[] | undefined,
  kind: FavoriteKind,
  id: string
): boolean {
  return (favorites ?? []).some((f) => f.kind === kind && f.id === id);
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const uid = user?.uid;

  return useMutation({
    mutationFn: async (favorite: Favorite) => {
      if (!uid) throw new Error("Non autenticato");
      const ref = doc(db, COLLECTIONS.personalAreas, uid);
      const snapshot = await getDoc(ref);
      const current: Favorite[] = snapshot.exists()
        ? ((snapshot.data().favorites as Favorite[]) ?? [])
        : [];
      const exists = current.some(
        (f) => f.kind === favorite.kind && f.id === favorite.id
      );
      const next = exists
        ? current.filter(
            (f) => !(f.kind === favorite.kind && f.id === favorite.id)
          )
        : [...current, favorite];
      await setDoc(
        ref,
        { userId: uid, favorites: next, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return !exists;
    },
    onSuccess: (added) => {
      void queryClient.invalidateQueries({ queryKey: [FAVORITES_KEY] });
      toast.success(added ? "Aggiunto ai preferiti" : "Rimosso dai preferiti");
    },
    onError: (error: Error) =>
      toast.error("Operazione non riuscita", { description: error.message }),
  });
}

export { favoriteId };
