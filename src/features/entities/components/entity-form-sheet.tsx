"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ImageUpload } from "@/components/shared/image-upload";
import { RichTextEditor } from "@/components/shared/rich-text-lazy";
import type { RichTextValue } from "@/components/shared/rich-text-utils";
import { TagInput } from "@/components/shared/tag-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ENTITY_REGISTRY, VISIBILITY_LABELS, type FieldDef } from "../registry";
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
      return (
        <Switch checked={Boolean(value)} onCheckedChange={onChange} />
      );
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
 * Drawer di modifica completa di un'entità: scheda base, campi
 * specifici del tipo, immagini e contenuti riservati al Master.
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

  // Risincronizza il form all'apertura e quando arrivano i dati privati
  useEffect(() => {
    if (!open) return;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden border-gold/20 bg-card p-0 sm:max-w-3xl">
        <DialogHeader className="border-b border-gold/15 px-6 py-4 text-left">
          <DialogTitle className="font-heading flex items-center gap-2 text-xl">
            <config.icon className="size-5 text-gold" />
            {entity.name}
          </DialogTitle>
          <DialogDescription>
            {config.label} — modifica la scheda e i contenuti riservati.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="scheda" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 flex w-fit max-w-[calc(100%-3rem)] overflow-x-auto">
            <TabsTrigger value="scheda">Scheda</TabsTrigger>
            {config.fields.length > 0 && (
              <TabsTrigger value="dettagli">Dettagli</TabsTrigger>
            )}
            <TabsTrigger value="immagini">Immagini</TabsTrigger>
            <TabsTrigger value="master">Master</TabsTrigger>
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {/* ------------------------ Scheda ------------------------ */}
            <TabsContent value="scheda" className="space-y-5">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(event) => patch({ name: event.target.value })}
                />
              </div>

              {parentType && (
                <div className="space-y-2">
                  <Label>
                    {ENTITY_REGISTRY[parentType].label} di appartenenza
                  </Label>
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
                </div>
              )}

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <RichTextEditor
                  value={form.description as RichTextValue}
                  onChange={(json) => patch({ description: json })}
                  placeholder="Le cronache di questa voce: storia, atmosfere, dettagli…"
                  folder={entity.type}
                />
              </div>

              <div className="space-y-2">
                <Label>Tag</Label>
                <TagInput
                  value={form.tags}
                  onChange={(tags) => patch({ tags })}
                />
              </div>
            </TabsContent>

            {/* ----------------------- Dettagli ----------------------- */}
            {config.fields.length > 0 && (
              <TabsContent value="dettagli" className="space-y-5">
                {config.fields.map((def) => (
                  <div
                    key={def.key}
                    className={
                      def.kind === "switch"
                        ? "flex items-center justify-between gap-3 rounded-lg border border-gold/15 bg-night/30 px-4 py-3"
                        : "space-y-2"
                    }
                  >
                    <Label>{def.label}</Label>
                    <DynamicField
                      def={def}
                      value={form.fields[def.key]}
                      onChange={(value) =>
                        patch({ fields: { ...form.fields, [def.key]: value } })
                      }
                    />
                  </div>
                ))}
              </TabsContent>
            )}

            {/* ----------------------- Immagini ----------------------- */}
            <TabsContent value="immagini" className="space-y-6">
              <div className="space-y-2">
                <Label>Immagine principale</Label>
                <ImageUpload
                  value={form.imageUrl}
                  onChange={(imageUrl) => patch({ imageUrl })}
                  folder={entity.type}
                />
              </div>
              <div className="space-y-2">
                <Label>Galleria</Label>
                <GalleryManager
                  value={form.gallery}
                  onChange={(gallery) => patch({ gallery })}
                  folder={entity.type}
                />
              </div>
            </TabsContent>

            {/* ------------------------ Master ------------------------ */}
            <TabsContent value="master" className="space-y-5">
              <div className="space-y-2">
                <Label>Visibilità</Label>
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
                <p className="text-xs text-muted-foreground">
                  I giocatori vedono solo le voci «Pubblica» o «Solo Party».
                </p>
              </div>

              {form.visibility === "MASTER_ONLY" && (
                <div className="space-y-2">
                  <Label>Da rivelare dopo (facoltativo)</Label>
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
                  <p className="text-xs text-muted-foreground">
                    Promemoria nella Sala del Master: lo sblocco resta una tua
                    decisione.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Note del Master</Label>
                <RichTextEditor
                  value={form.masterNotes as RichTextValue}
                  onChange={(json) => patch({ masterNotes: json })}
                  placeholder="Appunti privati, agganci di trama, idee…"
                  folder="misc"
                />
              </div>

              <div className="space-y-2">
                <Label>Segreti</Label>
                <RichTextEditor
                  value={form.secrets as RichTextValue}
                  onChange={(json) => patch({ secrets: json })}
                  placeholder="Ciò che nessun giocatore deve sapere… per ora."
                  folder="misc"
                />
              </div>

              <p className="rounded-lg border border-gold/15 bg-night/30 p-3 text-xs text-muted-foreground">
                Note e segreti sono salvati in un&rsquo;area riservata leggibile
                solo da Master e Admin, anche a livello di database.
              </p>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-end gap-2 border-t border-gold/15 px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Salva modifiche
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
