"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { TOOL_ENTRIES } from "./tool-rail";

/* ============================================================
 * Comandi dell'editor.
 *
 * Un editor si impara con le dita: qui sta la mappa dei tasti, a un "?"
 * di distanza da qualunque punto del lavoro.
 * ============================================================ */

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Vista",
    rows: [
      ["Rotella", "Zoom sul puntatore"],
      ["Rotella premuta", "Trascina la mappa"],
      ["Barra spaziatrice + trascina", "Trascina la mappa"],
      ["+ / −", "Zoom avanti e indietro"],
      ["0", "Adatta la mappa al riquadro"],
      ["F", "Centra sulla selezione"],
    ],
  },
  {
    title: "Modifica",
    rows: [
      ["Click sinistro", "Applica lo strumento attivo"],
      ["Click destro", "Menu contestuale"],
      ["Trascina", "Selezione rettangolare"],
      ["Shift + click", "Aggiungi alla selezione"],
      ["Ctrl + click", "Inverti la selezione"],
      ["Ctrl + A", "Seleziona tutte le caselle configurate"],
      ["Esc", "Annulla la selezione o chiudi il menu"],
      ["Canc", "Azzera la configurazione selezionata"],
    ],
  },
  {
    title: "Operazioni",
    rows: [
      ["Ctrl + Z", "Annulla"],
      ["Ctrl + Y  ·  Ctrl + Shift + Z", "Ripristina"],
      ["Ctrl + C", "Copia la configurazione"],
      ["Ctrl + V", "Incolla sulla selezione"],
      ["Ctrl + S", "Salva subito"],
      ["[ / ]", "Dimensione del pennello"],
      ["B / P", "Mostra o nascondi i pannelli"],
      ["?", "Questa finestra"],
    ],
  },
];

export function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Comandi</DialogTitle>
          <DialogDescription>
            Mouse e tastiera: l&apos;editor è pensato per lavorare senza
            staccare le mani.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-2 font-heading text-[0.68rem] tracking-[0.16em] text-gold/80 uppercase">
                {group.title}
              </h3>
              <dl className="space-y-1">
                {group.rows.map(([keys, description]) => (
                  <div
                    key={keys}
                    className="flex items-baseline justify-between gap-3 text-xs"
                  >
                    <dt className="shrink-0 rounded-md border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                      {keys}
                    </dt>
                    <dd className="text-right text-muted-foreground">
                      {description}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}

          <section>
            <h3 className="mb-2 font-heading text-[0.68rem] tracking-[0.16em] text-gold/80 uppercase">
              Strumenti
            </h3>
            <dl className="space-y-1">
              {TOOL_ENTRIES.map((entry) => (
                <div
                  key={entry.tool}
                  className="flex items-baseline justify-between gap-3 text-xs"
                >
                  <dt className="shrink-0 rounded-md border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">
                    {entry.shortcut}
                  </dt>
                  <dd className="text-right text-muted-foreground">
                    {entry.label}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
