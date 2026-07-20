"use client";

import {
  BookText,
  Eye,
  EyeOff,
  Heart,
  Images,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  ScrollText,
  Skull,
  Sparkles,
  Trash2,
  User,
  UserCog,
  Users,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
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
import { FrameCard } from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { QuickLinks } from "@/features/entities/components/quick-links";
import { RelationPanel } from "@/features/entities/components/relation-panel";
import { NoteLinksPanel } from "@/features/party/diary/note-links-panel";
import {
  useEntityMutations,
  useEntityPrivate,
} from "@/features/entities/data";
import {
  ENTITY_REGISTRY,
  VISIBILITY_BADGES,
  VISIBILITY_LABELS,
} from "@/features/entities/registry";
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
import {
  AbilityMedallions,
  BiographyTome,
  ClassesRow,
  CombatPanel,
  CompanionsSection,
  HpBar,
  IdentityDetails,
  InventoryDisplay,
  MagicDisplay,
  QuickStats,
  SheetHeading,
  SkillsPanel,
  sheetHasBio,
  sheetHasInventory,
  sheetHasMagic,
} from "./sheet-display";

type TabId = "panoramica" | "inventario" | "magie" | "biografia" | "galleria";

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
  const [tab, setTab] = useState<TabId>("panoramica");

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

  const race =
    String(entity.fields.race ?? "") ||
    (isMaster ? (privateData?.reservedRace ?? "") : "");
  const klass =
    String(entity.fields.class ?? "") ||
    (isMaster ? (privateData?.reservedClass ?? "") : "");
  const level = Number(entity.fields.level ?? 0);
  const alignment = String(entity.fields.alignment ?? "");

  const totalLevel = sheet
    ? sheet.classes.reduce((sum, entry) => sum + (entry.level || 0), 0) || level
    : level;

  const tokenUrl = sheet?.tokenUrl ?? "";
  const altPortraits = sheet?.altPortraits ?? [];
  const appearanceImages = [tokenUrl, ...altPortraits].filter(Boolean);
  const allImages = [
    entity.imageUrl,
    ...entity.gallery,
    ...appearanceImages,
  ].filter(Boolean);
  const galleryOffset = entity.imageUrl ? 1 : 0;
  const appearanceOffset = (entity.imageUrl ? 1 : 0) + entity.gallery.length;

  // Fatti d'identità (chip nell'Hero).
  const facts = [
    race && { label: "Razza", value: race },
    klass && {
      label: "Classe",
      value: totalLevel ? `${klass} ${totalLevel}` : klass,
    },
    alignment && { label: "Allineamento", value: alignment },
    sheet?.background && { label: "Background", value: sheet.background },
    (isMaster || isOwner) && ownerName
      ? { label: "Giocatore", value: ownerName }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasGallery = entity.gallery.length > 0 || appearanceImages.length > 0;
  const hasMasterArea =
    isMaster &&
    (!isEmptyRichText(privateData?.masterNotes as RichTextValue) ||
      !isEmptyRichText(privateData?.secrets as RichTextValue));
  const hasHistory = (entity.history?.length ?? 0) > 0 || canEdit;
  const hasBioTab =
    (sheet ? sheetHasBio(sheet) : false) || hasHistory || hasMasterArea;

  // Tab disponibili in base ai contenuti reali.
  const tabs = useMemo(() => {
    const list: { id: TabId; label: string; icon: LucideIcon }[] = [
      { id: "panoramica", label: "Panoramica", icon: ScrollText },
    ];
    if (sheet && sheetHasInventory(sheet))
      list.push({ id: "inventario", label: "Inventario", icon: Package });
    if (sheet && sheetHasMagic(sheet))
      list.push({ id: "magie", label: "Magie", icon: Wand2 });
    if (hasBioTab)
      list.push({ id: "biografia", label: "Biografia", icon: BookText });
    if (hasGallery)
      list.push({ id: "galleria", label: "Galleria", icon: Images });
    return list;
  }, [sheet, hasBioTab, hasGallery]);

  const activeTab = tabs.some((t) => t.id === tab) ? tab : "panoramica";

  const handleDelete = () =>
    remove.mutate(entity, {
      onSuccess: () => {
        setDeleteOpen(false);
        router.push("/personaggi");
      },
    });

  const statusItems = CHARACTER_STATUSES.map((value) => (
    <DropdownMenuItem
      key={value}
      onSelect={() => setStatus.mutate({ entity, status: value })}
    >
      {value === "DEAD" && <Skull className="size-4" />}
      {CHARACTER_STATUS_LABELS[value]}
    </DropdownMenuItem>
  ));

  const adminItems = isMaster ? (
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
      <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
        <Trash2 className="size-4" />
        Elimina
      </DropdownMenuItem>
    </>
  ) : null;

  const actions = canEdit ? (
    <div className="flex shrink-0 items-center gap-2">
      {kind === "NPC" && !npcComplete && isMaster && (
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={() => convertToFull.mutate(entity)}
          disabled={convertToFull.isPending}
        >
          <Sparkles className="size-4" />
          Completa scheda
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="hidden sm:inline-flex">
            <Heart className="size-4" />
            Stato
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Imposta stato</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {statusItems}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button size="sm" onClick={() => setEditOpen(true)}>
        <Pencil className="size-4" />
        <span className="hidden sm:inline">Modifica</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" aria-label="Altre azioni">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {kind === "NPC" && !npcComplete && isMaster && (
            <DropdownMenuItem
              onSelect={() => convertToFull.mutate(entity)}
              disabled={convertToFull.isPending}
            >
              <Sparkles className="size-4" />
              Completa scheda
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Heart className="size-4" />
              Stato
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>{statusItems}</DropdownMenuSubContent>
          </DropdownMenuSub>
          {adminItems && <DropdownMenuSeparator />}
          {adminItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null;

  return (
    <div className="space-y-5">
      {/* ════════ HERO — ritratto a banner pieno, in cima ════════ */}
      <div className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]">
        <ImmersiveHero
          src={entity.imageUrl}
          alt={entity.name}
          accent={ENTITY_REGISTRY.character.accent}
          fallen={isDead}
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
          { label: "Mondo", href: "/mondo" },
          {
            label: kind === "PC" ? "Party" : "Personaggi",
            href: kind === "PC" ? "/party" : "/personaggi",
          },
          { label: entity.name, current: true },
        ]}
      />

      {/* Intestazione: nome, livello e sigilli (estratti dal ritratto) + azioni */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-gold-gradient flex items-center gap-2 font-heading text-3xl font-bold tracking-wider sm:text-4xl">
            {entity.name}
            {isDead && <Skull className="size-6 text-red-400" />}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {totalLevel > 0 && (
              <Badge
                variant="outline"
                className="border-gold/40 bg-gold/15 font-heading text-gold-bright"
              >
                Livello {totalLevel}
              </Badge>
            )}
            <HeroBadges
              kind={kind}
              status={status}
              npcComplete={npcComplete}
              isMaster={isMaster}
              visibility={entity.visibility}
            />
          </div>
        </div>
        {actions}
      </header>

      {/* Striscia d'identità: fatti + HP */}
      <div className="rounded-2xl border border-hairline bg-gradient-to-b from-stone-surface to-stone-mid/80 p-4 shadow-[0_8px_30px_-14px_rgba(0,0,0,0.7)] sm:p-5">
        {facts.length > 0 ? (
          <div className="flex min-w-0 flex-wrap gap-2">
            {facts.map((fact) => (
              <span
                key={fact.label}
                className="inline-flex items-baseline gap-1.5 rounded-lg border border-hairline bg-night/40 px-3 py-1.5"
              >
                <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  {fact.label}
                </span>
                <span className="font-heading text-sm font-semibold text-gold-bright">
                  {fact.value}
                </span>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Nessun dettaglio d&rsquo;identità ancora registrato.
          </p>
        )}

        {sheet && (sheet.maxHp > 0 || sheet.currentHp > 0) && (
          <div className="mt-4">
            <HpBar
              current={sheet.currentHp}
              max={sheet.maxHp}
              temp={sheet.tempHp}
            />
          </div>
        )}
      </div>

      {/* Collegamenti rapidi */}
      <QuickLinks entity={entity} />

      {/* ════════ QUICK STATS (sotto l'Hero, sempre visibili) ════════ */}
      {sheet && <QuickStats sheet={sheet} />}

      {/* ════════ TABS sticky ════════ */}
      {tabs.length > 1 && (
        <div className="sticky top-12 z-30 -mx-1 rounded-xl border border-hairline bg-stone-mid px-1.5 py-1.5 sm:top-13 lg:top-2">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const isActive = t.id === activeTab;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={isActive}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-all",
                    isActive
                      ? "bg-gradient-to-b from-gold/25 to-gold/10 text-gold-bright shadow-[inset_0_1px_0_rgba(212,175,55,0.25)]"
                      : "text-muted-foreground hover:bg-gold/5 hover:text-foreground"
                  )}
                >
                  <Icon className="size-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ════════ TAB: PANORAMICA ════════ */}
      {activeTab === "panoramica" && (
        <div className="animate-[console-page-in_260ms_ease-out_both] space-y-6">
          {!isEmptyRichText(entity.description as RichTextValue) ? (
            <div className="parchment rounded-xl p-5 sm:p-7">
              <RichTextRenderer
                content={entity.description as RichTextValue}
                className="text-base leading-relaxed sm:text-lg"
              />
            </div>
          ) : (
            canEdit && (
              <div className="rounded-xl border border-dashed border-hairline-strong p-6 text-center text-sm text-muted-foreground">
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

          {sheet && (
            <>
              <AbilityMedallions sheet={sheet} />
              <CombatPanel sheet={sheet} />
              {sheet.classes.length > 1 && (
                <section>
                  <SheetHeading icon={Sparkles} title="Classi" />
                  <ClassesRow sheet={sheet} />
                </section>
              )}
              <SkillsPanel sheet={sheet} />
              <CompanionsSection sheet={sheet} ownerName={ownerName} />
            </>
          )}

          <RelationPanel entity={entity} />
          <NoteLinksPanel entity={entity} />
        </div>
      )}

      {/* ════════ TAB: INVENTARIO ════════ */}
      {activeTab === "inventario" && sheet && (
        <div className="animate-[console-page-in_260ms_ease-out_both]">
          <InventoryDisplay sheet={sheet} />
        </div>
      )}

      {/* ════════ TAB: MAGIE ════════ */}
      {activeTab === "magie" && sheet && (
        <div className="animate-[console-page-in_260ms_ease-out_both]">
          <MagicDisplay sheet={sheet} />
        </div>
      )}

      {/* ════════ TAB: BIOGRAFIA ════════ */}
      {activeTab === "biografia" && (
        <div className="animate-[console-page-in_260ms_ease-out_both] space-y-6">
          {sheet && (
            <>
              <IdentityDetails sheet={sheet} />
              <BiographyTome sheet={sheet} />
            </>
          )}
          <HistorySection entity={entity} canEdit={canEdit} />
          {hasMasterArea && (
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
        </div>
      )}

      {/* ════════ TAB: GALLERIA ════════ */}
      {activeTab === "galleria" && (
        <div className="animate-[console-page-in_260ms_ease-out_both] space-y-6">
          {entity.gallery.length > 0 && (
            <section>
              <SheetHeading icon={Images} title="Galleria" />
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

          {appearanceImages.length > 0 && (
            <section>
              <SheetHeading icon={User} title="Token e ritratti" />
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                {appearanceImages.map((url, index) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() =>
                      openLightbox(
                        allImages,
                        appearanceOffset + index,
                        entity.name
                      )
                    }
                    className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-hairline-strong transition-all hover:border-gold/50"
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
        </div>
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

/* ── Sigilli (badge) dell'Hero ─────────────────────────────────────── */

function HeroBadges({
  kind,
  status,
  npcComplete,
  isMaster,
  visibility,
}: {
  kind: CharacterKind;
  status: CharacterStatus;
  npcComplete: boolean;
  isMaster: boolean;
  visibility: Entity["visibility"];
}) {
  return (
    <>
      <Badge variant="outline" className={CHARACTER_KIND_BADGES[kind]}>
        {CHARACTER_KIND_LABELS[kind]}
      </Badge>
      <Badge variant="outline" className={CHARACTER_STATUS_BADGES[status]}>
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
        <Badge variant="outline" className={VISIBILITY_BADGES[visibility]}>
          {visibility === "PUBLIC" ? (
            <Eye className="size-3" />
          ) : (
            <EyeOff className="size-3" />
          )}
          {VISIBILITY_LABELS[visibility]}
        </Badge>
      )}
    </>
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
      <div className="flex items-center justify-between gap-3">
        <SheetHeading icon={ScrollText} title="Storico" />
        {canEdit && !adding && (
          <Button
            size="sm"
            variant="outline"
            className="-mt-2 shrink-0"
            onClick={() => setAdding(true)}
          >
            <Plus className="size-3.5" />
            Voce
          </Button>
        )}
      </div>

      {adding && (
        <div className="mb-4 space-y-3 rounded-xl border border-hairline-strong bg-night/30 p-4">
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
        <ol className="relative space-y-3 border-l border-hairline-strong pl-5">
          {history.map((item) => (
            <li key={item.id} className="group relative">
              <span className="absolute top-1.5 -left-[1.45rem] size-2.5 rounded-full border border-gold/50 bg-night" />
              <div className="rounded-lg border border-hairline bg-card/60 px-4 py-2.5">
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
