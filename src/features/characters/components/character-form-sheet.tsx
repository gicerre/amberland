"use client";

import {
  BookText,
  Dices,
  Images,
  Loader2,
  PawPrint,
  ScrollText,
  Shield,
  ShieldAlert,
  Sparkles,
  Swords,
  User,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useCelebration } from "@/components/shared/celebration";
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
import { Switch } from "@/components/ui/switch";
import {
  ConsoleNav,
  ConsolePanel,
  FormConsole,
  ImmersiveModal,
  type ConsoleSection,
} from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useEntitiesByType,
  useEntityMutations,
  useEntityPrivate,
  type EntityInput,
} from "@/features/entities/data";
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
  normalizeSheet,
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
  const { trigger: triggerCelebration } = useCelebration();
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
  const [section, setSection] = useState("identita");

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
    setSection("identita");
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
    // normalizeSheet: i documenti legacy non hanno condizioni/risorse/XP.
    setSheet(
      isPC ? normalizeSheet(entity.sheet) : normalizeSheet(privateData?.reservedSheet)
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
    const isLevelUp = derivedLevel > previousLevel;
    if (isLevelUp) {
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
          if (isLevelUp) {
            triggerCelebration({ type: "level-up", characterName: name.trim(), level: derivedLevel });
          }
          onOpenChange(false);
        },
      }
    );
  };

  const unlockOptions = [...(quests ?? []), ...(sessions ?? [])].filter(
    (option) => option.id !== entity.id
  );

  const sections: ConsoleSection[] = useMemo(() => {
    const list: ConsoleSection[] = [
      { id: "identita", label: "Identità", icon: <User /> },
    ];
    if (hasSheet) {
      list.push(
        { id: "dettagli", label: "Dettagli", icon: <ScrollText /> },
        { id: "caratteristiche", label: "Caratteristiche", icon: <Dices /> },
        { id: "competenze", label: "Competenze", icon: <BookText /> },
        { id: "classi", label: "Classi", icon: <Swords /> },
        { id: "famigli", label: "Famigli", icon: <PawPrint /> },
        { id: "equip", label: "Equipaggiamento", icon: <Shield /> },
        { id: "magia", label: "Magia", icon: <Sparkles /> }
      );
    }
    list.push({ id: "immagini", label: "Immagini", icon: <Images /> });
    if (isMaster) {
      list.push({ id: "master", label: "Sala del Master", icon: <ShieldAlert /> });
    }
    return list;
  }, [hasSheet, isMaster]);

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      flush
      icon={<User />}
      title={name || entity.name}
      description="Modifica la scheda di questo personaggio."
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
        aside={
          <div className="space-y-3">
            <p className="font-heading text-[0.65rem] font-semibold tracking-[0.18em] text-gold/50 uppercase">
              Anteprima
            </p>
            <div className="overflow-hidden rounded-lg border border-hairline-strong bg-stone-mid/70 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.8)]">
              <div className="relative aspect-[4/3] w-full bg-night/60">
                {imageUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-gold/25">
                    <User className="size-12" />
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 to-transparent" />
                <span className="absolute top-2 left-2 rounded border border-gold/30 bg-black/50 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide text-gold-bright">
                  {kind}
                </span>
              </div>
              <div className="space-y-1.5 p-3">
                <h4 className="font-heading text-base leading-tight text-foreground">
                  {name || "Senza nome"}
                </h4>
                {(race || klass) && (
                  <p className="text-xs text-muted-foreground">
                    {[race, klass].filter(Boolean).join(" · ")}
                  </p>
                )}
                <span className="inline-block rounded border border-hairline-strong bg-gold/10 px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide text-gold/80">
                  {VISIBILITY_LABELS[visibility]}
                </span>
              </div>
            </div>
          </div>
        }
      >
        {/* --------------------- Identità --------------------- */}
        {section === "identita" && (
          <ConsolePanel sectionKey="identita">
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
                <p className="rounded-lg border border-hairline bg-night/30 px-3 py-2 text-xs text-muted-foreground">
                  Classe e livello si gestiscono nella scheda «Classi»
                  (supporto multiclasse).
                </p>
              )}

              {/* NPC: cosa possono vedere i giocatori di razza e classe */}
              {!isPC && isMaster && (
                <div className="space-y-3 rounded-lg border border-hairline bg-night/30 px-4 py-3">
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

              <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-night/30 px-4 py-3">
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
          </ConsolePanel>
        )}

        {/* Sezioni della scheda D&D completa */}
        {section === "dettagli" && (
          <ConsolePanel sectionKey="dettagli">
            <IdentitySheetSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}
        {section === "caratteristiche" && (
          <ConsolePanel sectionKey="caratteristiche">
            <AbilitiesSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}
        {section === "competenze" && (
          <ConsolePanel sectionKey="competenze">
            <ProficienciesSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}
        {section === "classi" && (
          <ConsolePanel sectionKey="classi">
            <ClassesSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}
        {section === "famigli" && (
          <ConsolePanel sectionKey="famigli">
            <CompanionsSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}
        {section === "equip" && (
          <ConsolePanel sectionKey="equip">
            <EquipmentSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}
        {section === "magia" && (
          <ConsolePanel sectionKey="magia">
            <MagicSection sheet={sheet} patch={patchSheet} />
          </ConsolePanel>
        )}

        {/* --------------------- Immagini --------------------- */}
        {section === "immagini" && (
          <ConsolePanel sectionKey="immagini">
            <div className="space-y-6">
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
                  <div className="space-y-2 border-t border-hairline pt-5">
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
            </div>
          </ConsolePanel>
        )}

        {/* ---------------------- Master ---------------------- */}
        {isMaster && section === "master" && (
          <ConsolePanel sectionKey="master">
            <div className="space-y-5">
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
            </div>
          </ConsolePanel>
        )}
      </FormConsole>
    </ImmersiveModal>
  );
}
