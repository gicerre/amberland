"use client";

import {
  Eye,
  EyeOff,
  Heart,
  MoreHorizontal,
  Pencil,
  Plus,
  Skull,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  X,
  ZoomIn,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FantasyBreadcrumb } from "@/components/shared/fantasy-breadcrumb";
import { SectionDivider } from "@/components/shared/fantasy-card";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FrameCard, frameImageStyle, getAsset } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { EntityTypeBanner } from "@/features/entities/components/entity-type-banner";
import { QuickLinks } from "@/features/entities/components/quick-links";
import { RelationPanel } from "@/features/entities/components/relation-panel";
import { NoteLinksPanel } from "@/features/party/diary/note-links-panel";
import {
  useEntityMutations,
  useEntityPrivate,
} from "@/features/entities/data";
import { VISIBILITY_BADGES, VISIBILITY_LABELS } from "@/features/entities/registry";
import { cn } from "@/lib/utils";
import {
  CHARACTER_HISTORY_TYPES,
  CHARACTER_STATUSES,
  type CharacterHistoryType,
  type CharacterKind,
  type CharacterStatus,
  type Entity,
} from "@/types/entities";

import {
  CHARACTER_KIND_BADGES,
  CHARACTER_KIND_LABELS,
  CHARACTER_STATUS_BADGES,
  CHARACTER_STATUS_LABELS,
  HISTORY_TYPE_LABELS,
  NPC_TYPE_LABELS,
} from "../constants";
import { makeHistoryEntry, useCharacterMutations } from "../data";
import { CharacterFormSheet } from "./character-form-sheet";
import { CharacterSheetDisplay } from "./sheet-display";

