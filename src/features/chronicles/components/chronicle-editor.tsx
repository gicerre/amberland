"use client";

import {
  BookOpen,
  CalendarDays,
  Feather,
  Images,
  Link2,
  Loader2,
  ShieldAlert,
  Tags,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { EntityMultiPicker } from "@/components/shared/entity-multi-picker";
import { ImageUpload } from "@/components/shared/image-upload";
import { RichTextEditor } from "@/components/shared/rich-text-lazy";
import type { RichTextValue } from "@/components/shared/rich-text-utils";
import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ConsoleField,
  ConsoleNav,
  ConsolePanel,
  ConsoleSectionHeading,
  FormConsole,
  ImmersiveModal,
  type ConsoleSection,
} from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { GalleryManager } from "@/features/entities/components/gallery-manager";
import { useEntitiesByType } from "@/features/entities/data";
import {
  VISIBILITY_LABELS,
} from "@/features/entities/registry";
import {
  VISIBILITIES,
  type Entity,
  type Visibility,
} from "@/types/entities";

import { CHRONICLE_CATEGORY_META, CHRONICLE_CATEGORY_OPTIONS } from "../constants";
import {
  useArcs,
  useCalendar,
  useChronicleMutations,
  useCitedEntities,
  type ChronicleDraft,
} from "../data";
import { WorldDatePicker } from "./world-date-picker";

const NONE = "__none__";

/** Visibilità concesse a un giocatore che propone una cronaca. */
const PLAYER_VISIBILITIES: Visibility[] = ["PARTY_ONLY", "OWNER_ONLY"];

interface FormState extends ChronicleDraft {
  links: Entity[];
}

function emptyForm(): FormState {
  return {
    name: "",
    subtitle: "",
    authorInWorld: "",
    category: "HISTORICAL_EVENT",
    date: { eraId: null, year: 1, month: null, day: null },
    sequence: 0,
    legacyDateLabel: "",
    arcId: null,
    sessionId: null,
    description: "",
    imageUrl: "",
    gallery: [],
    tags: [],
    visibility: "MASTER_ONLY",
    links: [],
  };
}

function formFromEntity(entity: Entity, links: Entity[]): FormState {
  const data = entity.chronicle;
  return {
    name: entity.name,
    subtitle: data?.subtitle ?? "",
    authorInWorld: data?.authorInWorld ?? "",
    category: data?.category ?? "HISTORICAL_EVENT",
    date: data?.date ?? null,
    sequence: data?.sequence ?? 0,
    legacyDateLabel: data?.legacyDateLabel ?? "",
    arcId: data?.arcId ?? null,
    sessionId: data?.sessionId ?? null,
    description: entity.description,
    imageUrl: entity.imageUrl,
    gallery: entity.gallery,
    tags: entity.tags,
    visibility: entity.visibility,
    links,
  };
}

/**
 * Scrittoio del Libro delle Cronache: creazione e modifica di un capitolo.
 * Il Master scrive nel canone; un giocatore propone (nasce PROPOSED, con
 * visibilità limitata, finché il Master non canonizza).
 */
