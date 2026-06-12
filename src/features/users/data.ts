"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { auth } from "@/lib/firebase/client";
import type { AdminUserDto } from "@/types/models";

import type { CreateUserValues, UpdateUserValues } from "./schemas";

/**
 * Client delle API admin (/api/admin/users): la gestione account
 * passa dal server con Firebase Admin SDK, mai dal client.
 */
async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sessione scaduta: accedi di nuovo");

  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(body?.error ?? "Errore imprevisto del server");
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const ADMIN_USERS_KEY = ["admin-users"] as const;

export function useAdminUsers() {
  return useQuery({
    queryKey: ADMIN_USERS_KEY,
    queryFn: () => authedFetch<AdminUserDto[]>("/api/admin/users"),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: CreateUserValues) =>
      authedFetch<AdminUserDto>("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      toast.success("Nuovo avventuriero registrato", {
        description: user.username,
      });
    },
    onError: (error: Error) =>
      toast.error("Creazione non riuscita", { description: error.message }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ uid, values }: { uid: string; values: UpdateUserValues }) =>
      authedFetch<AdminUserDto>(`/api/admin/users/${uid}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      toast.success("Account aggiornato");
    },
    onError: (error: Error) =>
      toast.error("Aggiornamento non riuscito", { description: error.message }),
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (uid: string) =>
      authedFetch<void>(`/api/admin/users/${uid}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_USERS_KEY });
      toast.success("Account eliminato dal regno");
    },
    onError: (error: Error) =>
      toast.error("Eliminazione non riuscita", { description: error.message }),
  });
}
