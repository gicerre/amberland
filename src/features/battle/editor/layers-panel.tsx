"use client";

import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAP_LAYERS, type MapLayer } from "@/types/battlemap";

import { useEditor } from "./use-editor";

/** Nomi dei layer in italiano: l'inglese resta nel codice, non a schermo. */
const LAYER_LABELS: Record<MapLayer, string> = {
  terrain: "Terreno",
  elevation: "Quote",
  water: "Acque",
  walls: "Muri",
  objects: "Oggetti",
  traps: "Trappole",
  hazards: "Pericoli",
  areas: "Aree",
  zones: "Zone",
  poi: "Punti di interesse",
  cover: "Copertura",
  lighting: "Luci",
  interactions: "Interazioni",
  grid: "Griglia",
};

/**
 * Pannello dei livelli: cosa si vede e cosa si può toccare.
 * Bloccare un layer è la difesa contro il tratto dato per sbaglio sul
 * terreno mentre si stavano posando le trappole.
 */
export function LayersPanel() {
  const editor = useEditor();
  const { map } = editor;

  return (
    <div className="space-y-1 p-3">
      <p className="mb-2 text-[11px] text-muted-foreground">
        L&apos;occhio nasconde, il lucchetto protegge dalle modifiche.
      </p>
      {MAP_LAYERS.map((layer) => {
        const state = map.layers[layer];
        return (
          <div
            key={layer}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
              state.visible
                ? "border-hairline bg-surface-2/50"
                : "border-transparent text-muted-foreground/60"
            )}
          >
            <span className="min-w-0 flex-1 truncate">{LAYER_LABELS[layer]}</span>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={state.visible ? "Nascondi" : "Mostra"}
              onClick={() => editor.toggleLayer(layer, "visible")}
            >
              {state.visible ? (
                <Eye className="size-3.5" />
              ) : (
                <EyeOff className="size-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={state.locked ? "Sblocca" : "Blocca"}
              onClick={() => editor.toggleLayer(layer, "locked")}
            >
              {state.locked ? (
                <Lock className="size-3.5 text-amber-300" />
              ) : (
                <LockOpen className="size-3.5" />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
