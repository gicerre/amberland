"use client";

import { Images, Loader2, ScrollText, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Switch } from "@/components/ui/switch";
import {
  ConsoleField,
  ConsoleNav,
  ConsolePanel,
  ConsoleSectionHeading,
  FormConsole,
  ImmersiveModal,
  type ConsoleSection,
} from "@/design-system";
import { cn } from "@/lib/utils";
import {
  VISIBILITIES,
  type Entity,
  type FieldValue,
  type RichText,
  type Visibility,
} from "@/types/entities";

import {
  useEntitiesByType,
  useEntityMutations,
  useEntityPrivate,
  type EntityInput,
} from "../data";
import {
  ENTITY_REGISTRY,
  VISIBILITY_BADGES,
  VISIBILITY_LABELS,
  type FieldDef,
} from "../registry";
import { GalleryManager } from "./gallery-manager";

interface FormState {
  name: string;
  description: RichText;
  tags: string[];
  parentId: string;
  visibility: Visibility;
  unlockAfterId: string;
  imageUrl: string;
  gallery: string[];
  fields: Record<string, FieldValue>;
  masterNotes: RichText;
  secrets: RichText;
}

function buildInitialState(entity: Entity): FormState {
  return {
    name: entity.name,
    description: entity.description,
    tags: entity.tags,
    parentId: entity.parentId ?? "",
    visibility: entity.visibility,
    unlockAfterId: entity.unlockAfterId ?? "",
    imageUrl: entity.imageUrl,
    gallery: entity.gallery,
    fields: { ...entity.fields },
    masterNotes: "",
    secrets: "",
  };
}