export function ChronicleEditor({
  open,
  onOpenChange,
  entity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = nuovo capitolo. */
  entity: Entity | null;
}) {
  const { isMaster } = useAuth();
  const { create, update } = useChronicleMutations();
  const { data: calendar } = useCalendar();
  const { data: arcs } = useArcs();
  const { data: sessions } = useEntitiesByType("session", open);
  const { data: citedEntities } = useCitedEntities(
    open ? entity?.id : undefined
  );

  const [form, setForm] = useState<FormState>(emptyForm);
  const [section, setSection] = useState("contenuto");

  useEffect(() => {
    if (!open) return;
    setSection("contenuto");
    setForm(
      entity
        ? formFromEntity(entity, citedEntities ?? [])
        : {
            ...emptyForm(),
            visibility: isMaster ? "MASTER_ONLY" : "PARTY_ONLY",
          }
    );
  }, [open, entity, citedEntities, isMaster]);

  const patch = (partial: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...partial }));

  const saving = create.isPending || update.isPending;

  const handleSubmit = () => {
    if (form.name.trim().length < 2) {
      toast.error("Il titolo è troppo corto");
      setSection("contenuto");
      return;
    }
    if (!calendar) return;
    const { links, ...draft } = form;
    const done = { onSuccess: () => onOpenChange(false) };
    if (entity) {
      update.mutate({ entity, draft, calendar, links }, done);
    } else {
      create.mutate({ draft, calendar, links, asPlayer: !isMaster }, done);
    }
  };

  const sections: ConsoleSection[] = useMemo(
    () => [
      { id: "contenuto", label: "Contenuto", icon: <Feather /> },
      { id: "classificazione", label: "Classificazione", icon: <Tags /> },
      { id: "data", label: "Data", icon: <CalendarDays /> },
      { id: "collegamenti", label: "Collegamenti", icon: <Link2 /> },
      { id: "immagini", label: "Immagini", icon: <Images /> },
      { id: "visibilita", label: "Visibilità", icon: <ShieldAlert /> },
    ],
    []
  );

  const visibilityOptions = isMaster ? VISIBILITIES : PLAYER_VISIBILITIES;

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      flush
      icon={<BookOpen />}
      title={form.name || (entity ? entity.name : "Nuovo capitolo")}
      description={
        entity
          ? "Rivedi questo capitolo del Libro delle Cronache."
          : isMaster
            ? "Scrivi un nuovo capitolo della storia di Amberland."
            : "Proponi un capitolo: entrerà nel canone quando il Master lo approverà."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            {entity ? "Sigilla le modifiche" : "Scrivi nel Libro"}
          </Button>
        </>
      }
    >
      <FormConsole
        nav={
          <ConsoleNav
            sections={sections}
            active={section}
            onChange={setSection}
          />
        }
      >
        {section === "contenuto" && (
          <ConsolePanel sectionKey="contenuto">
            <ConsoleSectionHeading
              icon={<Feather />}
              title="Contenuto"
              subtitle="Titolo, prosa e firma del capitolo."
            />
            <ConsoleField label="Titolo">
              <Input
                autoFocus={!entity}
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
                placeholder="La caduta di Valcupa"
              />
            </ConsoleField>
            <ConsoleField label="Sottotitolo">
              <Input
                value={form.subtitle}
                onChange={(event) => patch({ subtitle: event.target.value })}
                placeholder="Come la città delle cento torri si arrese in una notte"
              />
            </ConsoleField>
            <ConsoleField label="Testo">
              <RichTextEditor
                value={form.description as RichTextValue}
                onChange={(json) => patch({ description: json })}
                placeholder="Correva l'anno… — la cronaca, così come verrà tramandata."
                folder="chronicle"
              />
            </ConsoleField>
            <ConsoleField
              label="Autore nel mondo"
              hint="Chi firma la cronaca dentro Amberland (es. un archivista, un bardo)."
            >
              <Input
                value={form.authorInWorld}
                onChange={(event) =>
                  patch({ authorInWorld: event.target.value })
                }
                placeholder="Archivista Elrin di Valcupa"
              />
            </ConsoleField>
          </ConsolePanel>
        )}

        {section === "classificazione" && (
          <ConsolePanel sectionKey="classificazione">
            <ConsoleSectionHeading
              icon={<Tags />}
              title="Classificazione"
              subtitle="Categoria, arco narrativo, sessione e tag."
            />
            <ConsoleField label="Categoria">
              <Select
                value={form.category}
                onValueChange={(value) =>
                  patch({ category: value as FormState["category"] })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CHRONICLE_CATEGORY_OPTIONS.map((option) => {
                    const Icon = CHRONICLE_CATEGORY_META[option.value].icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <Icon className="size-4" />
                        {option.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </ConsoleField>

            {(arcs ?? []).length > 0 && (
              <ConsoleField label="Arco narrativo">
                <Select
                  value={form.arcId ?? NONE}
                  onValueChange={(value) =>
                    patch({ arcId: value === NONE ? null : value })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Nessun arco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>— nessuno —</SelectItem>
                    {(arcs ?? []).map((arc) => (
                      <SelectItem key={arc.id} value={arc.id}>
                        {arc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConsoleField>
            )}

            <ConsoleField label="Sessione di gioco">
              <Select
                value={form.sessionId ?? NONE}
                onValueChange={(value) =>
                  patch({ sessionId: value === NONE ? null : value })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Nessuna sessione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— nessuna —</SelectItem>
                  {(sessions ?? []).map((session) => (
                    <SelectItem key={session.id} value={session.id}>
                      {session.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConsoleField>

            <ConsoleField label="Tag">
              <TagInput
                value={form.tags}
                onChange={(tags) => patch({ tags })}
              />
            </ConsoleField>
          </ConsolePanel>
        )}

        {section === "data" && (
          <ConsolePanel sectionKey="data">
            <ConsoleSectionHeading
              icon={<CalendarDays />}
              title="Data del calendario di Amberland"
              subtitle="Il Libro è ordinato per questa data, mai per quella reale."
            />
            <WorldDatePicker
              value={form.date}
              onChange={(date) => patch({ date })}
              calendar={calendar ?? { eras: [], months: [], yearSuffix: "", updatedAt: null }}
            />
            <ConsoleField
              label="Posizione tra eventi paralleli"
              hint="Se più capitoli condividono la stessa data, il numero più basso viene letto prima."
            >
              <Input
                type="number"
                value={form.sequence}
                onChange={(event) =>
                  patch({
                    sequence: Number.isNaN(event.target.valueAsNumber)
                      ? 0
                      : event.target.valueAsNumber,
                  })
                }
              />
            </ConsoleField>
            {form.legacyDateLabel && (
              <ConsoleField
                label="Data testuale (dai vecchi Eventi)"
                hint="Mostrata finché non assegni una data del calendario."
              >
                <Input
                  value={form.legacyDateLabel}
                  onChange={(event) =>
                    patch({ legacyDateLabel: event.target.value })
                  }
                />
              </ConsoleField>
            )}
          </ConsolePanel>
        )}

        {section === "collegamenti" && (
          <ConsolePanel sectionKey="collegamenti">
            <ConsoleSectionHeading
              icon={<Link2 />}
              title="Collegamenti"
              subtitle="Personaggi, luoghi, fazioni e oggetti citati nel capitolo."
            />
            <ConsoleField
              label="Entità citate"
              hint="Ogni collegamento è bidirezionale: la cronaca apparirà anche sulla pagina dell'entità."
            >
              <EntityMultiPicker
                value={form.links}
                onChange={(links) => patch({ links })}
                excludeId={entity?.id}
                placeholder="Cerca personaggi, luoghi, fazioni…"
              />
            </ConsoleField>
          </ConsolePanel>
        )}

        {section === "immagini" && (
          <ConsolePanel sectionKey="immagini">
            <ConsoleSectionHeading
              icon={<Images />}
              title="Immagini"
              subtitle="Copertina del capitolo e galleria illustrata."
            />
            <ConsoleField label="Copertina">
              <ImageUpload
                value={form.imageUrl}
                onChange={(imageUrl) => patch({ imageUrl })}
                folder="chronicle"
              />
            </ConsoleField>
            <ConsoleField label="Galleria">
              <GalleryManager
                value={form.gallery}
                onChange={(gallery) => patch({ gallery })}
                folder="chronicle"
              />
            </ConsoleField>
          </ConsolePanel>
        )}

        {section === "visibilita" && (
          <ConsolePanel sectionKey="visibilita">
            <ConsoleSectionHeading
              icon={<ShieldAlert />}
              title="Visibilità"
              subtitle={
                isMaster
                  ? "Chi può leggere questo capitolo."
                  : "La proposta resta tua o del party finché il Master non la canonizza."
              }
            />
            <ConsoleField
              label="Visibilità"
              hint={
                isMaster
                  ? "I giocatori leggono solo i capitoli «Pubblica» o «Solo Party»."
                  : "Quando verrà canonizzata, il Master potrà renderla pubblica."
              }
            >
              <Select
                value={form.visibility}
                onValueChange={(value) =>
                  patch({ visibility: value as Visibility })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visibilityOptions.map((visibility) => (
                    <SelectItem key={visibility} value={visibility}>
                      {VISIBILITY_LABELS[visibility]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConsoleField>
          </ConsolePanel>
        )}
      </FormConsole>
    </ImmersiveModal>
  );
}
