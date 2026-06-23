"use client";

import {
  BookMarked,
  Shield,
  Swords
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionDivider } from "@/components/shared/fantasy-card";
import { imageIcon } from "@/components/shared/image-icon";
import { richTextToPlainText } from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { QuestStatusIcon } from "@/features/entities/components/quest-status-icon";
import { useAllEntities } from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  QUEST_STATUS_BADGES,
  QUEST_STATUS_OPTIONS,
} from "@/features/entities/registry";
import { cn, formatDate, timestampToDate } from "@/lib/utils";
import type { Entity } from "@/types/entities";
import type { Role } from "@/types/models";

/* ───────────────────────── ICONS ───────────────────────── */

const WorldIcon = imageIcon("/icons/world.png");
const QuestIcon = imageIcon("/icons/quest.png");
const CrossArmyIcon = imageIcon("/icons/cross_army.png");
const FlameIcon = imageIcon("/icons/flame.png");
const DragonIcon = imageIcon("/icons/dragon_icon.png");
const CrownIcon = imageIcon("/icons/crown.png");
const ActiveIcon = imageIcon("/icons/attiva.png");
const CharactersIcon = imageIcon("/icons/characters.png");
const GateIcon = imageIcon("/icons/gate.png");
const CalamaioIcon = imageIcon("/icons/calamaio.png");
const ShieldIcon = imageIcon("/icons/shield.png");

/* ───────────────────────── ROLES ───────────────────────── */

const ROLE_GREETINGS: Record<Role, string> = {
  ADMIN: "Custode del Regno, le chiavi di Amberland sono nelle tue mani.",
  MASTER: "Tessitore di storie, il regno attende le tue cronache.",
  PLAYER: "Eroe di Amberland, nuove avventure ti chiamano.",
  VISITOR: "Viaggiatore, esplora pure le cronache di Amberland.",
};

const PLACE_TYPES = new Set<Entity["type"]>([
  "world",
  "region",
  "city",
  "location",
]);

/* ───────────────────────── QUICK LINKS ───────────────────────── */

interface QuickLink {
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
}

const QUICK_LINKS: QuickLink[] = [
  { label: "Mondo", description: "Esplora l'atlante", href: "/mondo", icon: WorldIcon },
  { label: "Quest", description: "Le imprese del party", href: "/quest", icon: QuestIcon },
  { label: "Party", description: "I tuoi compagni", href: "/party", icon: DragonIcon },
  { label: "Personaggi", description: "I volti del regno", href: "/personaggi", icon: CharactersIcon },
  { label: "Area Personale", description: "Il tuo tomo privato", href: "/area-personale", icon: CalamaioIcon },
  { label: "Sala del Master", description: "Tessi le cronache", href: "/master", icon: CrownIcon, roles: ["ADMIN", "MASTER"] },
  { label: "Amministrazione", description: "Gestisci gli accessi", href: "/admin", icon: ShieldIcon, roles: ["ADMIN"] },
];

/* ───────────────────────── PAGE ───────────────────────── */

