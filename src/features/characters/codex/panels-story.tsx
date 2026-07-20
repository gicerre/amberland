"use client";

import {
  BookText,
  Images,
  PawPrint,
  Pencil,
  Plus,
  ScrollText,
  UserCog,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { useLightbox } from "@/components/shared/lightbox";
import { RichTextRenderer } from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CHARACTER_HISTORY_TYPES,
  type CharacterHistoryType,
  type CharacterSheet,
  type EntityPrivate,
} from "@/types/entities";

import { HISTORY_TYPE_LABELS } from "../constants";
import { makeHistoryEntry, useCharacterMutations } from "../data";
import { CompanionsGrid } from "../components/companion-sheet";
import { useCodex } from "./codex-context";
import { CodexPanel, PanelEyebrow } from "./codex-panel";
import { InlineTextarea } from "./inline-edit";

/* ============================================================
 * Pannelli narrativi: Biografia, Compagni, Storico, Master.
 * ============================================================ */

const TRAIT_PAGES: {
  key: keyof Pick<
    CharacterSheet,
    "personalityTraits" | "ideals" | "bonds" | "flaws"
  >;
  label: string;
  accent: string;
}[] = [
  { key: "personalityTraits", label: "Tratti caratteriali", accent: "text-silver" },
  { key: "ideals", label: "Ideali", accent: "text-emerald-bright" },
  { key: "bonds", label: "Legami", accent: "text-arcane-bright" },
  { key: "flaws", label: "Difetti", accent: "text-crimson-light" },
];

