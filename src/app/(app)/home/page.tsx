"use client";

import {
  BookMarked,
  Crown,
  Flame,
  Map,
  ScrollText,
  Shield,
  Swords,
  User,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionDivider } from "@/components/shared/fantasy-card";
import { richTextToPlainText } from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { frameImageStyle, getAsset } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { useAllEntities } from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  QUEST_STATUS_BADGES,
  QUEST_STATUS_OPTIONS,
} from "@/features/entities/registry";
import { formatDate, timestampToDate } from "@/lib/utils";
import type { Role } from "@/types/models";

const ROLE_GREETINGS: Record<Role, string> = {
  ADMIN: "Custode del Regno, le chiavi di Amberland sono nelle tue mani.",
  MASTER: "Tessitore di storie, il regno attende le tue cronache.",
  PLAYER: "Eroe di Amberland, nuove avventure ti chiamano.",
  VISITOR: "Viaggiatore, esplora pure le cronache di Amberland.",
};

interface QuickLink {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  roles?: Role[];
}

const QUICK_LINKS: QuickLink[] = [
  { label: "Mondo", description: "Esplora l'atlante", href: "/mondo", icon: Map },
  { label: "Quest", description: "Le imprese del party", href: "/quest", icon: ScrollText },
  { label: "Party", description: "I tuoi compagni", href: "/party", icon: Swords },
  { label: "Personaggi", description: "I volti del regno", href: "/personaggi", icon: User },
  { label: "Area Personale", description: "Il tuo tomo privato", href: "/area-personale", icon: BookMarked },
  { label: "Sala del Master", description: "Tessi le cronache", href: "/master", icon: Crown, roles: ["ADMIN", "MASTER"] },
  { label: "Amministrazione", description: "Gestisci gli accessi", href: "/admin", icon: Shield, roles: ["ADMIN"] },
];

