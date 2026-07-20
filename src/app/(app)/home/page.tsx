"use client";

import { Swords } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { SectionDivider } from "@/components/shared/fantasy-card";
import { imageIcon } from "@/components/shared/image-icon";
import { ListPageHero } from "@/components/shared/list-page-hero";
import { richTextToPlainText } from "@/components/shared/rich-text-utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/features/auth/auth-provider";
import { QuestStatusIcon } from "@/features/entities/components/quest-status-icon";
import { useAllEntities } from "@/features/entities/data";
import { ENTITY_REGISTRY } from "@/features/entities/registry";
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
      {/* ───── HERO immersivo ───── */}
      <ListPageHero
        src="/images/home.webp"
        alt="Bentornato in Amberland"
        accent="var(--gold-bright)"
        eyebrow="◆ Le cronache continuano ◆"
        title={`Bentornato, ${profile?.username ?? "viandante"}`}
        subtitle={role ? ROLE_GREETINGS[role] : undefined}
        actions={
          /* Le tre cifre chiave restano visibili anche su mobile (audit 2.1) */
          <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
            <StatChip icon={ActiveIcon} value={stats.active} label="in corso" />
            <StatChip icon={CharactersIcon} value={stats.characters} label="personaggi" />
            <StatChip icon={WorldIcon} value={stats.places} label="luoghi" />
          </div>
        }
      />

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
                    className="group flex items-center gap-3 rounded-lg px-2.5 py-2 border border-transparent hover:border-hairline-strong hover:bg-gold/5"
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
                  <li key={e.id} className="border-b border-hairline pb-3">
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

        {/* Portali delle sale (V3): max 3 colonne su mobile, label 12px
            leggibili — mai 4 colonne con etichette 10px (audit 2.1). */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {visibleLinks.map((l) => {
            const Icon = l.icon;

            return (
              <Link
                key={l.href}
                href={l.href}
                className="group elev-1 relative aspect-square overflow-hidden rounded-xl border border-hairline bg-surface-1 transition-all hover:elev-2 hover:border-hairline-strong"
              >
                <div className="relative flex h-full flex-col items-center justify-center">
                  <Icon className="size-14 text-muted-foreground transition-colors group-hover:text-gold" />
                  <span className="mt-2 text-xs font-medium text-foreground/85">
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
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-1/80 px-3.5 py-1.5">
      <Icon className="size-5 text-muted-foreground" />
      <strong className="font-heading tabular-nums text-parchment">{value}</strong>
      <span className="text-sm text-muted-foreground">
        {label}
      </span>
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
        "elev-1 relative overflow-hidden rounded-2xl border border-hairline bg-surface-1 p-6",
        className
      )}
    >
      {/* Artwork opzionale sotto uno scrim pieno: mai testo sulla texture */}
      {backgroundImage && (
        <>
          <div
            aria-hidden
            className="absolute inset-0 bg-cover bg-center opacity-25"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-surface-1/70 via-surface-1/85 to-surface-1" />
        </>
      )}

      <div className="relative">
        <header className="flex items-center gap-2 mb-4">
          <span className="text-gold">{icon}</span>
          <h2 className="font-heading font-bold text-parchment">{title}</h2>
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