/** Pagina di dettaglio dedicata di un personaggio (PC o NPC). */
export function CharacterView({ entity }: { entity: Entity }) {
  const router = useRouter();
  const { isMaster, user } = useAuth();
  const { open: openLightbox } = useLightbox();

  const { remove, setVisibility } = useEntityMutations();
  const { setStatus, convertToFull, setPartyMember } = useCharacterMutations();
  const { data: privateData } = useEntityPrivate(
    isMaster ? entity.id : undefined
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isOwner = Boolean(entity.ownerId && entity.ownerId === user?.uid);
  const canEdit = isMaster || isOwner;

  const kind = (entity.fields.kind as CharacterKind) ?? "NPC";
  const isPC = kind === "PC";
  const status = (entity.fields.status as CharacterStatus) ?? "ALIVE";
  const isDead = entity.fields.isDead === true;
  const npcComplete = entity.fields.npcComplete === true;
  const ownerName = String(entity.fields.ownerName ?? "");

  // La scheda: per i PC sul doc, per gli NPC nei dati riservati (master).
  const sheet = isPC ? entity.sheet : privateData?.reservedSheet;

  // Razza/classe: pubbliche dai campi; per gli NPC nascosti il Master le
  // vede comunque dai dati riservati.
  const race =
    String(entity.fields.race ?? "") ||
    (isMaster ? (privateData?.reservedRace ?? "") : "");
  const klass =
    String(entity.fields.class ?? "") ||
    (isMaster ? (privateData?.reservedClass ?? "") : "");
  const level = entity.fields.level;
  const alignment = String(entity.fields.alignment ?? "");

  const tokenUrl = sheet?.tokenUrl ?? "";
  const altPortraits = sheet?.altPortraits ?? [];
  const appearanceImages = [tokenUrl, ...altPortraits].filter(Boolean);
  const allImages = [
    entity.imageUrl,
    ...entity.gallery,
    ...appearanceImages,
  ].filter(Boolean);
  const galleryOffset = entity.imageUrl ? 1 : 0;
  const appearanceOffset =
    (entity.imageUrl ? 1 : 0) + entity.gallery.length;

  const stats = [
    { label: "Tipo", value: CHARACTER_KIND_LABELS[kind] },
    { label: "Razza", value: race },
    {
      label: "Classe",
      value: klass && level ? `${klass} ${level}` : klass,
    },
    { label: "Allineamento", value: alignment },
    isMaster || isOwner ? { label: "Proprietario", value: ownerName } : null,
  ].filter(
    (item): item is { label: string; value: string } =>
      item !== null && Boolean(item.value)
  );

  const handleDelete = () =>
    remove.mutate(entity, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push("/personaggi");
      },
    });

  return (
    <div className="space-y-6">
      {/* Banner identificativo della tipologia */}
      <EntityTypeBanner entity={entity} />

      {/* Breadcrumb */}
      <FantasyBreadcrumb
        steps={[
          { label: "Mondo", href: "/mondo" },
          {
            label: kind === "PC" ? "Party" : "Personaggi",
            href: kind === "PC" ? "/party" : "/personaggi",
          },
          { label: entity.name, current: true },
        ]}
      />

      {/* Hero */}
      <header>
        {entity.imageUrl && (
          <button
            type="button"
            onClick={() => openLightbox(allImages, 0, entity.name)}
            aria-label={`Apri ${entity.name} a schermo intero`}
            className="group relative mb-6 block w-full cursor-zoom-in"
            style={frameImageStyle(getAsset("window_08"), "primary", "1.5rem")}
          >
            <FantasyImage
              src={entity.imageUrl}
              alt={entity.name}
              className={cn("h-64 sm:h-80 lg:h-96", isDead && "grayscale")}
              sizes="(max-width: 1024px) 100vw, 896px"
              priority
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
            <span className="pointer-events-none absolute right-3 bottom-3 z-10 flex size-9 items-center justify-center rounded-full border border-gold/40 bg-background/70 text-gold opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <ZoomIn className="size-4.5" />
            </span>
          </button>
        )}

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
                {entity.name}
              </h1>
              {isDead && <Skull className="size-6 text-red-400" />}
            </div>
            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={CHARACTER_KIND_BADGES[kind]}>
                {CHARACTER_KIND_LABELS[kind]}
              </Badge>
              <Badge
                variant="outline"
                className={CHARACTER_STATUS_BADGES[status]}
              >
                {CHARACTER_STATUS_LABELS[status]}
              </Badge>
              {kind === "NPC" && !npcComplete && (
                <Badge
                  variant="outline"
                  className="border-zinc-500/50 bg-zinc-500/10 text-zinc-300"
                >
                  {NPC_TYPE_LABELS.SIMPLE}
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
              {kind === "NPC" && !npcComplete && isMaster && (
                <Button
                  variant="outline"
                  onClick={() => convertToFull.mutate(entity)}
                  disabled={convertToFull.isPending}
                >
                  <Sparkles className="size-4" />
                  Completa scheda
                </Button>
              )}

              {/* Stato rapido */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Heart className="size-4" />
                    Stato
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Imposta stato</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {CHARACTER_STATUSES.map((value) => (
                    <DropdownMenuItem
                      key={value}
                      onSelect={() =>
                        setStatus.mutate({ entity, status: value })
                      }
                    >
                      {value === "DEAD" && <Skull className="size-4" />}
                      {CHARACTER_STATUS_LABELS[value]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Modifica
              </Button>

              {isMaster && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Altre azioni"
                    >
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {entity.visibility === "PUBLIC" ? (
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
                          setVisibility.mutate({
                            entity,
                            visibility: "PUBLIC",
                          })
                        }
                      >
                        <Eye className="size-4" />
                        Rivela ai giocatori
                      </DropdownMenuItem>
                    )}
                    {isPC && (
                      <DropdownMenuItem
                        onSelect={() =>
                          setPartyMember.mutate({
                            entity,
                            member: entity.fields.partyMember !== true,
                          })
                        }
                      >
                        <Users className="size-4" />
                        {entity.fields.partyMember === true
                          ? "Rimuovi dal party"
                          : "Aggiungi al party"}
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
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Collegamenti rapidi */}
      <QuickLinks entity={entity} />

      {/* Statistiche identità */}
      {stats.length > 0 && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-gold/15 bg-card/60 px-4 py-3"
            >
              <dt className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                {stat.label}
              </dt>
              <dd className="mt-1 font-heading font-semibold text-gold-bright">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* Descrizione */}
      {!isEmptyRichText(entity.description as RichTextValue) ? (
        <div className="parchment rounded-xl p-6 sm:p-8">
          <RichTextRenderer
            content={entity.description as RichTextValue}
            className="text-base leading-relaxed sm:text-lg"
          />
        </div>
      ) : (
        canEdit && (
          <div className="rounded-xl border border-dashed border-gold/20 p-6 text-center text-sm text-muted-foreground">
            Nessuna descrizione.{" "}
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="text-gold underline-offset-2 hover:underline"
            >
              Scrivila ora
            </button>
            .
          </div>
        )
      )}

      {/* Scheda D&D completa (PC: dal doc; NPC: riservata, solo Master) */}
      {sheet && (
        <CharacterSheetDisplay
          sheet={sheet}
          ownerName={String(entity.fields.ownerName ?? "")}
        />
      )}

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

      {/* Token e ritratti alternativi */}
      {appearanceImages.length > 0 && (
        <section>
          <SectionTitle title="Token e ritratti" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {appearanceImages.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() =>
                  openLightbox(allImages, appearanceOffset + index, entity.name)
                }
                className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-gold/20 transition-all hover:border-gold/50"
              >
                <Image
                  src={url}
                  alt={`${entity.name} — ritratto ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 16vw"
                  className="object-cover transition-transform group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Relazioni con il mondo */}
      <RelationPanel entity={entity} />

      {/* Note collegate */}
      <NoteLinksPanel entity={entity} />

      {/* Storico / progressione */}
      <HistorySection entity={entity} canEdit={canEdit} />

      {/* Area riservata al Master */}
      {isMaster &&
        (!isEmptyRichText(privateData?.masterNotes as RichTextValue) ||
          !isEmptyRichText(privateData?.secrets as RichTextValue)) && (
          <FrameCard color="danger" className="bg-crimson/10" contentClassName="p-5">
            <h2 className="font-heading mb-3 flex items-center gap-2 text-lg font-semibold tracking-wider text-red-200">
              <UserCog className="size-4.5" />
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

      {/* Editor + conferma eliminazione */}
      {canEdit && (
        <CharacterFormSheet
          open={editOpen}
          onOpenChange={setEditOpen}
          entity={entity}
        />
      )}
      {isMaster && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={`Eliminare «${entity.name}»?`}
          description="Il personaggio e tutti i suoi collegamenti verranno rimossi per sempre dalle cronache."
          loading={remove.isPending}
          onConfirm={handleDelete}
        />
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

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleDateString("it-IT", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

/** Timeline di progressione con aggiunta/rimozione voci (canEdit). */
function HistorySection({
  entity,
  canEdit,
}: {
  entity: Entity;
  canEdit: boolean;
}) {
  const { appendHistory, removeHistory } = useCharacterMutations();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<CharacterHistoryType>("NOTE");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  const history = [...(entity.history ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  const submit = () => {
    if (title.trim().length < 2) return;
    appendHistory.mutate(
      { entity, entry: makeHistoryEntry(type, title, detail) },
      {
        onSuccess: () => {
          setTitle("");
          setDetail("");
          setType("NOTE");
          setAdding(false);
        },
      }
    );
  };

  if (history.length === 0 && !canEdit) return null;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <SectionTitle title="Storico" />
        {canEdit && !adding && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" />
            Voce
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-4 space-y-3 rounded-xl border border-gold/20 bg-night/30 p-4">
          <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
            <Select
              value={type}
              onValueChange={(value) => setType(value as CharacterHistoryType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHARACTER_HISTORY_TYPES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {HISTORY_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titolo della voce"
            />
          </div>
          <Textarea
            value={detail}
            onChange={(event) => setDetail(event.target.value)}
            placeholder="Dettagli (facoltativo)"
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>
              Annulla
            </Button>
            <Button size="sm" onClick={submit} disabled={appendHistory.isPending}>
              Aggiungi
            </Button>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">
          Nessun evento registrato.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-gold/20 pl-5">
          {history.map((item) => (
            <li key={item.id} className="group relative">
              <span className="absolute top-1.5 -left-[1.45rem] size-2.5 rounded-full border border-gold/50 bg-night" />
              <div className="rounded-lg border border-gold/15 bg-card/60 px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading text-sm font-semibold text-gold-bright">
                    {item.title}
                  </span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {formatDate(item.date)} · {HISTORY_TYPE_LABELS[item.type]}
                    {canEdit && (
                      <button
                        type="button"
                        aria-label="Rimuovi voce"
                        onClick={() =>
                          removeHistory.mutate({ entity, entryId: item.id })
                        }
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </span>
                </div>
                {item.detail && (
                  <p className="mt-1 text-sm whitespace-pre-line text-foreground/90">
                    {item.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
