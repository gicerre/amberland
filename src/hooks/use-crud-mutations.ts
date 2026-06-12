"use client";

import {
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { CrudService, DocumentBase } from "@/lib/firebase/firestore";

interface CrudMutationsOptions {
  /** Query key (o prefissi) da invalidare dopo ogni mutazione. */
  invalidateKeys: QueryKey[];
  /** Etichetta mostrata nei toast ("Missione", "Oggetto"…). */
  entityLabel: string;
}

/**
 * Mutazioni standard (create/update/remove) per un CrudService,
 * con invalidazione cache e toast in tema.
 */
export function useCrudMutations<
  T extends DocumentBase,
  TCreate extends object,
>(service: CrudService<T, TCreate>, options: CrudMutationsOptions) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    for (const key of options.invalidateKeys) {
      void queryClient.invalidateQueries({ queryKey: key });
    }
  };

  const create = useMutation({
    mutationFn: (data: TCreate) => service.create(data),
    onSuccess: () => {
      invalidate();
      toast.success("Scritto nelle cronache", {
        description: options.entityLabel,
      });
    },
    onError: (error: Error) =>
      toast.error("Creazione non riuscita", { description: error.message }),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TCreate> }) =>
      service.update(id, data),
    onSuccess: () => {
      invalidate();
      toast.success("Modifiche salvate");
    },
    onError: (error: Error) =>
      toast.error("Salvataggio non riuscito", { description: error.message }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => service.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success("Rimosso dalle cronache", {
        description: options.entityLabel,
      });
    },
    onError: (error: Error) =>
      toast.error("Eliminazione non riuscita", { description: error.message }),
  });

  return { create, update, remove };
}
