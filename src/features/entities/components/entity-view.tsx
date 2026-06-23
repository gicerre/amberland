"use client";

import {
  Eye,
  EyeOff,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  ScrollText,
  Trash2,
  ZoomIn,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { FantasyBreadcrumb } from "@/components/shared/fantasy-breadcrumb";
import {
  CornerOrnaments,
  SectionDivider,
} from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
import { useLightbox } from "@/components/shared/lightbox";
import { RichTextRenderer } from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { FrameCard, FrameOverlay, getAsset } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { CharacterView } from "@/features/characters/components/character-view";
import { PublicCharacterView } from "@/features/characters/components/public-character-view";
import { useEntityPublicCard } from "@/features/characters/data";
import { NoteLinksPanel } from "@/features/party/diary/note-links-panel";
import { cn } from "@/lib/utils";
import type { RichText } from "@/types/entities";

import { CreatureStatusBar } from "./creature-status-bar";
import { EntityDetailBody } from "./entity-detail-body";
import { GeoTrail } from "./geo-trail";
import { QuestStatusBar } from "./quest-status-bar";
import { QuickLinks } from "./quick-links";

import {
  useChildren,
  useEntity,
  useEntityMutations,
  useEntityPrivate,
  useGeoChain,
} from "../data";
import {
  ENTITY_REGISTRY,
  VISIBILITY_BADGES,
  VISIBILITY_LABELS,
  isLockedEntity,
} from "../registry";
import { EntityFormSheet } from "./entity-form-sheet";
import { QuickCreateDialog } from "./quick-create-dialog";
import { RelationPanel } from "./relation-panel";
import { SpecializedEntityCard } from "./specialized-cards";

/** Pagina di dettaglio universale di un'entità. */
export function EntityView({ id }: { id: string }) {
  const router = useRouter();
  const { isMaster } = useAuth();
  const { open: openLightbox } = useLightbox();
  const { data: entity, isLoading } = useEntity(id);

  const { data: chain } = useGeoChain(entity);
  const { data: children, isLoading: childrenLoading } = useChildren(
    entity && ENTITY_REGISTRY[entity.type].childType ? entity.id : undefined
  );
  const { data: privateData } = useEntityPrivate(
    isMaster ? entity?.id : undefined
  );
  const { data: unlockTarget } = useEntity(
    isMaster ? (entity?.unlockAfterId ?? undefined) : undefined
  );

  const { remove, setVisibility } = useEntityMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [childOpen, setChildOpen] = useState(false);

  // Fallback: PC non leggibile (OWNER_ONLY) → prova la card pubblica.
  const { data: publicCard, isLoading: cardLoading } = useEntityPublicCard(
    !isLoading && !entity ? id : undefined
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3 bg-muted/60" />
        <Skeleton className="h-72 w-full rounded-xl bg-muted/60" />
        <Skeleton className="h-40 w-full rounded-xl bg-muted/60" />
      </div>
    );
  }

  if (!entity) {
    if (cardLoading) {
      return <Skeleton className="h-72 w-full rounded-xl bg-muted/60" />;
    }
    if (publicCard) {
      return <PublicCharacterView card={publicCard} />;
    }
    return (
      <EmptyState
        icon={ScrollText}
        title="Pagina strappata dalle cronache"
        description="Questa voce non esiste oppure non ti è ancora stato concesso di leggerla."
        action={
          <Button variant="outline" asChild>
            <Link href="/mondo">Torna all&rsquo;atlante</Link>
          </Button>
        }
      />
    );
  }

  // I personaggi (PC e NPC) hanno una pagina dedicata, ricca di scheda.
  if (entity.type === "character") {
    return <CharacterView entity={entity} />;
  }

  const config = ENTITY_REGISTRY[entity.type];
  const Icon = config.icon;
  const childConfig = config.childType
    ? ENTITY_REGISTRY[config.childType]
    : null;

  // Insieme delle immagini dell'entità per la navigazione nel lightbox
  const allImages = [entity.imageUrl, ...entity.gallery].filter(Boolean);
  const galleryOffset = entity.imageUrl ? 1 : 0;

  type ShortField = { def: (typeof config.fields)[number]; display: string };
  type LongField = { def: (typeof config.fields)[number]; rich: RichText };

  const shortFields: ShortField[] = [];
  const longFields: LongField[] = [];
  for (const def of config.fields) {
    const raw = entity.fields[def.key];
    if (def.kind === "textarea") {
      if (!isEmptyRichText(raw as RichTextValue)) {
        longFields.push({ def, rich: raw as RichText });
      }
      continue;
    }
    if (raw === undefined || raw === "" || raw === null) continue;
    let display: string;
    if (def.kind === "switch") {
      if (!raw) continue;
      display = "Sì";
    } else if (def.kind === "select") {
      display =
        def.options?.find((option) => option.value === raw)?.label ??
        String(raw);
    } else {
      display = String(raw);
    }
    shortFields.push({ def, display });
  }

  const handleDelete = () =>
    remove.mutate(entity, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push(chain?.length ? `/entita/${chain[chain.length - 1].id}` : "/mondo");
      },
    });

  // Tipi con gerarchia geografica (mondo/regione/città/luogo).
  const isGeographic =
    config.parentType !== null || config.childType !== null;

  // Azioni del menu overflow (solo Master): identiche tra barra desktop e
  // menu consolidato mobile — definite una volta sola, RBAC preservato.
  const overflowItems = (
    <>
      {entity.visibility === "PUBLIC" ? (
        <DropdownMenuItem
          onSelect={() =>
            setVisibility.mutate({ entity, visibility: "MASTER_ONLY" })
          }
        >
          <EyeOff className="size-4" />
          Nascondi ai giocatori
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          onSelect={() => setVisibility.mutate({ entity, visibility: "PUBLIC" })}
        >
          <Eye className="size-4" />
          Rivela ai giocatori
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        onSelect={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
        Elimina
      </DropdownMenuItem>
    </>
  );

  return (
    <div className="space-y-6">
      {/* Posizione nel mondo (geografiche) o breadcrumb semplice */}
      {isGeographic ? (
        <GeoTrail chain={chain ?? []} current={entity} />
      ) : (
        <FantasyBreadcrumb
          steps={[
            { label: "Mondo", href: "/mondo" },
            { label: config.plural },
            { label: entity.name, current: true },
          ]}
        />
      )}

      {/* Banner "bloccata" per il Master */}
      {isMaster && isLockedEntity(entity) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-200">
            <Lock className="size-4" />
            Voce bloccata: i giocatori non la vedono.
            {unlockTarget && (
              <span className="text-amber-200/80">
                Da rivelare dopo: «{unlockTarget.name}»
              </span>
            )}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500/50 text-amber-200 hover:bg-amber-500/15"
            onClick={() =>
              setVisibility.mutate({ entity, visibility: "PUBLIC" })
            }
          >
            <Eye className="size-3.5" />
            Rivela ora
          </Button>
        </div>
      )}

      {/* Hero */}
      <header>
        {entity.imageUrl && (
          <button
            type="button"
            onClick={() => openLightbox(allImages, 0, entity.name)}
            aria-label={`Apri ${entity.name} a schermo intero`}
            className="group relative mb-6 block w-full cursor-zoom-in overflow-hidden rounded-xl"
          >
            <FantasyImage
              src={entity.imageUrl}
              alt={entity.name}
              className="h-64 sm:h-80 lg:h-96"
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <CornerOrnaments className="z-30 size-4 border-gold/60" />
            <span className="pointer-events-none absolute right-3 bottom-3 z-30 flex size-9 items-center justify-center rounded-full border border-gold/40 bg-background/70 text-gold opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <ZoomIn className="size-4.5" />
            </span>
            <FrameOverlay asset={getAsset("window_04")} borderWidth="1.5rem" />
          </button>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
                {entity.name}
              </h1>
              <Badge variant="outline" className={cn("mt-1", config.badgeClass)}>
                <Icon className="size-3" />
                {config.label}
              </Badge>
              {isMaster && (
                <Badge
                  variant="outline"
                  className={cn("mt-1", VISIBILITY_BADGES[entity.visibility])}
                >
                  {entity.visibility === "PUBLIC" ? (
                    <Eye className="size-3" />
                  ) : (
                    <EyeOff className="size-3" />
                  )}
                  {VISIBILITY_LABELS[entity.visibility]}
                </Badge>
              )}
            </div>
          </div>

          {isMaster && (
            <div className="flex items-center gap-2">
              {/* ── Desktop (≥sm): barra azioni estesa con etichette ── */}
              <div className="hidden items-center gap-2 sm:flex">
                {childConfig && (
                  <Button variant="outline" onClick={() => setChildOpen(true)}>
                    <Plus className="size-4" />
                    {childConfig.label}
                  </Button>
                )}
                <Button onClick={() => setEditOpen(true)}>
                  <Pencil className="size-4" />
                  <span className="sm:inline hidden">Modifica</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Altre azioni">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {overflowItems}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* ── Mobile (<sm): azione primaria + overflow consolidato ── */}
              <div className="flex items-center gap-2 sm:hidden">
                <Button onClick={() => setEditOpen(true)} className="min-h-11">
                  <Pencil className="size-4" />
                  <span className="sm:inline hidden">Modifica</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-11"
                      aria-label="Altre azioni"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {childConfig && (
                      <DropdownMenuItem onSelect={() => setChildOpen(true)}>
                        <Plus className="size-4" />
                        {childConfig.label}
                      </DropdownMenuItem>
                    )}
                    {childConfig && <DropdownMenuSeparator />}
                    {overflowItems}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Presa in carico (solo quest) */}
      {entity.type === "quest" && <QuestStatusBar entity={entity} />}

      {/* Stato rapido (solo creature) */}
      {entity.type === "creature" && <CreatureStatusBar entity={entity} />}

      {/* Collegamenti rapidi */}
      <QuickLinks entity={entity} />

      {/* Contenuti specifici per tipo di entità */}
      <EntityDetailBody
        entity={entity}
        config={config}
        shortFields={shortFields}
        longFields={longFields}
        isMaster={isMaster}
        onEdit={() => setEditOpen(true)}
      />

      {/* Galleria */}
      {entity.gallery.length > 0 && (
        <section>
          <SectionTitle title="Galleria" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {entity.gallery.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() =>
                  openLightbox(allImages, galleryOffset + index, entity.name)
                }
                className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-lg border border-gold/20 transition-all hover:border-gold/50"
              >
                <Image
                  src={url}
                  alt={`${entity.name} — immagine ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Figli geografici */}
      {childConfig && (
        <section>
          <SectionTitle title={`Contiene · ${childConfig.plural}`} />
          {childrenLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-48 rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : (children ?? []).length === 0 ? (
            <EmptyState
              icon={childConfig.icon}
              title={`Nessuna voce tra: ${childConfig.plural.toLowerCase()}`}
              description="Gli esploratori non hanno ancora riportato nulla da queste terre."
              action={
                isMaster ? (
                  <Button variant="outline" onClick={() => setChildOpen(true)}>
                    <Plus className="size-4" />
                    {`Aggiungi: ${childConfig.label}`}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(children ?? []).map((child) => (
                <SpecializedEntityCard key={child.id} entity={child} showType={false} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Relazioni */}
      <RelationPanel entity={entity} />

      {/* Note collegate */}
      <NoteLinksPanel entity={entity} />

      {/* Area riservata al Master */}
      {isMaster &&
        (!isEmptyRichText(privateData?.masterNotes as RichTextValue) ||
          !isEmptyRichText(privateData?.secrets as RichTextValue)) && (
          <FrameCard color="danger" className="bg-crimson/10" contentClassName="p-5">
            <h2 className="font-heading mb-3 flex items-center gap-2 text-lg font-semibold tracking-wider text-red-200">
              <EyeOff className="size-4.5" />
              Area riservata al Master
            </h2>
            {!isEmptyRichText(privateData?.masterNotes as RichTextValue) && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-red-300/80 uppercase">
                  Note
                </p>
                <RichTextRenderer
                  content={privateData?.masterNotes as RichTextValue}
                  className="text-[15px] leading-relaxed text-foreground/90"
                />
              </div>
            )}
            {!isEmptyRichText(privateData?.secrets as RichTextValue) && (
              <div>
                <p className="mb-1 text-xs font-semibold tracking-[0.2em] text-red-300/80 uppercase">
                  Segreti
                </p>
                <RichTextRenderer
                  content={privateData?.secrets as RichTextValue}
                  className="text-[15px] leading-relaxed text-foreground/90"
                />
              </div>
            )}
          </FrameCard>
        )}

      {/* Dialoghi e drawer */}
      {isMaster && (
        <>
          <EntityFormSheet
            open={editOpen}
            onOpenChange={setEditOpen}
            entity={entity}
          />
          {childConfig && (
            <QuickCreateDialog
              open={childOpen}
              onOpenChange={setChildOpen}
              type={childConfig.type}
              parentId={entity.id}
              stay
            />
          )}
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Eliminare «${entity.name}»?`}
            description="La voce e tutti i suoi collegamenti verranno rimossi per sempre dalle cronache."
            loading={remove.isPending}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <h2 className="font-heading text-xl font-semibold tracking-wider text-foreground">
        {title}
      </h2>
      <SectionDivider className="flex-1" />
    </div>
  );
}