/** Home: benvenuto, quest attive, ultime cronache e collegamenti rapidi. */
export default function HomePage() {
  const { profile, role } = useAuth();
  const { data: entities, isLoading } = useAllEntities();

  const activeQuests = useMemo(
    () =>
      (entities ?? [])
        .filter(
          (entity) =>
            entity.type === "quest" && entity.fields.status === "ACTIVE"
        )
        .slice(0, 3),
    [entities]
  );

  const recentEntities = useMemo(
    () =>
      [...(entities ?? [])]
        .sort(
          (a, b) =>
            (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0)
        )
        .slice(0, 5),
    [entities]
  );

  const visibleLinks = QUICK_LINKS.filter(
    (link) => !link.roles || (role !== null && link.roles.includes(role))
  );

  return (
    <div className="space-y-8">
      {/* Benvenuto */}
      <button
        type="button"
        onClick={() => null}
        aria-label={`Apri ${profile?.username ?? "viandante"} a schermo intero`}
        // testo allienato a destra responsive
        className="relative block w-full overflow-hidden rounded-xl border border-gold/20 px-6 py-10 text-left text-gold/90 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),0_0_24px_rgba(212,175,55,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),0_0_24px_rgba(212,175,55,0.15)] sm:px-10"
        style={frameImageStyle(getAsset("window_04"), "primary", "1.5rem")}
      >
        {/* <FrameCard
        glow
        className="bg-[radial-gradient(ellipse_at_top_left,rgba(212,175,55,0.1),transparent_60%)]"
        contentClassName="p-8 sm:p-10"
      > */}

        <p className="font-heading text-[10px] tracking-[0.4em] text-gold/60 uppercase">
          ◆ Le cronache continuano ◆
        </p>
        <h1 className="text-gold-gradient mt-2 font-heading text-3xl font-bold tracking-wide sm:text-4xl">
          Bentornato, {profile?.username ?? "viandante"}
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground italic">
          {role ? ROLE_GREETINGS[role] : ""}
        </p>
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quest attive */}
        {/* <FrameCard className="lg:col-span-2"> */}
        <button
          type="button"
          onClick={() => null}
          aria-label={`Apri ${profile?.username ?? "viandante"} a schermo intero`}
          className="lg:col-span-2 relative block w-full overflow-hidden rounded-xl border border-gold/20 px-6 py-10 text-left text-gold/90 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),0_0_24px_rgba(212,175,55,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),0_0_24px_rgba(212,175,55,0.15)] sm:px-10"
          style={frameImageStyle(getAsset("window_04"), "primary", "1.5rem")} >
          <WidgetTitle icon={Swords} title="Quest attive" />
          {isLoading ? (
            <WidgetSkeleton rows={3} />
          ) : activeQuests.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent py-10"
              icon={Swords}
              title="Nessuna impresa in corso"
              description="Le bacheche delle taverne sono vuote: il prossimo incarico è dietro l'angolo."
            />
          ) : (
            <ul className="space-y-2">
              {activeQuests.map((quest) => (
                <li key={quest.id}>
                  <Link
                    href={`/entita/${quest.id}`}
                    className="group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-colors hover:border-gold/25 hover:bg-gold/5"
                  >
                    <span className="relative flex size-2.5 shrink-0">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold/50" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-gold" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-heading font-semibold text-foreground group-hover:text-gold-bright">
                        {quest.name}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {richTextToPlainText(quest.description) ||
                          "Le cronache tacciono sui dettagli…"}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-right">
            <Link
              href="/quest"
              className="text-sm font-medium text-gold transition-colors hover:text-gold-bright"
            >
              Tutte le quest →
            </Link>
          </div>
        </button>

        {/* Ultime cronache */}
        <button
          type="button"
          onClick={() => null}
          aria-label={`Apri ${profile?.username ?? "viandante"} a schermo intero`}
          className=""
          style={frameImageStyle(getAsset("window_04"), "primary", "1.5rem")} >
          <WidgetTitle icon={Flame} title="Ultime cronache" />
          {isLoading ? (
            <WidgetSkeleton rows={4} />
          ) : recentEntities.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground italic">
              Le pagine del regno sono ancora bianche.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentEntities.map((entity) => {
                const config = ENTITY_REGISTRY[entity.type];
                const status =
                  entity.type === "quest"
                    ? String(entity.fields.status ?? "")
                    : null;
                const statusLabel = status
                  ? QUEST_STATUS_OPTIONS.find((o) => o.value === status)?.label
                  : null;
                return (
                  <li
                    key={entity.id}
                    className="border-b border-gold/10 pb-3 last:border-0 last:pb-0"
                  >
                    <Link href={`/entita/${entity.id}`} className="group block">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold group-hover:text-gold-bright">
                          {entity.name}
                        </p>
                        <Badge
                          variant="outline"
                          className={`shrink-0 text-[10px] ${statusLabel
                              ? QUEST_STATUS_BADGES[status ?? ""]
                              : config.badgeClass
                            }`}
                        >
                          {statusLabel ?? config.label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Aggiornata il{" "}
                        {formatDate(timestampToDate(entity.updatedAt))}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </button>
      </div>

      {/* Collegamenti rapidi */}
      <section>
        <div className="mb-4 flex items-center gap-4">
          <h2 className="font-heading text-lg font-semibold tracking-wider text-foreground">
            Collegamenti rapidi
          </h2>
          <SectionDivider className="flex-1" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group relative overflow-hidden rounded-xl border border-gold/12 bg-gradient-to-b from-stone-surface to-stone-mid/80 p-5 transition-all duration-200 hover:-translate-y-1 hover:border-gold/40 hover:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.7),0_0_24px_rgba(212,175,55,0.08)]"
              >
                {/* Striscia superiore */}
                <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                <Icon className="size-6 text-gold/60 transition-all group-hover:text-gold group-hover:drop-shadow-[0_0_6px_rgba(212,175,55,0.5)]" />
                <p className="mt-3 font-heading text-[13px] font-semibold text-foreground transition-colors group-hover:text-gold-bright">
                  {link.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {link.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function WidgetTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <Icon className="size-5 text-gold" />
      <h2 className="font-heading text-lg font-semibold tracking-wider">
        {title}
      </h2>
    </div>
  );
}

function WidgetSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full bg-muted/60" />
      ))}
    </div>
  );
}
