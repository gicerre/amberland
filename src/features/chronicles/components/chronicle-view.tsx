"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  Eye,
  EyeOff,
  History,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FantasyBreadcrumb } from "@/components/shared/fantasy-breadcrumb";
import { ImmersiveHero } from "@/components/shared/immersive-hero";
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
import { KeyValueGrid, TomeDisclosure, TomePanel } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { RelationPanel } from "@/features/entities/components/relation-panel";
import {
  useEntity,
  useEntityMutations,
} from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  VISIBILITY_BADGES,
  VISIBILITY_LABELS,
} from "@/features/entities/registry";
import { NoteLinksPanel } from "@/features/party/diary/note-links-panel";
import { cn } from "@/lib/utils";
import type { Entity } from "@/types/entities";

import { chronicleDateLabel } from "../calendar";
import {
  CANON_BADGES,
  CHRONICLE_CATEGORY_META,
  CHRONICLE_LOG_LABELS,
  DRAFT_BADGE,
} from "../constants";
import {
  useArcs,
  useChronicleLog,
  useChronicleMutations,
  useChronicles,
} from "../data";
import { ChronicleEditor } from "./chronicle-editor";

/**
 * Pagina di lettura di un capitolo del Libro delle Cronache:
 * frontespizio, prosa su carta chiara in Caudex, targa dei metadati,
 * entità citate e navigazione capitolo precedente/successivo.
 */
