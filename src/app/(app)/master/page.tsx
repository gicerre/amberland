"use client";

import { Plus } from "lucide-react";
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

/* ───────────────────────── PAGE ───────────────────────── */

export default function MasterPage() {
  const { data: entities } = useAllEntities();
  const { setVisibility } = useEntityMutations();

  const [createType, setCreateType] = useState<EntityType | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);

  const counts = useMemo(() => {
    const map = new Map<EntityType, number>();
    for (const e of entities ?? []) {
      map.set(e.type, (map.get(e.type) ?? 0) + 1);
    }
    return map;
  }, [entities]);

  const byId = useMemo(
    () => new Map((entities ?? []).map((e) => [e.id, e])),
    [entities]
  );

  const locked = useMemo(
    () => (entities ?? []).filter(isLockedEntity),
    [entities]
  );

  const readyToReveal = locked.filter((e) => {
    if (!e.unlockAfterId) return false;
    const target = byId.get(e.unlockAfterId);
    return target?.type === "quest" && target.fields.status === "COMPLETED";
  });

  const hiddenCount = (entities ?? []).filter(isHiddenFromPlayers).length;

  return (
    <div className="space-y-8">

      {/* ───────── HEADER ───────── */}
      <PageHeader
        title="Sala del Master"
        subtitle="Da qui tessi le cronache: crea, collega e decidi cosa rivelare al party."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/grafo">Vista rete</Link>
            </Button>

            <Button onClick={() => setQuickOpen(true)}>
              <Plus className="size-4" />
              Creazione rapida
            </Button>
          </div>
        }
      />

      {/* ───────── READY TO REVEAL ───────── */}
      {readyToReveal.length > 0 && (
        <section className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_60%)]" />

          <h2 className="relative mb-4 font-heading text-lg text-amber-200">
            Segreti pronti alla rivelazione
          </h2>

          <ul className="relative space-y-2">
            {readyToReveal.map((entity) => {
              const config = ENTITY_REGISTRY[entity.type];
              const Icon = config.icon;

              return (
                <li
                  key={entity.id}
                  className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-night/40 px-3 py-2"
                >
                  <Icon className="size-4 text-amber-300" />

                  <Link
                    href={`/entita/${entity.id}`}
                    className="min-w-0 flex-1 truncate hover:text-gold-bright"
                  >
                    {entity.name}
                  </Link>

                  <Badge variant="outline" className={config.badgeClass}>
                    {config.label}
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    className="border-amber-500/40 text-amber-200"
                    onClick={() =>
                      setVisibility.mutate({
                        entity,
                        visibility: "PUBLIC",
                      })
                    }
                  >
                    Rivela
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ───────── COMPENDIUM ───────── */}
      <section className="space-y-4">

        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg tracking-wider">
            Compendio del regno
          </h2>

          <span className="text-sm text-muted-foreground">
            {hiddenCount} voci nascoste
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">

          {ENTITY_TYPES.map((type) => {
            const config = ENTITY_REGISTRY[type];
            const Icon = config.icon;

            return (
              <div
                key={type}
                className="relative overflow-hidden rounded-2xl border border-gold/15 fantasy-stripe-top"
              >

                <div className="absolute inset-0 bg-gradient-to-b from-stone-surface/70 via-stone-mid/60 to-night/90" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_60%)]" />

                <div className="relative p-4 flex flex-col items-center gap-3">

                  <p className="font-heading text-sm text-gold-bright">
                    {config.plural}
                  </p>

                  <div className="flex items-center gap-2">
                    <Icon className="size-5 text-gold/70" />
                    <span className="text-3xl font-bold text-gold">
                      {counts.get(type) ?? 0}
                    </span>
                  </div>

                  <Button
                    onClick={() => setCreateType(type)}
                    className="w-full bg-night/40 text-gold/80"
                  >
                    <Plus className="size-3.5" />
                    Aggiungi
                  </Button>

                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ───────── DIALOGS ───────── */}
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