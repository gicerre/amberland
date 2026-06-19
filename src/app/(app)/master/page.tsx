"use client";

import { Eye, EyeOff, Lock, Network, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { frameImageStyle, getAsset } from "@/design-system";
import { QuickCreateDialog } from "@/features/entities/components/quick-create-dialog";
import { useAllEntities, useEntityMutations } from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  isHiddenFromPlayers,
  isLockedEntity,
} from "@/features/entities/registry";
import { ENTITY_TYPES, type EntityType } from "@/types/entities";

/**
 * Sala del Master: panoramica del compendio, creazione rapida e
 * gestione delle rivelazioni (entità bloccate pronte allo sblocco).
 */
export default function MasterPage() {
  const { data: entities } = useAllEntities();
  const { setVisibility } = useEntityMutations();
  const [createType, setCreateType] = useState<EntityType | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<EntityType, number>();
    for (const entity of entities ?? []) {
      map.set(entity.type, (map.get(entity.type) ?? 0) + 1);
    }
    return map;
  }, [entities]);

  const byId = useMemo(
    () => new Map((entities ?? []).map((entity) => [entity.id, entity])),
    [entities]
  );

  const locked = useMemo(
    () => (entities ?? []).filter((entity) => isLockedEntity(entity)),
    [entities]
  );
  const readyToReveal = locked.filter((entity) => {
    if (!entity.unlockAfterId) return false;
    const target = byId.get(entity.unlockAfterId);
    return target?.type === "quest" && target.fields.status === "COMPLETED";
  });
  const hiddenCount = (entities ?? []).filter((entity) =>
    isHiddenFromPlayers(entity)
  ).length;

  return (
    <div>
      <PageHeader
        title="Sala del Master"
        subtitle="Da qui tessi le cronache: crea, collega e decidi cosa rivelare al party."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/grafo">
                <Network className="size-4" />
                Vista rete
              </Link>
            </Button>
            <Button onClick={() => setQuickOpen(true)}>
              <Plus className="size-4" />
              Creazione rapida
            </Button>
          </div>
        }
      />

      {/* Da rivelare */}
      {readyToReveal.length > 0 && (
        <section className="mb-8 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5">
          <h2 className="font-heading mb-3 flex items-center gap-2 text-lg font-semibold text-amber-200">
            <Lock className="size-4.5" />
            Pronte per essere rivelate
          </h2>
          <p className="mb-4 text-sm text-amber-200/80">
            La quest collegata è stata completata: questi segreti possono ora
            essere svelati al party.
          </p>
          <ul className="space-y-2">
            {readyToReveal.map((entity) => {
              const config = ENTITY_REGISTRY[entity.type];
              const Icon = config.icon;
              return (
                <li
                  key={entity.id}
                  className="flex items-center gap-3 rounded-lg border border-amber-500/25 bg-background/40 px-3.5 py-2.5"
                >
                  <Icon className="size-4 shrink-0 text-amber-300" />
                  <Link
                    href={`/entita/${entity.id}`}
                    className="min-w-0 flex-1 truncate font-medium transition-colors hover:text-gold-bright"
                  >
                    {entity.name}
                  </Link>
                  <Badge variant="outline" className={config.badgeClass}>
                    {config.label}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/50 text-amber-200 hover:bg-amber-500/15"
                    onClick={() =>
                      setVisibility.mutate({ entity, visibility: "PUBLIC" })
                    }
                  >
                    <Eye className="size-3.5" />
                    Rivela
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Compendio */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold tracking-wider">
            Compendio del regno
          </h2>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <EyeOff className="size-4 text-amber-400" />
            {hiddenCount} {hiddenCount === 1 ? "voce nascosta" : "voci nascoste"} ai giocatori
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ENTITY_TYPES.map((type) => {
            const config = ENTITY_REGISTRY[type];
            const Icon = config.icon;
            return (
              // <FrameCard key={type} contentClassName="p-5">
              <button
                type="button"
                onClick={() => null}
                key={type}
                aria-label={`Apri ${config.plural} a schermo intero`}
                className="block w-full overflow-hidden rounded-xl border border-gold/20"
                style={frameImageStyle(getAsset("window_03"), "primary", "1.5rem")}
              >
                <div className="flex flex-col items-center gap-2 rounded-tl-lg rounded-tr-lg bg-night/30 py-3">
                  <p className="mt-2 font-heading font-semibold">{config.plural}</p>
                  <div className="flex items-center justify-center gap-1.5 rounded-md bg-night/20 px-2 py-1">
                    <Icon className="size-5 text-gold/70" />
                    <span className="font-heading text-3xl font-bold text-gold">
                      {counts.get(type) ?? 0}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCreateType(type)}
                    key={type}
                    aria-label={`Crea nuova ${config.plural} a schermo intero`}
                    className="h-10 justify-center flex items-center gap-1.5 rounded-md border border-gold/15 bg-night/30 px-2 py-1.5 text-sm text-center text-gold/80 w-full"
                    style={frameImageStyle(getAsset("window_04"), "primary", "1.5rem")}
                  >
                    <Plus className="size-3.5" />
                    Aggiungi
                  </button>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <QuickCreateDialog open={quickOpen} onOpenChange={setQuickOpen} />
      {createType && (
        <QuickCreateDialog
          open={createType !== null}
          onOpenChange={(open) => !open && setCreateType(null)}
          type={createType}
        />
      )}
    </div>
  );
}