export function PanelBiography({
  storageScope,
  onEditDescription,
}: {
  storageScope: string;
  onEditDescription?: () => void;
}) {
  const { entity, sheet, hasSheet, canEdit, patchSheet } = useCodex();
  const { open: openLightbox } = useLightbox();

  const hasDescription = !isEmptyRichText(entity.description as RichTextValue);
  const traitPages = TRAIT_PAGES.filter(
    (page) => canEdit || Boolean(sheet[page.key])
  );
  const showBackstory = canEdit || Boolean(sheet.backstory);

  // Immagini per il lightbox: principale + galleria + token/ritratti.
  const appearance = hasSheet
    ? [sheet.tokenUrl, ...sheet.altPortraits].filter(Boolean)
    : [];
  const allImages = [entity.imageUrl, ...entity.gallery, ...appearance].filter(
    Boolean
  );
  const galleryOffset = entity.imageUrl ? 1 : 0;
  const appearanceOffset = galleryOffset + entity.gallery.length;

  return (
    <CodexPanel
      id="biografia"
      icon={BookText}
      title="Biografia"
      storageScope={storageScope}
      actions={
        canEdit && onEditDescription ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEditDescription}
            aria-label="Modifica la descrizione"
          >
            <Pencil />
          </Button>
        ) : undefined
      }
    >
      {/* Descrizione narrativa (rich text, su carta) */}
      {hasDescription ? (
        <div className="parchment mb-5 rounded-xl p-5 sm:p-6">
          <RichTextRenderer
            content={entity.description as RichTextValue}
            className="font-lore text-base leading-relaxed"
          />
        </div>
      ) : (
        canEdit && (
          <button
            type="button"
            onClick={onEditDescription}
            className="mb-5 block w-full rounded-xl border border-dashed border-hairline-strong p-5 text-center text-sm text-muted-foreground transition-colors hover:border-gold/40 hover:text-gold-bright"
          >
            Nessuna descrizione. Clicca per scrivere la storia di{" "}
            {entity.name}.
          </button>
        )
      )}

      {hasSheet && (
        <>
          {/* Storia (backstory) */}
          {showBackstory && (
            <div className="mb-5">
              <PanelEyebrow>Storia</PanelEyebrow>
              <InlineTextarea
                value={sheet.backstory}
                onCommit={(backstory) => patchSheet({ backstory })}
                disabled={!canEdit}
                emptyHint="Nessuna storia. Clicca per raccontare il passato del personaggio."
                ariaLabel="Storia del personaggio"
                rows={6}
                className="rounded-xl border border-hairline bg-surface-0/60 p-4"
              />
            </div>
          )}

          {/* Tratti, ideali, legami, difetti */}
          {traitPages.length > 0 && (
            <div className="mb-5 grid gap-3 lg:grid-cols-2">
              {traitPages.map((page) => (
                <article
                  key={page.key}
                  className="rounded-xl border border-hairline bg-surface-0/60 p-4"
                >
                  <h3
                    className={cn(
                      "mb-1.5 font-heading text-xs font-bold tracking-[0.14em] uppercase",
                      page.accent
                    )}
                  >
                    {page.label}
                  </h3>
                  <InlineTextarea
                    value={sheet[page.key]}
                    onCommit={(next) => patchSheet({ [page.key]: next })}
                    disabled={!canEdit}
                    emptyHint="Clicca per scrivere…"
                    ariaLabel={page.label}
                    rows={3}
                  />
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {/* Galleria */}
      {(entity.gallery.length > 0 || appearance.length > 0) && (
        <div>
          <PanelEyebrow>
            <span className="flex items-center gap-1.5">
              <Images className="size-3.5" />
              Galleria
            </span>
          </PanelEyebrow>
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
            {entity.gallery.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() =>
                  openLightbox(allImages, galleryOffset + index, entity.name)
                }
                aria-label={`Apri immagine ${index + 1} della galleria`}
                className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-hairline transition-all hover:border-gold/50"
              >
                <Image
                  src={url}
                  alt={`${entity.name} — immagine ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 15vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
            {appearance.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                onClick={() =>
                  openLightbox(allImages, appearanceOffset + index, entity.name)
                }
                aria-label={`Apri ritratto ${index + 1}`}
                className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-hairline transition-all hover:border-gold/50"
              >
                <Image
                  src={url}
                  alt={`${entity.name} — ritratto ${index + 1}`}
                  fill
                  sizes="(max-width: 640px) 33vw, 15vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </CodexPanel>
  );
}

/* ============================================================
 * Compagni & famigli.
 * ============================================================ */

export function PanelCompanions({ storageScope }: { storageScope: string }) {
  const { entity, sheet } = useCodex();
  if ((sheet.companions?.length ?? 0) === 0) return null;
  return (
    <CodexPanel
      id="compagni"
      icon={PawPrint}
      title="Famigli & Compagni"
      meta={`${sheet.companions.length}`}
      storageScope={storageScope}
    >
      <CompanionsGrid
        companions={sheet.companions}
        ownerName={String(entity.fields.ownerName ?? "")}
      />
    </CodexPanel>
  );
}

/* ============================================================
 * Storico — la timeline della progressione.
 * ============================================================ */

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

export function PanelHistory({ storageScope }: { storageScope: string }) {
  const { entity, canEdit } = useCodex();
  const { appendHistory, removeHistory } = useCharacterMutations();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<CharacterHistoryType>("NOTE");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  const history = [...(entity.history ?? [])].sort((a, b) =>
    b.date.localeCompare(a.date)
  );

  if (history.length === 0 && !canEdit) return null;

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

  return (
    <CodexPanel
      id="storico"
      icon={ScrollText}
      title="Storico"
      meta={history.length > 0 ? `${history.length} eventi` : undefined}
      storageScope={storageScope}
      defaultOpen={false}
      actions={
        canEdit && !adding ? (
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" />
            Voce
          </Button>
        ) : undefined
      }
    >
      {adding && (
        <div className="mb-4 space-y-3 rounded-xl border border-hairline-strong bg-surface-0/60 p-4">
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
        <ol className="relative space-y-2.5 border-l border-hairline-strong pl-5">
          {history.map((item) => (
            <li key={item.id} className="group relative">
              <span
                aria-hidden
                className="absolute top-2 -left-[1.45rem] size-2.5 rounded-full border border-gold/50 bg-surface-0"
              />
              <div className="rounded-lg border border-hairline bg-surface-0/50 px-4 py-2.5 transition-colors group-hover:bg-surface-2/60">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-heading text-sm font-semibold text-parchment">
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
                        className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive focus-visible:opacity-100"
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
    </CodexPanel>
  );
}

/* ============================================================
 * Sala del Master — note e segreti riservati.
 * ============================================================ */

export function PanelMaster({
  storageScope,
  privateData,
  onEdit,
}: {
  storageScope: string;
  privateData: EntityPrivate | undefined;
  onEdit?: () => void;
}) {
  const { isMaster } = useCodex();
  if (!isMaster) return null;

  const hasNotes = !isEmptyRichText(privateData?.masterNotes as RichTextValue);
  const hasSecrets = !isEmptyRichText(privateData?.secrets as RichTextValue);
  if (!hasNotes && !hasSecrets) return null;

  return (
    <CodexPanel
      id="master"
      icon={UserCog}
      title="Sala del Master"
      accent="crimson"
      storageScope={storageScope}
      defaultOpen={false}
      className="border-crimson/25"
      actions={
        onEdit ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onEdit}
            aria-label="Modifica note del Master"
          >
            <Pencil />
          </Button>
        ) : undefined
      }
    >
      {hasNotes && (
        <div className={cn(hasSecrets && "mb-4")}>
          <PanelEyebrow className="text-crimson-light/80">Note</PanelEyebrow>
          <RichTextRenderer
            content={privateData?.masterNotes as RichTextValue}
            className="text-[15px] leading-relaxed text-foreground/90"
          />
        </div>
      )}
      {hasSecrets && (
        <div>
          <PanelEyebrow className="text-crimson-light/80">Segreti</PanelEyebrow>
          <RichTextRenderer
            content={privateData?.secrets as RichTextValue}
            className="text-[15px] leading-relaxed text-foreground/90"
          />
        </div>
      )}
    </CodexPanel>
  );
}