export default function HomePage() {
  const { profile, role } = useAuth();
  const { data: entities, isLoading } = useAllEntities();

  const activeQuests = useMemo(
    () =>
      (entities ?? [])
        .filter((e) => e.type === "quest" && e.fields.status === "ACTIVE")
        .slice(0, 4),
    [entities]
  );

  const recentEntities = useMemo(
    () =>
      [...(entities ?? [])]
        .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
        .slice(0, 5),
    [entities]
  );

  const stats = useMemo(() => {
    const all = entities ?? [];
    return {
      active: all.filter((e) => e.type === "quest" && e.fields.status === "ACTIVE").length,
      characters: all.filter((e) => e.type === "character").length,
      places: all.filter((e) => PLACE_TYPES.has(e.type)).length,
    };
  }, [entities]);

  const visibleLinks = QUICK_LINKS.filter(
    (l) => !l.roles || (role && l.roles.includes(role))
  );

  return (
    <div className="space-y-8">
      {/* ───── HERO ───── */}
      <section className="relative overflow-hidden rounded-2xl border border-gold/20 px-6 py-8 shadow-[0_12px_40px_-14px_rgba(0,0,0,0.8)]">

        <div className="absolute inset-0 bg-[url('/images/bg_party.webp')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-stone-mid/60 to-night/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_60%)]" />
        <span className="fantasy-stripe-top absolute inset-0" />

        <div className="relative flex flex-col lg:flex-row gap-8 lg:items-center lg:justify-between">

          {/* GATE */}
          <div className="flex justify-center lg:justify-start">
            <div className="relative">
              <div className="absolute inset-0 size-44 rounded-full bg-gold/10 blur-2xl" />
              <GateIcon className="relative size-44 text-gold drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]" />
            </div>
          </div>

          {/* TEXT */}
          <div className="flex-1">
            <p className="font-heading text-[10px] tracking-[0.4em] text-gold/60 uppercase">
              ◆ Le cronache continuano ◆
            </p>

            <h1 className="mt-2 font-heading text-3xl sm:text-4xl text-gold-gradient font-bold">
              Bentornato, {profile?.username ?? "viandante"}
            </h1>

            <p className="mt-3 max-w-2xl italic text-muted-foreground">
              {role ? ROLE_GREETINGS[role] : ""}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <StatChip icon={ActiveIcon} value={stats.active} label="in corso" />
              <StatChip icon={CharactersIcon} value={stats.characters} label="personaggi" />
              <StatChip icon={WorldIcon} value={stats.places} label="luoghi" />
            </div>
          </div>
        </div>
      </section>

      {/* ───── PANELS ───── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <HomePanel
          className="lg:col-span-2"
          icon={<CrossArmyIcon className="size-20" />}
          title="Imprese in corso"
          backgroundImage="/images/texture_boxes.webp"
        >
          {isLoading ? (
            <WidgetSkeleton rows={3} />
          ) : activeQuests.length === 0 ? (
            <EmptyState
              className="border-0 bg-transparent py-8"
              icon={Swords}
              title="Nessuna impresa in corso"
              description="Le bacheche sono vuote."
            />
          ) : (
            <ul className="space-y-1.5">
              {activeQuests.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/entita/${q.id}`}
                    className="group flex items-center gap-3 rounded-lg px-2.5 py-2 border border-transparent hover:border-gold/25 hover:bg-gold/5"
                  >
                    <QuestStatusIcon status={String(q.fields.status)} className="size-9" />
                    <div className="min-w-0">
                      <div className="truncate font-heading group-hover:text-gold-bright">
                        {q.name}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {richTextToPlainText(q.description)}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </HomePanel>

        <HomePanel
          icon={<FlameIcon className="size-20" />}
          title="Ultime cronache"
          backgroundImage="/images/texture_boxes.webp"
        >
          {isLoading ? (
            <WidgetSkeleton rows={4} />
          ) : (
            <ul className="space-y-3">
              {recentEntities.map((e) => {
                const cfg = ENTITY_REGISTRY[e.type];
                const Icon = cfg.icon;

                return (
                  <li key={e.id} className="border-b border-gold/10 pb-3">
                    <Link href={`/entita/${e.id}`} className="flex gap-2 group">
                      <Icon className="size-4 text-gold/60 group-hover:text-gold" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm group-hover:text-gold-bright">
                          {e.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Aggiornata {formatDate(timestampToDate(e.updatedAt))}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </HomePanel>
      </div>

      {/* ───── QUICK LINKS ───── */}
      <section>
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-heading text-lg">Collegamenti rapidi</h2>
          <SectionDivider className="flex-1" />
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-7 gap-3">
          {visibleLinks.map((l) => {
            const Icon = l.icon;

            return (
              <Link
                key={l.href}
                href={l.href}
                className="group relative aspect-square rounded-xl border border-gold/10 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-stone-surface/80 via-stone-mid/70 to-night/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_60%)]" />

                <div className="relative flex flex-col items-center justify-center h-full">
                  <Icon className="size-16 text-gold/70 group-hover:text-gold group-hover:scale-110 transition" />
                  <span className="mt-2 text-[10px] tracking-[0.16em] uppercase text-gold-bright/80">
                    {l.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/* ───────────────────────── COMPONENTS ───────────────────────── */

function StatChip({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg border border-gold/20 bg-black/30 px-3 py-1.5">
      <Icon className="size-10 text-gold/70" />
      <strong className="text-gold">{value}</strong>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function HomePanel({
  icon,
  title,
  children,
  className,
  backgroundImage,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
}) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border border-gold/15 p-6 fantasy-stripe-top",
        className
      )}
    >
      {backgroundImage && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      )}

      <div className="absolute inset-0 bg-gradient-to-b from-stone-surface/80 via-stone-mid/70 to-night/90" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_60%)]" />

      <div className="relative">
        <header className="flex items-center gap-2 mb-4">
          <span className="text-gold">{icon}</span>
          <h2 className="font-heading font-bold">{title}</h2>
        </header>

        {children}
      </div>
    </section>
  );
}

function WidgetSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full bg-muted/60" />
      ))}
    </div>
  );
}