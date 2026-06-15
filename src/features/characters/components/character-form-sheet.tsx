"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GalleryManager } from "@/features/entities/components/gallery-manager";
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
import { useAuth } from "@/features/auth/auth-provider";
import {
  useEntitiesByType,
  useEntityMutations,
  useEntityPrivate,
  type EntityInput,
} from "@/features/entities/data";
import { cn } from "@/lib/utils";
import {
  VISIBILITY_LABELS,
} from "@/features/entities/registry";
import {
  VISIBILITIES,
  type CharacterSheet,
  type Entity,
  type EntityPrivate,
  type FieldValue,
  type RichText,
  type Visibility,
} from "@/types/entities";

import { ALIGNMENT_OPTIONS, DND_CLASSES } from "../constants";
import {
  emptySheet,
  makeHistoryEntry,
  usePlayerRoster,
  writePublicCard,
} from "../data";
import {
  AbilitiesSection,
  ClassesSection,
  CompanionsSection,
  EquipmentSection,
  IdentitySheetSection,
  MagicSection,
  ProficienciesSection,
} from "./sheet-sections";

/**
 * Editor del personaggio (Fase 1: identità, descrizione, immagini e
 * area riservata al Master). Le sezioni della scheda D&D profonda
 * (caratteristiche, combattimento, competenze, multiclasse, equip,
 * magia) verranno aggiunte come tab in Fase 2.
 *
 * Utilizzabile dal Master/Admin su ogni personaggio e dal giocatore
 * proprietario sul proprio PC (in tal caso l'area Master è nascosta).
 */
