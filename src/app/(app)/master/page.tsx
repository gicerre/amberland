"use client";

import { BookOpen, Eye, Network, Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { DeskPlaque } from "@/components/shared/desk-plaque";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  StatGrid,
  TomeHeading,
  TomePanel,
  type StatItem,
} from "@/design-system";
import { QuickCreateDialog } from "@/features/entities/components/quick-create-dialog";
import { useAllEntities, useEntityMutations } from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  isHiddenFromPlayers,
  isLockedEntity,
} from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import { ENTITY_TYPES, type EntityType } from "@/types/entities";
import { imageIcon } from "@/components/shared/image-icon";

/* Icone narrative della panoramica: a livello di modulo, mai nel render
   (UX_AUDIT_REDESIGN 3.4). */
const BookIcon = imageIcon("/icons/book.png");
const HiddenIcon = imageIcon("/icons/eye_off.png");
const LockedIcon = imageIcon("/icons/lock.png");
const HandsIcon = imageIcon("/icons/hands.png");

/* ───────────────────────── PAGE ───────────────────────── */

export default function MasterPage() {
  const { data: entities } = useAllEntities();
  const { setVisibility } = useEntityMutations();

  const [createType, setCreateType] = useState<EntityType | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  // Cerimonia "il sigillo si spezza": la voce si frattura prima di rivelarsi.
  const [breakingId, setBreakingId] = useState<string | null>(null);

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

  const total = (entities ?? []).length;
  const hiddenCount = (entities ?? []).filter(isHiddenFromPlayers).length;

  // Panoramica del regno (info critiche del DM, a colpo d'occhio).
  const overview: StatItem[] = [
    { icon: BookIcon, label: "Voci totali", value: total },
    {
      icon: HiddenIcon,
      label: "Nascoste",
      value: hiddenCount,
      accent: hiddenCount > 0 ? "amber" : "gold",
    },
    { icon: LockedIcon, label: "Bloccate", value: locked.length },
    {
      icon: HandsIcon,
      label: "Pronte",
      value: readyToReveal.length,
      accent: readyToReveal.length > 0 ? "emerald" : "gold",
    },
  ];

  return (
    <div className="space-y-7">
      {/* ───────── TARGA DELLO SCRITTOIO ───────── */}
      <DeskPlaque
        eyebrow="Strumenti del narratore"
        title="Tavolo da Guerra del Master"
        subtitle="Da qui tessi le cronache: crea, collega e decidi cosa rivelare al party."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/grafo">
                <Network className="size-4" />
                <span className="hidden sm:inline">Vista rete</span>
              </Link>
            </Button>
            <Button onClick={() => setQuickOpen(true)}>
              <Plus className="size-4" />
              <span className="hidden sm:inline">Creazione rapida</span>
            </Button>
          </div>
        }
      />

      {/* ───────── PANORAMICA DEL REGNO ───────── */}
      <StatGrid items={overview} />

      {/* ───────── SEGRETI PRONTI ALLA RIVELAZIONE ───────── */}
      {readyToReveal.length > 0 && (
        <TomePanel
          icon={Sparkles}
          eyebrow="Azione richiesta"
          title="Segreti pronti alla rivelazione"
          accent="amber"
        >
          <ul className="space-y-2">
            {readyToReveal.map((entity) => {
              const config = ENTITY_REGISTRY[entity.type];
              const Icon = config.icon;
              return (
                <li
                  key={entity.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border border-ember/25 bg-night/40 px-3 py-2",
                    breakingId === entity.id &&
                      "animate-[reveal-out_320ms_ease-in_both]"
                  )}
                >
                  <Icon className="size-4 shrink-0 text-ember-bright" />
                  <Link
                    href={`/entita/${entity.id}`}
                    className="min-w-0 flex-1 truncate hover:text-gold-bright"
                  >
                    {entity.name}
                  </Link>
                  <Badge
                    variant="outline"
                    className={cn("hidden shrink-0 sm:inline-flex", config.badgeClass)}
                  >
                    {config.label}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 border-ember/40 text-ember-bright"
                    disabled={breakingId === entity.id}
                    onClick={() => {
                      // Prima si spezza il sigillo, poi la voce si rivela.
                      setBreakingId(entity.id);
                      setTimeout(() => {
                        setVisibility.mutate({ entity, visibility: "PUBLIC" });
                        setBreakingId(null);
                      }, 320);
                    }}
                  >
                    <Eye className="size-3.5" />
                    Rivela
                  </Button>
                </li>
              );
            })}
          </ul>
        </TomePanel>
      )}

      {/* ───────── COMPENDIO DEL REGNO ───────── */}
      <section>
        <TomeHeading
          icon={BookOpen}
          title="Compendio del regno"
          meta={`${hiddenCount} nascoste`}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {ENTITY_TYPES.filter((type) => type !== "event").map((type) => {
            const config = ENTITY_REGISTRY[type];
            const Icon = config.icon;
            return (
              <div
                key={type}
                className="fantasy-stripe-top relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-b from-stone-surface to-stone-mid/80 p-4 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.7)]"
              >
                <div className="flex items-center gap-3">
                  {/* Emblema narrativo 64px: non deve pesare più del dato (0.8) */}
                  <span className="flex size-16 shrink-0 items-center justify-center rounded-lg">
                    <Icon className="size-14" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-xs tracking-wide text-muted-foreground">
                      {config.plural}
                    </p>
                    <p className="font-heading text-2xl leading-none font-bold text-gold-bright">
                      {counts.get(type) ?? 0}
                    </p>
                  </div>
                </div>
                {config.hiddenInCreate ? (
                  // Le Cronache hanno un flusso di scrittura dedicato.
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-10 w-full"
                    asChild
                  >
                    <Link href="/cronache">
                      <BookOpen className="size-3.5" />
                      Apri il Libro
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 h-10 w-full"
                    onClick={() => setCreateType(type)}
                  >
                    <Plus className="size-3.5" />
                    Aggiungi
                  </Button>
                )}
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