/** Campo dinamico del registro: text / textarea / number / select / switch. */
function DynamicField({
  def,
  value,
  onChange,
}: {
  def: FieldDef;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}) {
  switch (def.kind) {
    case "textarea":
      return (
        <RichTextEditor
          value={value as RichTextValue}
          onChange={(json) => onChange(json)}
          placeholder={def.placeholder}
          folder="misc"
        />
      );
    case "number":
      return (
        <Input
          type="number"
          value={value === undefined || value === "" ? "" : Number(value)}
          onChange={(event) =>
            onChange(
              Number.isNaN(event.target.valueAsNumber)
                ? ""
                : event.target.valueAsNumber
            )
          }
          placeholder={def.placeholder}
        />
      );
    case "select":
      return (
        <Select
          value={String(value ?? "")}
          onValueChange={(selected) => onChange(selected)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleziona…" />
          </SelectTrigger>
          <SelectContent>
            {(def.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case "switch":
      return <Switch checked={Boolean(value)} onCheckedChange={onChange} />;
    default:
      return (
        <Input
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
          placeholder={def.placeholder}
        />
      );
  }
}

/**
 * Console di modifica completa di un'entità in stile menu world-building AAA:
 * navigazione delle sezioni a sinistra, pannello scorrevole al centro,
 * anteprima viva della scheda a destra. Scheda base, campi specifici del tipo,
 * immagini e contenuti riservati al Master.
 */
export function EntityFormSheet({
  open,
  onOpenChange,
  entity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity;
}) {
  const config = ENTITY_REGISTRY[entity.type];
  const { update } = useEntityMutations();
  const { data: privateData } = useEntityPrivate(open ? entity.id : undefined);

  const parentType = config.parentType;
  const { data: parentOptions } = useEntitiesByType(
    parentType ?? "world",
    open && parentType !== null
  );
  const { data: quests } = useEntitiesByType("quest", open);
  const { data: sessions } = useEntitiesByType("session", open);

  const [form, setForm] = useState<FormState>(() => buildInitialState(entity));
  const [section, setSection] = useState("scheda");

  // Risincronizza il form all'apertura e quando arrivano i dati privati
  useEffect(() => {
    if (!open) return;
    setSection("scheda");
    setForm({
      ...buildInitialState(entity),
      masterNotes: privateData?.masterNotes ?? "",
      secrets: privateData?.secrets ?? "",
    });
  }, [open, entity, privateData]);

  const patch = (partial: Partial<FormState>) =>
    setForm((current) => ({ ...current, ...partial }));

  const handleSubmit = () => {
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("Il nome è troppo corto");
      setSection("scheda");
      return;
    }
    const data: Partial<EntityInput> = {
      name,
      description: form.description,
      tags: form.tags,
      parentId: parentType ? form.parentId || null : null,
      visibility: form.visibility,
      unlockAfterId:
        form.visibility === "MASTER_ONLY" && form.unlockAfterId
          ? form.unlockAfterId
          : null,
      imageUrl: form.imageUrl,
      gallery: form.gallery,
      fields: form.fields,
    };
    update.mutate(
      {
        entity,
        data,
        privateData: { masterNotes: form.masterNotes, secrets: form.secrets },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  };

  const unlockOptions = [...(quests ?? []), ...(sessions ?? [])].filter(
    (option) => option.id !== entity.id
  );

  const sections: ConsoleSection[] = useMemo(() => {
    const Icon = config.icon;
    const list: ConsoleSection[] = [
      { id: "scheda", label: "Identità", icon: <Icon /> },
    ];
    if (config.fields.length > 0) {
      list.push({ id: "dettagli", label: "Dettagli", icon: <ScrollText /> });
    }
    list.push({ id: "immagini", label: "Immagini", icon: <Images /> });
    list.push({ id: "master", label: "Sala del Master", icon: <ShieldAlert /> });
    return list;
  }, [config]);

  const Icon = config.icon;

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      flush
      icon={<Icon />}
      title={form.name || entity.name}
      description={`${config.label} — modifica la scheda e i contenuti riservati.`}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Sigilla le modifiche
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
        aside={<EntityPreview entity={entity} form={form} />}
      >
        {section === "scheda" && (
          <ConsolePanel sectionKey="scheda">
            <ConsoleSectionHeading
              icon={<Icon />}
              title="Identità"
              subtitle="Nome, appartenenza e cronache della voce."
            />
            <ConsoleField label="Nome">
              <Input
                value={form.name}
                onChange={(event) => patch({ name: event.target.value })}
              />
            </ConsoleField>

            {parentType && (
              <ConsoleField
                label={`${ENTITY_REGISTRY[parentType].label} di appartenenza`}
              >
                <Select
                  value={form.parentId}
                  onValueChange={(value) => patch({ parentId: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(parentOptions ?? [])
                      .filter((option) => option.id !== entity.id)
                      .map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          {option.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </ConsoleField>
            )}

            <ConsoleField label="Descrizione">
              <RichTextEditor
                value={form.description as RichTextValue}
                onChange={(json) => patch({ description: json })}
                placeholder="Le cronache di questa voce: storia, atmosfere, dettagli…"
                folder={entity.type}
              />
            </ConsoleField>

            <ConsoleField label="Tag">
              <TagInput
                value={form.tags}
                onChange={(tags) => patch({ tags })}
              />
            </ConsoleField>
          </ConsolePanel>
        )}

        {section === "dettagli" && config.fields.length > 0 && (
          <ConsolePanel sectionKey="dettagli">
            <ConsoleSectionHeading
              icon={<ScrollText />}
              title="Dettagli"
              subtitle={`Attributi specifici — ${config.label}.`}
            />
            {config.fields.map((def) =>
              def.kind === "switch" ? (
                <div
                  key={def.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-black/30 px-4 py-3"
                >
                  <span className="font-heading text-sm tracking-wide text-foreground/85">
                    {def.label}
                  </span>
                  <DynamicField
                    def={def}
                    value={form.fields[def.key]}
                    onChange={(value) =>
                      patch({ fields: { ...form.fields, [def.key]: value } })
                    }
                  />
                </div>
              ) : (
                <ConsoleField key={def.key} label={def.label}>
                  <DynamicField
                    def={def}
                    value={form.fields[def.key]}
                    onChange={(value) =>
                      patch({ fields: { ...form.fields, [def.key]: value } })
                    }
                  />
                </ConsoleField>
              )
            )}
          </ConsolePanel>
        )}

        {section === "immagini" && (
          <ConsolePanel sectionKey="immagini">
            <ConsoleSectionHeading
              icon={<Images />}
              title="Immagini"
              subtitle="Ritratto principale e galleria illustrata."
            />
            <ConsoleField label="Immagine principale">
              <ImageUpload
                value={form.imageUrl}
                onChange={(imageUrl) => patch({ imageUrl })}
                folder={entity.type}
              />
            </ConsoleField>
            <ConsoleField label="Galleria">
              <GalleryManager
                value={form.gallery}
                onChange={(gallery) => patch({ gallery })}
                folder={entity.type}
              />
            </ConsoleField>
          </ConsolePanel>
        )}

        {section === "master" && (
          <ConsolePanel sectionKey="master">
            <ConsoleSectionHeading
              icon={<ShieldAlert />}
              title="Sala del Master"
              subtitle="Visibilità e contenuti riservati a Master e Admin."
            />
            <ConsoleField
              label="Visibilità"
              hint="I giocatori vedono solo le voci «Pubblica» o «Solo Party»."
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
                  {VISIBILITIES.map((visibility) => (
                    <SelectItem key={visibility} value={visibility}>
                      {VISIBILITY_LABELS[visibility]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConsoleField>

            {form.visibility === "MASTER_ONLY" && (
              <ConsoleField
                label="Da rivelare dopo (facoltativo)"
                hint="Promemoria nella Sala del Master: lo sblocco resta una tua decisione."
              >
                <Select
                  value={form.unlockAfterId}
                  onValueChange={(value) => patch({ unlockAfterId: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Quest o sessione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {unlockOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {ENTITY_REGISTRY[option.type].label}: {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </ConsoleField>
            )}

            <ConsoleField label="Note del Master">
              <RichTextEditor
                value={form.masterNotes as RichTextValue}
                onChange={(json) => patch({ masterNotes: json })}
                placeholder="Appunti privati, agganci di trama, idee…"
                folder="misc"
              />
            </ConsoleField>

            <ConsoleField label="Segreti">
              <RichTextEditor
                value={form.secrets as RichTextValue}
                onChange={(json) => patch({ secrets: json })}
                placeholder="Ciò che nessun giocatore deve sapere… per ora."
                folder="misc"
              />
            </ConsoleField>

            <p className="rounded-md border border-crimson/25 bg-crimson/10 p-3 text-xs text-muted-foreground">
              Note e segreti sono salvati in un&rsquo;area riservata leggibile
              solo da Master e Admin, anche a livello di database.
            </p>
          </ConsolePanel>
        )}
      </FormConsole>
    </ImmersiveModal>
  );
}

/** Anteprima viva della scheda (rotaia destra della console). */
function EntityPreview({ entity, form }: { entity: Entity; form: FormState }) {
  const config = ENTITY_REGISTRY[entity.type];
  const Icon = config.icon;

  return (
    <div className="space-y-3">
      <p className="font-heading text-[0.65rem] font-semibold tracking-[0.18em] text-gold/50 uppercase">
        Anteprima
      </p>

      <div className="overflow-hidden rounded-lg border border-hairline-strong bg-stone-mid/70 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]">
        <div className="relative aspect-[4/3] w-full bg-night/60">
          {form.imageUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${form.imageUrl})` }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-gold/25">
              <Icon className="size-12" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
          <span
            className={cn(
              "absolute top-2 left-2 rounded border px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide",
              config.badgeClass
            )}
          >
            {config.label}
          </span>
        </div>

        <div className="space-y-2 p-3">
          <h4 className="font-heading text-base leading-tight text-foreground">
            {form.name || "Senza nome"}
          </h4>

          <span
            className={cn(
              "inline-block rounded border px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide",
              VISIBILITY_BADGES[form.visibility]
            )}
          >
            {VISIBILITY_LABELS[form.visibility]}
          </span>

          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-1">
              {form.tags.slice(0, 6).map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-gold/10 px-1.5 py-0.5 text-[0.6rem] text-gold/80"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="text-[0.7rem] leading-relaxed text-muted-foreground/80">
        L&rsquo;anteprima si aggiorna mentre compili la scheda.
      </p>
    </div>
  );
}
