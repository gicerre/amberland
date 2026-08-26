"use client";

import { useMemo, useState } from "react";

import { useAuth } from "@/features/auth/auth-provider";
import {
  entityDistance,
  formatDistance,
} from "@/features/battle/engine/geometry";
import {
  buildOccupancy,
  checkMove,
  reachableCells,
  remainingBudget,
  type MovementContext,
} from "@/features/battle/engine/movement";
import {
  buildObstacleIndex,
  normalizeTacticalMap,
} from "@/features/battle/engine/tactical";
import { projectField } from "@/features/battle/engine/visibility";
import {
  newActionId,
  useCombatants,
  useMoveCombatant,
  useUpdateCombatant,
} from "@/features/battle/data";
import { cn } from "@/lib/utils";
import type { Battle, Position, TerrainKind } from "@/types/battle";

import { BattleCanvas } from "./battle-canvas";
import { BattleToken } from "./battle-token";
import { MovementOverlay } from "./movement-overlay";

/* ============================================================
 * Il campo: mappa, pedine, portata e movimento.
 *
 * Un solo componente per la preparazione e per lo scontro. Cambia chi
 * comanda, non il modo di disegnare: in preparazione il Master posa le
 * pedine dove vuole (PATCH della posizione), a scontro iniziato ogni
 * spostamento passa da /move, che ricalcola il percorso con lo stesso
 * `engine/movement` usato qui per l'anteprima.
 * ============================================================ */

