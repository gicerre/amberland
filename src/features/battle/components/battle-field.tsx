"use client";

import { Hand } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import {
  entityDistance,
  formatDistance,
  parseCellKey,
} from "@/features/battle/engine/geometry";
import { coverBetween, describeCover } from "@/features/battle/engine/cover";
import {
  availableInteractions,
  availableMethods,
} from "@/features/battle/engine/elements";
import { isWithinReach } from "@/features/battle/engine/interactions";
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
  useInteractWithElement,
  useMoveCombatant,
  useUpdateCombatant,
} from "@/features/battle/data";
import { cn } from "@/lib/utils";
import type { Battle, Position, TerrainKind } from "@/types/battle";
import type { ElementInteraction, MapObject } from "@/types/battlemap";

import { BattleCanvas } from "./battle-canvas";
import { BattleToken } from "./battle-token";
import { MovementOverlay } from "./movement-overlay";

/* ============================================================
 * Il campo di gioco.
 *
 * Il giocatore vede SOLO ciò che il tavolo vedrebbe: l'immagine della
 * mappa, la griglia, le pedine e le informazioni che il gioco deve
 * comunicargli (dove può arrivare, che cosa può fare). Niente terreni
 * colorati, niente CD, niente quote numeriche, niente configurazioni del
 * Master: quella roba vive nell'editor e resta lì.
 *
 * Lo stesso componente serve la preparazione — dove il Master posa le
 * pedine a mano — e lo scontro, dove ogni spostamento passa da /move.
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
  const interact = useInteractWithElement(battle.id);
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

  /** Strato tattico configurato dal Master: invisibile, ma vincolante. */
  const tactical = useMemo(() => {
    if (!battle.tactical) return undefined;
    const map = normalizeTacticalMap(battle.tactical);
    return { map, obstacles: buildObstacleIndex(map) };
  }, [battle.tactical]);

  const freePlacement =
    isMaster &&
    (battle.status === "DRAFT" ||
      battle.status === "READY" ||
      battle.status === "LOBBY");

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

  /** Righello: distanza in linea d'aria, con l'ingombro della pedina. */
  const rulerDistance = useMemo(() => {
    if (!selectedRaw?.position || !hovered) return null;
    return entityDistance(
      { position: selectedRaw.position, size: selectedRaw.size ?? 1 },
      { position: hovered, size: 1 },
      battle.grid
    );
  }, [selectedRaw, hovered, battle.grid]);

  /**
   * Azioni disponibili sull'ambiente: gli elementi a portata di braccio
   * dalla pedina scelta. È qui che la configurazione invisibile del
   * Master diventa un pulsante per il giocatore.
   */
  const actions = useMemo(() => {
    if (!tactical || !selectedRaw?.position || !selected?.canControl) return [];
    const from = selectedRaw.position;

    return tactical.map.objects.flatMap((element) => {
      if (!isMaster && !element.visibleToPlayers) return [];
      if (!isWithinReach(from, element)) return [];
      return availableInteractions(element, { isMaster, from }).map(
        (interaction) => ({
          element,
          interaction,
          methods: availableMethods(interaction, { isMaster }),
        })
      );
    });
  }, [tactical, selectedRaw, selected?.canControl, isMaster]);

  /**
   * Copertura fra la pedina scelta e la casella sotto il puntatore.
   * È una lettura da REGIA: la vede solo il Master, perché sapere in
   * anticipo quanto ripara un masso è informazione che al giocatore il
   * tavolo non darebbe.
   */
  const coverReading = useMemo(() => {
    if (!isMaster || !tactical || !selectedRaw?.position || !hovered) return null;
    return coverBetween(
      tactical.map,
      tactical.obstacles,
      selectedRaw.position,
      hovered
    );
  }, [isMaster, tactical, selectedRaw, hovered]);

  /** La camera segue chi ha il turno; in preparazione resta ferma. */
  const focus = useMemo(() => {
    if (battle.status !== "ACTIVE") return null;
    const active = (combatants ?? []).find(
      (combatant) => combatant.id === battle.turn.activeCombatantId
    );
    return active?.position ?? null;
  }, [battle.status, battle.turn.activeCombatantId, combatants]);

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

  const runInteraction = (
    element: MapObject,
    interaction: ElementInteraction,
    methodId?: string
  ) =>
    interact.mutate({
      elementId: element.id,
      interactionId: interaction.id,
      methodId,
      combatantId: selectedRaw?.id ?? null,
      actionId: newActionId(),
    });

  return (
    <BattleCanvas
      grid={battle.grid}
      background={battle.background}
      className={className}
      focus={focus}
      onCellClick={(position) => {
        if (!selectedRaw) return;
        commitMove(selectedRaw.id, position);
      }}
      overlay={
        <>
          {selected && (
            <div className="glass pointer-events-none absolute top-3 left-3 max-w-[15rem] rounded-xl border border-hairline px-3 py-2 text-xs">
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
              {coverReading && (
                <p className="text-amber-200/90">
                  {describeCover(coverReading)}
                </p>
              )}
            </div>
          )}

          {actions.length > 0 && (
            <div className="glass absolute right-3 bottom-16 max-w-[14rem] space-y-1 rounded-xl border border-hairline p-2">
              <p className="px-1 font-heading text-[0.62rem] tracking-[0.14em] text-gold/80 uppercase">
                <Hand className="mr-1 inline size-3" />
                Qui puoi
              </p>
              {actions.map(({ element, interaction, methods }) => (
                <div key={`${element.id}-${interaction.id}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start text-xs"
                    disabled={interact.isPending || methods.length > 1}
                    onClick={() =>
                      methods.length <= 1 && runInteraction(element, interaction)
                    }
                  >
                    <span className="truncate">
                      {interaction.label}
                      <span className="ml-1 text-muted-foreground">
                        · {element.name}
                      </span>
                    </span>
                  </Button>

                  {/* Più modi di riuscirci: la scelta è del giocatore. */}
                  {methods.length > 1 &&
                    methods.map((entry) => (
                      <Button
                        key={entry.id}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full justify-start pl-5 text-[11px] text-muted-foreground"
                        disabled={interact.isPending}
                        onClick={() =>
                          runInteraction(element, interaction, entry.id)
                        }
                      >
                        <span className="truncate">
                          {entry.label}
                          {entry.check
                            ? ` · ${entry.check.skill} CD ${entry.check.dc}`
                            : ""}
                        </span>
                      </Button>
                    ))}
                </div>
              ))}
            </div>
          )}
        </>
      }
    >
      {({ cellPx, zoom }) => (
        <>
          {/* Dove posso arrivare: informazione di gioco, non di editor. */}
          {reachable.size > 0 && (
            <MovementOverlay
              cellPx={cellPx}
              reachable={reachable}
              path={preview?.path ?? null}
              overBudget={preview?.overBudget}
            />
          )}

          {/* Aree e pericoli che il Master ha reso visibili al tavolo. */}
          {tactical?.map.areas
            .filter((area) => isMaster || area.visibleToPlayers)
            .map((area) =>
              area.cells.map((key) => {
                const cell = parseCellKey(key);
                if (!cell) return null;
                return (
                  <div
                    key={`${area.id}-${key}`}
                    className="pointer-events-none absolute"
                    style={{
                      left: cell.x * cellPx,
                      top: cell.y * cellPx,
                      width: cellPx,
                      height: cellPx,
                      backgroundColor: area.color,
                      opacity: area.opacity,
                    }}
                  />
                );
              })
            )}
          {tactical?.map.hazards
            .filter((hazard) => isMaster || hazard.visibleToPlayers)
            .map((hazard) =>
              hazard.cells.map((key) => {
                const cell = parseCellKey(key);
                if (!cell) return null;
                return (
                  <div
                    key={`${hazard.id}-${key}`}
                    className="pointer-events-none absolute rounded-sm"
                    style={{
                      left: cell.x * cellPx + 1,
                      top: cell.y * cellPx + 1,
                      width: cellPx - 2,
                      height: cellPx - 2,
                      backgroundColor: hazard.color,
                      opacity: 0.22,
                    }}
                  />
                );
              })
            )}

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
