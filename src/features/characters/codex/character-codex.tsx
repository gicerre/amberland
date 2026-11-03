"use client";

import {
  BookText,
  Dices,
  Eye,
  EyeOff,
  Heart,
  Link2,
  MoreHorizontal,
  Package,
  PawPrint,
  Pencil,
  ScrollText,
  Skull,
  Sparkles,
  Swords,
  Trash2,
  Users,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { FantasyBreadcrumb } from "@/components/shared/fantasy-breadcrumb";
import { useLightbox } from "@/components/shared/lightbox";
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
import { useAuth } from "@/features/auth/auth-provider";
import { RelationPanel } from "@/features/entities/components/relation-panel";
import {
  useEntityMutations,
  useEntityPrivate,
} from "@/features/entities/data";
import { NoteLinksPanel } from "@/features/party/diary/note-links-panel";
import {
  CHARACTER_STATUSES,
  type CharacterKind,
  type Entity,
} from "@/types/entities";

import { CHARACTER_STATUS_LABELS, NPC_TYPE_LABELS } from "../constants";
import { useCharacterMutations } from "../data";
import { CharacterFormSheet } from "../components/character-form-sheet";
import { CodexProvider, useCodex } from "./codex-context";
import { CombatMode } from "./combat-mode";
import { CodexDashboard } from "./dashboard";
import { CodexInspector } from "./inspector";
import { CodexNav, type CodexSection } from "./codex-nav";
import { CodexPanel } from "./codex-panel";
import { PanelAbilities, RailClasses, RailIdentity } from "./panels-core";
import { PanelInventory, PanelMagic, PanelResources } from "./panels-gear";
import {
  PanelBiography,
  PanelCompanions,
  PanelHistory,
  PanelMaster,
} from "./panels-story";

/* ============================================================
 * CharacterCodex — la Scheda Personaggio di nuova generazione.
 *
 * Composizione: dashboard cinematografica (hero) a tutta
 * larghezza, barra di comando sticky, bento di pannelli
 * indipendenti + rail di riepilogo su desktop, Inspector
 * universale. Tutto modificabile sul posto.
 * ============================================================ */

export function CharacterCodex({ entity }: { entity: Entity }) {
  const { isMaster } = useAuth();
  const { data: privateData } = useEntityPrivate(
    isMaster ? entity.id : undefined
  );

  return (
    <CodexProvider entity={entity} reservedSheet={privateData?.reservedSheet}>
      <CodexScreen entity={entity} privateData={privateData} />
    </CodexProvider>
  );
}

function CodexScreen({
  entity,
  privateData,
}: {
  entity: Entity;
  privateData: ReturnType<typeof useEntityPrivate>["data"];
}) {
  const router = useRouter();
  const { open: openLightbox } = useLightbox();
  const { sheet, hasSheet, canEdit, isMaster } = useCodex();

  const { remove, setVisibility } = useEntityMutations();
  const { setStatus, convertToFull, setPartyMember } = useCharacterMutations();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [combatOpen, setCombatOpen] = useState(false);

  const kind = (entity.fields.kind as CharacterKind) ?? "NPC";
  const isPC = kind === "PC";
  const npcComplete = entity.fields.npcComplete === true;

  // Tutte le immagini note del personaggio, per il lightbox.
  const allImages = useMemo(
    () =>
      [
        entity.imageUrl,
        ...entity.gallery,
        ...(hasSheet ? [sheet.tokenUrl, ...sheet.altPortraits] : []),
      ].filter(Boolean),
    [entity.imageUrl, entity.gallery, hasSheet, sheet.tokenUrl, sheet.altPortraits]
  );

  /* ── Sezioni disponibili (guidano nav e layout) ── */
  const sections = useMemo<CodexSection[]>(() => {
    if (!hasSheet) {
      return [
        { id: "biografia", label: "Biografia", icon: BookText },
        { id: "storico", label: "Storico", icon: ScrollText },
        { id: "legami", label: "Legami", icon: Link2 },
      ];
    }
    const list: CodexSection[] = [
      { id: "caratteristiche", label: "Caratteristiche", icon: Dices },
      { id: "risorse", label: "Risorse", icon: Sparkles },
      { id: "inventario", label: "Inventario", icon: Package },
      { id: "magie", label: "Magie", icon: Wand2 },
    ];
    if (sheet.companions.length > 0) {
      list.push({ id: "compagni", label: "Compagni", icon: PawPrint });
    }
    list.push(
      { id: "biografia", label: "Biografia", icon: BookText },
      { id: "storico", label: "Storico", icon: ScrollText },
      { id: "legami", label: "Legami", icon: Link2 }
    );
    return list;
  }, [hasSheet, sheet.companions.length]);

  /* ── Azioni contestuali ── */

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
      {hasSheet && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCombatOpen(true)}
          aria-label="Attiva modalità combattimento"
        >
          <Swords className="size-4" />
          <span className="hidden sm:inline">Combattimento</span>
        </Button>
      )}
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
              {NPC_TYPE_LABELS.COMPLETE}
            </DropdownMenuItem>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Heart className="size-4" />
              Stato
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuLabel>Imposta stato</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusItems}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {adminItems && <DropdownMenuSeparator />}
          {adminItems}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : null;

  const scope = entity.id;

  return (
    <div className="space-y-5">
      {/* ════ Dashboard cinematografica, a tutta larghezza ════ */}
      <div className="relative left-1/2 -mt-4 w-screen -translate-x-1/2 sm:-mt-6 lg:-mt-10 lg:w-[calc(100vw-18rem)]">
        <CodexDashboard
          actions={actions}
          onOpenPortrait={
            allImages.length > 0
              ? () => openLightbox(allImages, 0, entity.name)
              : undefined
          }
        />
      </div>

      <FantasyBreadcrumb
        steps={[
          { label: "Mondo", href: "/mondo" },
          {
            label: isPC ? "Party" : "Personaggi",
            href: isPC ? "/party" : "/personaggi",
          },
          { label: entity.name, current: true },
        ]}
      />

      {/* ════ Barra di comando sticky ════ */}
      <CodexNav sections={sections} />

      {/* ════ Bento: colonna principale + rail ════ */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          {hasSheet && (
            <>
              <PanelAbilities storageScope={scope} />

              {/* Su mobile il riepilogo del rail vive qui */}
              <div className="grid gap-5 sm:grid-cols-2 lg:hidden">
                <RailIdentity />
                <RailClasses />
              </div>

              <PanelResources storageScope={scope} />
              <PanelInventory storageScope={scope} />
              <PanelMagic storageScope={scope} />
              <PanelCompanions storageScope={scope} />
            </>
          )}

          <PanelBiography
            storageScope={scope}
            onEditDescription={canEdit ? () => setEditOpen(true) : undefined}
          />
          <PanelHistory storageScope={scope} />

          {/* Legami con il mondo: relazioni + note del diario */}
          <CodexPanel
            id="legami"
            icon={Link2}
            title="Legami"
            storageScope={scope}
            contentClassName="space-y-6"
          >
            <RelationPanel entity={entity} />
            <NoteLinksPanel entity={entity} />
          </CodexPanel>

          <PanelMaster
            storageScope={scope}
            privateData={privateData}
            onEdit={() => setEditOpen(true)}
          />
        </div>

        {/* Rail di riepilogo (desktop) */}
        {hasSheet && (
          <aside className="hidden space-y-5 lg:block">
            <RailIdentity />
            <RailClasses />
          </aside>
        )}
      </div>

      {/* ════ Superfici flottanti ════ */}
      <CodexInspector />

      {canEdit && hasSheet && (
        <CombatMode open={combatOpen} onOpenChange={setCombatOpen} />
      )}
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
          onConfirm={() =>
            remove.mutate(entity, {
              onSuccess: () => {
                setDeleteOpen(false);
                router.push("/personaggi");
              },
            })
          }
        />
      )}
    </div>
  );
}
