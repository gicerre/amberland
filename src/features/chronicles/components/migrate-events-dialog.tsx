"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import { useMigrateEvents } from "../data";

/**
 * Trascrive i vecchi «Eventi del mondo» nel Libro delle Cronache
 * (in place: stessi id, relazioni e note conservate).
 */
export function MigrateEventsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const migrate = useMigrateEvents();

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Trascrivere gli eventi nel Libro?"
      description="Ogni evento diventerà un capitolo di categoria «Evento Storico», conservando collegamenti e note. L'ordine cronologico attuale verrà usato come anno; potrai poi assegnare date precise del calendario."
      loading={migrate.isPending}
      onConfirm={() =>
        migrate.mutate(undefined, { onSuccess: () => onOpenChange(false) })
      }
    />
  );
}