export function CharacterFormSheet({
  open,
  onOpenChange,
  entity,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: Entity;
}) {
  const { isMaster } = useAuth();
  const { update } = useEntityMutations();
  const { data: privateData } = useEntityPrivate(
    isMaster && open ? entity.id : undefined
  );
  const { data: players } = usePlayerRoster(open && isMaster);
  const { data: quests } = useEntitiesByType("quest", open && isMaster);
  const { data: sessions } = useEntitiesByType("session", open && isMaster);

  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState<RichText>(entity.description);
  const [tags, setTags] = useState<string[]>(entity.tags);
  const [imageUrl, setImageUrl] = useState(entity.imageUrl);
  const [gallery, setGallery] = useState<string[]>(entity.gallery);
  const [race, setRace] = useState(String(entity.fields.race ?? ""));
  const [klass, setKlass] = useState(String(entity.fields.class ?? ""));
  const [level, setLevel] = useState(String(entity.fields.level ?? ""));
  const [alignment, setAlignment] = useState(
    String(entity.fields.alignment ?? "")
  );
  const [partyMember, setPartyMember] = useState(
    entity.fields.partyMember === true
  );
  const [visibility, setVisibility] = useState<Visibility>(entity.visibility);
  const [unlockAfterId, setUnlockAfterId] = useState(entity.unlockAfterId ?? "");
  const [ownerId, setOwnerId] = useState(entity.ownerId ?? "");
  const [masterNotes, setMasterNotes] = useState<RichText>("");
  const [secrets, setSecrets] = useState<RichText>("");
  const [showRace, setShowRace] = useState(entity.fields.showRace !== false);
  const [showClass, setShowClass] = useState(entity.fields.showClass !== false);
  const [sheet, setSheet] = useState<CharacterSheet>(() => emptySheet());

  const isPC = entity.fields.kind === "PC";
  const kind = isPC ? "PC" : "NPC";
  // PC: scheda sul doc (OWNER_ONLY). NPC: scheda riservata in private/master.
  const hasSheet = isPC
    ? Boolean(entity.sheet)
    : entity.fields.npcComplete === true;
  const patchSheet = (partial: Partial<CharacterSheet>) =>
    setSheet((current) => ({ ...current, ...partial }));

  // Risincronizza all'apertura e quando arrivano i dati privati.
  useEffect(() => {
    if (!open) return;
    setName(entity.name);
    setDescription(entity.description);
    setTags(entity.tags);
    setImageUrl(entity.imageUrl);
    setGallery(entity.gallery);
    // Razza/classe: pubbliche (fields) o riservate (private/master per NPC nascoste).
    setRace(
      String(entity.fields.race ?? "") || (privateData?.reservedRace ?? "")
    );
    setKlass(
      String(entity.fields.class ?? "") || (privateData?.reservedClass ?? "")
    );
    setLevel(String(entity.fields.level ?? ""));
    setAlignment(String(entity.fields.alignment ?? ""));
    setPartyMember(entity.fields.partyMember === true);
    setShowRace(entity.fields.showRace !== false);
    setShowClass(entity.fields.showClass !== false);
    setVisibility(entity.visibility);
    setUnlockAfterId(entity.unlockAfterId ?? "");
    setOwnerId(entity.ownerId ?? "");
    setMasterNotes(privateData?.masterNotes ?? "");
    setSecrets(privateData?.secrets ?? "");
    setSheet(
      isPC
        ? (entity.sheet ?? emptySheet())
        : (privateData?.reservedSheet ?? emptySheet())
    );
  }, [open, entity, privateData, isPC]);

  const handleSubmit = () => {
    if (name.trim().length < 2) {
      toast.error("Il nome è troppo corto");
      return;
    }

    // Con la scheda: la classe principale e il livello totale derivano
    // dalla multiclasse (se presente); altrimenti dai campi semplici.
    const totalLevel = sheet.classes.reduce(
      (sum, entry) => sum + (entry.level || 0),
      0
    );
    const primaryClass = sheet.classes[0]?.className ?? "";
    const derivedClass =
      hasSheet && sheet.classes.length > 0 ? primaryClass : klass.trim();
    const derivedLevel =
      hasSheet && sheet.classes.length > 0
        ? totalLevel
        : level === ""
          ? 0
          : Number(level);

    const fields: Record<string, FieldValue> = {
      ...entity.fields,
      level: derivedLevel,
      alignment,
      partyMember,
    };

    if (isPC) {
      fields.race = race.trim();
      fields.class = derivedClass;
    } else {
      // NPC: razza/classe pubbliche solo se il Master lo consente,
      // altrimenti restano nei dati riservati (non leggibili dai player).
      fields.race = showRace ? race.trim() : "";
      fields.class = showClass ? derivedClass : "";
      fields.showRace = showRace;
      fields.showClass = showClass;
    }

    const data: Partial<EntityInput> = {
      name: name.trim(),
      description,
      tags,
      imageUrl,
      gallery,
      fields,
    };

    // La scheda completa: per i PC sul doc, per gli NPC nei dati riservati.
    if (isPC && hasSheet) data.sheet = sheet;

    // Auto-evento: passaggio di livello.
    const previousLevel = Number(entity.fields.level ?? 0);
    if (derivedLevel > previousLevel) {
      data.history = [
        ...(entity.history ?? []),
        makeHistoryEntry("LEVEL_UP", `Salito a livello ${derivedLevel}`),
      ];
    }

    // Solo Master/Admin possono toccare visibilità, sblocco e proprietario.
    if (isMaster) {
      data.visibility = visibility;
      data.unlockAfterId =
        visibility === "MASTER_ONLY" && unlockAfterId ? unlockAfterId : null;
      if (isPC) {
        data.ownerId = ownerId || null;
        fields.ownerName =
          players?.find((player) => player.id === ownerId)?.username ?? "";
      }
    }

    // Dati riservati: note/segreti + (NPC) scheda e razza/classe nascoste.
    let privatePayload: EntityPrivate | undefined;
    if (isMaster) {
      privatePayload = { masterNotes, secrets };
      if (!isPC) {
        if (hasSheet) privatePayload.reservedSheet = sheet;
        privatePayload.reservedRace = showRace ? "" : race.trim();
        privatePayload.reservedClass = showClass ? "" : derivedClass;
      }
    }

    update.mutate(
      {
        entity,
        data,
        ...(privatePayload ? { privateData: privatePayload } : {}),
      },
      {
        onSuccess: () => {
          // PC: mantieni allineata la card pubblica (scheda OWNER_ONLY).
          if (isPC) {
            void writePublicCard(entity.id, {
              name: name.trim(),
              imageUrl,
              fields,
              sheet: hasSheet ? sheet : undefined,
            });
          }
          onOpenChange(false);
        },
      }
    );
  };

  const unlockOptions = [...(quests ?? []), ...(sessions ?? [])].filter(
    (option) => option.id !== entity.id
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[92vh] w-full flex-col gap-0 overflow-hidden border-gold/20 bg-card p-0",
          hasSheet ? "sm:max-w-4xl" : "sm:max-w-xl"
        )}
      >
        <DialogHeader className="border-b border-gold/15 px-6 py-4 text-left">
          <DialogTitle className="font-heading text-xl">{entity.name}</DialogTitle>
          <DialogDescription>
            Modifica la scheda di questo personaggio.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="identita" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-6 mt-4 flex w-fit max-w-[calc(100%-3rem)] overflow-x-auto">
            <TabsTrigger value="identita">Identità</TabsTrigger>
            {hasSheet && <TabsTrigger value="dettagli">Dettagli</TabsTrigger>}
            {hasSheet && (
              <TabsTrigger value="caratteristiche">Caratteristiche</TabsTrigger>
            )}
            {hasSheet && (
              <TabsTrigger value="competenze">Competenze</TabsTrigger>
            )}
            {hasSheet && <TabsTrigger value="classi">Classi</TabsTrigger>}
            {hasSheet && <TabsTrigger value="famigli">Famigli</TabsTrigger>}
            {hasSheet && <TabsTrigger value="equip">Equip.</TabsTrigger>}
            {hasSheet && <TabsTrigger value="magia">Magia</TabsTrigger>}
            <TabsTrigger value="immagini">Immagini</TabsTrigger>
            {isMaster && <TabsTrigger value="master">Master</TabsTrigger>}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {/* --------------------- Identità --------------------- */}
            <TabsContent value="identita" className="space-y-5">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razza</Label>
                  <Input
                    value={race}
                    onChange={(event) => setRace(event.target.value)}
                    placeholder="Umano, elfo…"
                  />
                </div>
                {!hasSheet && (
                  <div className="space-y-2">
                    <Label>Livello</Label>
                    <Input
                      type="number"
                      min={0}
                      value={level}
                      onChange={(event) => setLevel(event.target.value)}
                    />
                  </div>
                )}
              </div>

              {!hasSheet ? (
                <div className="space-y-2">
                  <Label>Classe / Mestiere</Label>
                  <Input
                    value={klass}
                    onChange={(event) => setKlass(event.target.value)}
                    placeholder="Ramingo, mercante…"
                    list="dnd-class-suggestions"
                  />
                  <datalist id="dnd-class-suggestions">
                    {DND_CLASSES.map((option) => (
                      <option key={option} value={option} />
                    ))}
                  </datalist>
                </div>
              ) : (
                <p className="rounded-lg border border-gold/15 bg-night/30 px-3 py-2 text-xs text-muted-foreground">
                  Classe e livello si gestiscono nella scheda «Classi»
                  (supporto multiclasse).
                </p>
              )}

              {/* NPC: cosa possono vedere i giocatori di razza e classe */}
              {!isPC && isMaster && (
                <div className="space-y-3 rounded-lg border border-gold/15 bg-night/30 px-4 py-3">
                  <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                    Visibile ai giocatori
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <Label>Mostra la razza</Label>
                    <Switch checked={showRace} onCheckedChange={setShowRace} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <Label>Mostra la classe</Label>
                    <Switch checked={showClass} onCheckedChange={setShowClass} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se disattivati, razza e classe restano riservate al Master.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Allineamento</Label>
                <Select value={alignment} onValueChange={setAlignment}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleziona…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALIGNMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-gold/15 bg-night/30 px-4 py-3">
                <Label>Membro del party</Label>
                <Switch
                  checked={partyMember}
                  onCheckedChange={setPartyMember}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrizione</Label>
                <RichTextEditor
                  value={description as RichTextValue}
                  onChange={(json) => setDescription(json)}
                  placeholder="Storia, atmosfere, dettagli…"
                  folder="character"
                />
              </div>

              <div className="space-y-2">
                <Label>Tag</Label>
                <TagInput value={tags} onChange={setTags} />
              </div>
            </TabsContent>

            {/* Sezioni della scheda D&D completa */}
            {hasSheet && (
              <>
                <TabsContent value="dettagli">
                  <IdentitySheetSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
                <TabsContent value="caratteristiche">
                  <AbilitiesSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
                <TabsContent value="competenze">
                  <ProficienciesSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
                <TabsContent value="classi">
                  <ClassesSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
                <TabsContent value="famigli">
                  <CompanionsSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
                <TabsContent value="equip">
                  <EquipmentSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
                <TabsContent value="magia">
                  <MagicSection sheet={sheet} patch={patchSheet} />
                </TabsContent>
              </>
            )}

            {/* --------------------- Immagini --------------------- */}
            <TabsContent value="immagini" className="space-y-6">
              <div className="space-y-2">
                <Label>Immagine principale</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={setImageUrl}
                  folder="character"
                />
              </div>
              <div className="space-y-2">
                <Label>Galleria</Label>
                <GalleryManager
                  value={gallery}
                  onChange={setGallery}
                  folder="character"
                />
              </div>

              {hasSheet && (
                <>
                  <div className="space-y-2 border-t border-gold/15 pt-5">
                    <Label>Token VTT</Label>
                    <ImageUpload
                      value={sheet.tokenUrl}
                      onChange={(tokenUrl) => patchSheet({ tokenUrl })}
                      folder="character"
                    />
                    <p className="text-xs text-muted-foreground">
                      Usato come ritratto nelle card del party.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Ritratti alternativi</Label>
                    <GalleryManager
                      value={sheet.altPortraits}
                      onChange={(altPortraits) => patchSheet({ altPortraits })}
                      folder="character"
                    />
                  </div>
                </>
              )}
            </TabsContent>

            {/* ---------------------- Master ---------------------- */}
            {isMaster && (
              <TabsContent value="master" className="space-y-5">
                <div className="space-y-2">
                  <Label>Visibilità</Label>
                  <Select
                    value={visibility}
                    onValueChange={(value) =>
                      setVisibility(value as Visibility)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIBILITIES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {VISIBILITY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {visibility === "MASTER_ONLY" && (
                  <div className="space-y-2">
                    <Label>Da rivelare dopo (facoltativo)</Label>
                    <Select
                      value={unlockAfterId}
                      onValueChange={setUnlockAfterId}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Quest o sessione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {unlockOptions.map((option) => (
                          <SelectItem key={option.id} value={option.id}>
                            {option.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {kind === "PC" && (
                  <div className="space-y-2">
                    <Label>Giocatore proprietario</Label>
                    <Select value={ownerId} onValueChange={setOwnerId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Nessuno" />
                      </SelectTrigger>
                      <SelectContent>
                        {(players ?? []).map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Note del Master</Label>
                  <RichTextEditor
                    value={masterNotes as RichTextValue}
                    onChange={(json) => setMasterNotes(json)}
                    placeholder="Appunti privati, agganci di trama…"
                    folder="misc"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Segreti</Label>
                  <RichTextEditor
                    value={secrets as RichTextValue}
                    onChange={(json) => setSecrets(json)}
                    placeholder="Ciò che nessun giocatore deve sapere…"
                    folder="misc"
                  />
                </div>
              </TabsContent>
            )}
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