export function ChronicleView({ entity }: { entity: Entity }) {
  const router = useRouter();
  const { isMaster, user } = useAuth();
  const { open: openLightbox } = useLightbox();

  const data = entity.chronicle;
  const category = data ? CHRONICLE_CATEGORY_META[data.category] : null;
  const CategoryIcon = category?.icon;
  const config = ENTITY_REGISTRY.chronicle;

  const { data: chronicles } = useChronicles();
  const { data: arcs } = useArcs();
  const { data: session } = useEntity(data?.sessionId ?? undefined);
  const { data: log } = useChronicleLog(entity.id);

  const { remove, setVisibility } = useEntityMutations();
  const { canonize } = useChronicleMutations();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canEdit = isMaster || (entity.ownerId != null && entity.ownerId === user?.uid);

  const { previous, next } = useMemo(() => {
    const list = chronicles ?? [];
    const index = list.findIndex((candidate) => candidate.id === entity.id);
    return {
      previous: index > 0 ? list[index - 1] : null,
      next: index >= 0 && index < list.length - 1 ? list[index + 1] : null,
    };
  }, [chronicles, entity.id]);

  const arc = data?.arcId
    ? (arcs ?? []).find((candidate) => candidate.id === data.arcId)
    : undefined;

  const dateLabel = chronicleDateLabel(entity);
  const allImages = [entity.imageUrl, ...entity.gallery].filter(Boolean);
  const galleryOffset = entity.imageUrl ? 1 : 0;

  const metaItems = [
    dateLabel ? { label: "Data", value: dateLabel } : null,
    category ? { label: "Categoria", value: category.label } : null,
    arc ? { label: "Arco narrativo", value: arc.name } : null,
    session
      ? {
          label: "Sessione",
          value: (
            <Link
              href={`/entita/${session.id}`}
              className="underline-offset-4 hover:text-gold-bright hover:underline"
            >
              {session.name}
            </Link>
          ),
        }
      : null,
    data?.authorInWorld
      ? { label: "Autore", value: data.authorInWorld }
      : null,
  ].filter(Boolean) as { label: string; value: React.ReactNode }[];

  const needsAttention = Boolean(data?.draft || data?.canonStatus === "PROPOSED");

  const handleDelete = () =>
    remove.mutate(entity, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push("/cronache");
      },
    });

  return (
    <div className="space-y-6">
      {/* Copertina a piena larghezza (come le altre pagine entità) */}
      <div className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]">
        <ImmersiveHero
          src={entity.imageUrl}
          alt={entity.name}
          accent={category?.accent ?? config.accent}
          priority
          className="rounded-none border-0"
          onOpen={
            allImages.length
              ? () => openLightbox(allImages, 0, entity.name)
              : undefined
          }
        />
      </div>

      <FantasyBreadcrumb
        steps={[
          { label: "Cronache", href: "/cronache" },
          { label: entity.name, current: true },
        ]}
      />

      {/* Barra di canonizzazione (Master, per bozze e proposte) */}
      {isMaster && needsAttention && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-amber-200">
            <BookOpenCheck className="size-4" />
            {data?.draft
              ? "Bozza generata automaticamente: rifiniscila e consegnala alla storia."
              : "Proposta di un giocatore: in attesa del tuo sigillo."}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500/50 text-amber-200 hover:bg-amber-500/15"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-3.5" />
              Rifinisci
            </Button>
            <Button
              size="sm"
              onClick={() =>
                canonize.mutate({
                  entity,
                  makePublic: entity.visibility === "MASTER_ONLY",
                })
              }
              disabled={canonize.isPending}
            >
              <BookOpenCheck className="size-3.5" />
              Canonizza
            </Button>
          </div>
        </div>
      )}

      {/* Frontespizio */}
      <header className="space-y-3">
        <p className="font-heading text-[10px] font-bold tracking-[0.3em] text-gold/70 uppercase">
          ◆ {category?.label ?? "Cronaca"}
          {dateLabel ? ` · ${dateLabel}` : ""} ◆
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
              {entity.name}
            </h1>
            {data?.subtitle && (
              <p className="font-lore mt-2 text-lg text-muted-foreground italic">
                {data.subtitle}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {data?.authorInWorld && (
                <span className="text-sm text-muted-foreground">
                  di{" "}
                  <span className="font-lore text-foreground/90 italic">
                    {data.authorInWorld}
                  </span>
                </span>
              )}
              {data?.draft && (
                <Badge variant="outline" className={DRAFT_BADGE.className}>
                  {DRAFT_BADGE.label}
                </Badge>
              )}
              {!data?.draft && data?.canonStatus === "PROPOSED" && (
                <Badge
                  variant="outline"
                  className={CANON_BADGES.PROPOSED.className}
                >
                  {CANON_BADGES.PROPOSED.label}
                </Badge>
              )}
              {isMaster && (
                <Badge
                  variant="outline"
                  className={VISIBILITY_BADGES[entity.visibility]}
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

          {canEdit && (
            <div className="flex items-center gap-2">
              <Button onClick={() => setEditOpen(true)} className="min-h-11">
                <Pencil className="size-4" />
                <span className="hidden sm:inline">Modifica</span>
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
                  {isMaster &&
                    (entity.visibility === "PUBLIC" ? (
                      <DropdownMenuItem
                        onSelect={() =>
                          setVisibility.mutate({
                            entity,
                            visibility: "MASTER_ONLY",
                          })
                        }
                      >
                        <EyeOff className="size-4" />
                        Nascondi ai giocatori
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onSelect={() =>
                          setVisibility.mutate({ entity, visibility: "PUBLIC" })
                        }
                      >
                        <Eye className="size-4" />
                        Rivela ai giocatori
                      </DropdownMenuItem>
                    ))}
                  {isMaster && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="size-4" />
                    Elimina
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </header>

      {/* Targa dei metadati */}
      {metaItems.length > 0 && (
        <TomePanel title="Nel Libro" icon={CategoryIcon ?? undefined}>
          <KeyValueGrid items={metaItems} />
        </TomePanel>
      )}

      {/* Prosa del capitolo, su carta chiara in Caudex */}
      {!isEmptyRichText(entity.description as RichTextValue) && (
        <section className="parchment relative overflow-hidden rounded-2xl p-5 sm:p-8">
          <p className="mb-3 font-heading text-[9px] font-bold tracking-[0.3em] text-[#7a5c1e] uppercase">
            ◆ Così fu scritto ◆
          </p>
          <RichTextRenderer
            content={entity.description as RichTextValue}
            className="font-lore text-base leading-relaxed sm:text-lg"
          />
        </section>
      )}

      {/* Galleria */}
      {entity.gallery.length > 0 && (
        <section>
          <h2 className="font-heading mb-4 text-xl font-semibold tracking-wider text-foreground">
            Galleria
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {entity.gallery.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() =>
                  openLightbox(allImages, galleryOffset + index, entity.name)
                }
                className="group relative aspect-video cursor-zoom-in overflow-hidden rounded-lg border border-hairline-strong transition-all hover:border-gold/50"
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

      {/* Entità citate e note collegate */}
      <RelationPanel entity={entity} />
      <NoteLinksPanel entity={entity} />

      {/* Cronologia del capitolo */}
      {(log ?? []).length > 0 && (
        <TomeDisclosure
          title="Cronologia del capitolo"
          icon={History}
          count={(log ?? []).length}
        >
          <ol className="space-y-2">
            {(log ?? []).map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-2 text-sm"
              >
                <span className="text-foreground/90">
                  {CHRONICLE_LOG_LABELS[entry.action] ?? entry.action}
                </span>
                {entry.detail && (
                  <span className="text-muted-foreground">{entry.detail}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  — {entry.byName || "sconosciuto"}
                  {entry.createdAt
                    ? `, ${entry.createdAt.toDate().toLocaleDateString("it-IT")}`
                    : ""}
                </span>
              </li>
            ))}
          </ol>
        </TomeDisclosure>
      )}

      {/* Lettura continua: capitolo precedente / successivo */}
      {(previous || next) && (
        <nav
          aria-label="Navigazione dei capitoli"
          className="grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <ChapterStep entity={previous} direction="previous" />
          ) : (
            <span aria-hidden />
          )}
          {next && <ChapterStep entity={next} direction="next" />}
        </nav>
      )}

      {/* Dialoghi */}
      {canEdit && (
        <>
          <ChronicleEditor
            open={editOpen}
            onOpenChange={setEditOpen}
            entity={entity}
          />
          <ConfirmDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title={`Strappare «${entity.name}» dal Libro?`}
            description="Il capitolo e tutti i suoi collegamenti verranno rimossi per sempre."
            loading={remove.isPending}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}

function ChapterStep({
  entity,
  direction,
}: {
  entity: Entity;
  direction: "previous" | "next";
}) {
  const dateLabel = chronicleDateLabel(entity);
  const isNext = direction === "next";
  return (
    <Link
      href={`/entita/${entity.id}`}
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-hairline bg-card/60 p-4 transition-colors hover:border-gold/45 hover:bg-gold/[0.05]",
        isNext && "sm:flex-row-reverse sm:text-right"
      )}
    >
      {isNext ? (
        <ArrowRight className="size-4 shrink-0 text-gold/60 transition-transform group-hover:translate-x-0.5" />
      ) : (
        <ArrowLeft className="size-4 shrink-0 text-gold/60 transition-transform group-hover:-translate-x-0.5" />
      )}
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          {isNext ? "Capitolo successivo" : "Capitolo precedente"}
        </span>
        <span className="font-heading block truncate text-sm text-foreground group-hover:text-gold-bright">
          {entity.name}
        </span>
        {dateLabel && (
          <span className="block truncate text-xs text-muted-foreground">
            {dateLabel}
          </span>
        )}
      </span>
    </Link>
  );
}