export function BattleField({
  battle,
  selectedId,
  onSelect,
  className,
}: {
  battle: Battle;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  className?: string;
}) {
  const { user, role, isMaster } = useAuth();
  const { data: combatants } = useCombatants(battle.id);
  const updateCombatant = useUpdateCombatant(battle.id);
  const move = useMoveCombatant(battle.id);
  const [hovered, setHovered] = useState<Position | null>(null);

  const viewer = useMemo(
    () => ({ uid: user?.uid ?? "", role: role ?? "VISITOR" }),
    [user?.uid, role]
  );

  const views = useMemo(
    () => projectField(combatants ?? [], null, viewer, battle),
    [combatants, viewer, battle]
  );

  const selected = views.find((view) => view.id === selectedId) ?? null;
  const selectedRaw = (combatants ?? []).find(
    (combatant) => combatant.id === selectedId
  );

  /**
   * In preparazione (e in lobby) il Master posa le pedine a mano: nessun
   * budget, nessun turno. Dopo l'inizio dello scontro comanda /move.
   */
  const freePlacement =
    isMaster &&
    (battle.status === "DRAFT" ||
      battle.status === "READY" ||
      battle.status === "LOBBY");

  /**
   * Strato tattico prodotto dall'editor: quando c'è, costi, dislivelli e
   * ostacoli vengono da lì. Le battaglie più vecchie continuano a usare
   * il vecchio `terrain`.
   */
  const tactical = useMemo(() => {
    if (!battle.tactical) return undefined;
    const map = normalizeTacticalMap(battle.tactical);
    return { map, obstacles: buildObstacleIndex(map) };
  }, [battle.tactical]);

  const context: MovementContext | null = useMemo(() => {
    if (!selectedRaw?.position || freePlacement) return null;
    return {
      grid: battle.grid,
      terrain: (battle.terrain ?? {}) as Record<string, TerrainKind>,
      tactical,
      occupied: buildOccupancy(
        (combatants ?? []).filter((combatant) => combatant.id !== selectedRaw.id)
      ),
      mover: {
        id: selectedRaw.id,
        position: selectedRaw.position,
        size: selectedRaw.size ?? 1,
        side: selectedRaw.side,
      },
      budget: remainingBudget(selectedRaw),
      rules: {
        blockOccupied: battle.rules.blockOccupied,
        enforceMovement: battle.rules.enforceMovement,
      },
    };
  }, [selectedRaw, combatants, battle, freePlacement, tactical]);

  // Portata mostrata solo a chi può davvero muovere quella pedina.
  const reachable = useMemo(
    () =>
      context && selected?.canControl
        ? reachableCells(context)
        : new Map<string, number>(),
    [context, selected?.canControl]
  );

  const preview = useMemo(
    () => (context && hovered ? checkMove(context, hovered) : null),
    [context, hovered]
  );

  /**
   * Righello: distanza in linea d'aria fra la pedina scelta e la cella
   * sotto il puntatore. Tiene conto dell'ingombro, quindi per un drago
   * dice la misura che serve davvero al tiro.
   */
  const rulerDistance = useMemo(() => {
    if (!selectedRaw?.position || !hovered) return null;
    return entityDistance(
      { position: selectedRaw.position, size: selectedRaw.size ?? 1 },
      { position: hovered, size: 1 },
      battle.grid
    );
  }, [selectedRaw, hovered, battle.grid]);

  /**
   * L'id arriva sempre esplicito: durante un trascinamento la selezione
   * potrebbe non essere ancora aggiornata, e muovere la pedina sbagliata
   * è l'errore peggiore che questo campo possa commettere.
   */
  const commitMove = (combatantId: string, position: Position) => {
    if (freePlacement) {
      updateCombatant.mutate({ combatantId, values: { position } });
      return;
    }
    if (!context || combatantId !== context.mover.id) return;

    const decision = checkMove(context, position);
    if (!decision.ok) return;
    move.mutate({
      combatantId,
      to: position,
      path: decision.path ?? undefined,
      actionId: newActionId(),
    });
  };

  return (
    <BattleCanvas
      grid={battle.grid}
      background={battle.background}
      terrain={battle.terrain}
      className={className}
      onCellClick={(position) => {
        if (!selectedRaw) return;
        commitMove(selectedRaw.id, position);
      }}
      overlay={
        selected && (
          <div className="glass pointer-events-none absolute top-3 left-3 rounded-xl border border-hairline px-3 py-2 text-xs">
            <p className="font-heading tracking-wide">{selected.name}</p>
            <p className="text-muted-foreground">
              {freePlacement
                ? "Trascina per posizionare"
                : `Movimento residuo ${formatDistance(
                    remainingBudget({
                      speed: selected.speed,
                      movementUsed: selected.movementUsed,
                    }),
                    battle.grid.unit
                  )}`}
              {preview?.path && !freePlacement && (
                <span
                  className={cn(
                    "ml-2",
                    preview.overBudget ? "text-crimson-light" : "text-gold"
                  )}
                >
                  · percorso {formatDistance(preview.cost, battle.grid.unit)}
                </span>
              )}
            </p>
            {rulerDistance !== null && (
              <p className="text-muted-foreground">
                Distanza {formatDistance(rulerDistance, battle.grid.unit)}
              </p>
            )}
          </div>
        )
      }
    >
      {({ cellPx, zoom }) => (
        <>
          {reachable.size > 0 && (
            <MovementOverlay
              cellPx={cellPx}
              reachable={reachable}
              path={preview?.path ?? null}
              overBudget={preview?.overBudget}
            />
          )}

          {/* Cattura il passaggio del puntatore: anteprima del percorso e righello. */}
          {selectedRaw?.position && (
            <div
              className="absolute inset-0"
              onPointerMove={(event) => {
                if (cellPx <= 0) return;
                const rect = event.currentTarget.getBoundingClientRect();
                setHovered({
                  x: Math.floor((event.clientX - rect.left) / (cellPx * zoom)),
                  y: Math.floor((event.clientY - rect.top) / (cellPx * zoom)),
                });
              }}
              onPointerLeave={() => setHovered(null)}
            />
          )}

          {views.map((view) => (
            <BattleToken
              key={view.id}
              view={view}
              cellPx={cellPx}
              zoom={zoom}
              active={battle.turn.activeCombatantId === view.id}
              selected={view.id === selectedId}
              canDrag={view.canControl && freePlacement}
              onSelect={(id) => onSelect?.(id === selectedId ? null : id)}
              onDrop={(position) => {
                onSelect?.(view.id);
                if (view.canControl) commitMove(view.id, position);
              }}
            />
          ))}
        </>
      )}
    </BattleCanvas>
  );
}
