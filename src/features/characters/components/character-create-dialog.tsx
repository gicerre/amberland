"use client";

import { Loader2, Sparkles, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ImageUpload } from "@/components/shared/image-upload";
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
import {
  ConsoleField,
  ConsoleSegmented,
  ImmersiveModal,
} from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import {
  useEntityMutations,
  useRelationMutations,
} from "@/features/entities/data";
import { EntityMultiPicker } from "@/components/shared/entity-multi-picker";
import { cn } from "@/lib/utils";
import { VISIBILITY_LABELS } from "@/features/entities/registry";
import {
  VISIBILITIES,
  type CharacterKind,
  type Entity,
  type Visibility,
} from "@/types/entities";

import { buildCharacterInput, usePlayerRoster, writePublicCard } from "../data";

type NpcMode = "quick" | "full";

interface CharacterCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Forza un tipo (es. PC per i giocatori): nasconde il selettore. */
  lockKind?: CharacterKind;
  /** Chiamata appena il personaggio è stato creato (con il suo id). */
  onCreated?: (id: string) => void;
  /** Se false, non naviga alla pagina del personaggio dopo la creazione. */
  navigateOnCreate?: boolean;
}

/**
 * Creazione unificata di un personaggio:
 * - PC: associato a un account giocatore (proprietario).
 * - NPC «rapido»: campi minimi + luogo, creato all'istante.
 * - NPC «completo»: scheda D&D completa da compilare nella sua pagina.
 */
export function CharacterCreateDialog({
  open,
  onOpenChange,
  lockKind,
  onCreated,
  navigateOnCreate = true,
}: CharacterCreateDialogProps) {
  const router = useRouter();
  const { user, profile, isMaster } = useAuth();
  const { create } = useEntityMutations();
  const { add: addRelation } = useRelationMutations();

  const initialKind: CharacterKind = lockKind ?? (isMaster ? "NPC" : "PC");
  const [kind, setKind] = useState<CharacterKind>(initialKind);
  const [npcMode, setNpcMode] = useState<NpcMode>("quick");

  const [name, setName] = useState("");
  const [race, setRace] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  // Collegamenti a qualsiasi entità (luoghi, fazioni, eventi, oggetti…).
  const [linkedEntities, setLinkedEntities] = useState<Entity[]>([]);
  const [ownerId, setOwnerId] = useState("");
  // NPC: visibilità obbligatoria scelta dal Master.
  const [visibility, setVisibility] = useState<Visibility | "">("");

  const { data: players } = usePlayerRoster(open && isMaster && kind === "PC");

  const isQuickNpc = kind === "NPC" && npcMode === "quick";
  const isNpc = kind === "NPC";
  const canSubmit =
    name.trim().length >= 2 &&
    !create.isPending &&
    (!isNpc || visibility !== "");

  const reset = () => {
    setName("");
    setRace("");
    setDescription("");
    setImageUrl("");
    setLinkedEntities([]);
    setOwnerId("");
    setVisibility("");
    setKind(initialKind);
    setNpcMode("quick");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    // Proprietario del PC: il giocatore crea per sé; il Master sceglie.
    let resolvedOwnerId: string | null = null;
    let resolvedOwnerName = "";
    if (kind === "PC") {
      if (isMaster) {
        resolvedOwnerId = ownerId || null;
        resolvedOwnerName =
          players?.find((player) => player.id === ownerId)?.username ?? "";
      } else {
        resolvedOwnerId = user?.uid ?? null;
        resolvedOwnerName = profile?.username ?? "";
      }
    }

    const data = buildCharacterInput(kind, name, {
      race: isQuickNpc ? race : undefined,
      description: isQuickNpc ? description : undefined,
      complete: kind === "NPC" ? npcMode === "full" : undefined,
      ownerId: resolvedOwnerId,
      ownerName: resolvedOwnerName,
      visibility: isNpc && visibility !== "" ? visibility : undefined,
    });
    data.imageUrl = isQuickNpc ? imageUrl : "";

    create.mutate(
      { data },
      {
        onSuccess: (id) => {
          // PC: crea subito la card pubblica (la scheda è OWNER_ONLY).
          if (kind === "PC") {
            void writePublicCard(id, {
              name: data.name,
              imageUrl: data.imageUrl,
              fields: data.fields,
              sheet: data.sheet,
            });
          }
          // Collega subito alle entità scelte (di qualsiasi tipo).
          if (linkedEntities.length > 0) {
            const from = {
              id,
              type: "character",
              name: name.trim(),
            } as Entity;
            for (const target of linkedEntities) {
              addRelation.mutate({
                from,
                to: target,
                label: target.type === "location" ? "Si trova a" : "Collegato a",
              });
            }
          }
          reset();
          onOpenChange(false);
          onCreated?.(id);
          if (navigateOnCreate) router.push(`/entita/${id}`);
        },
      }
    );
  };

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={(value) => {
        if (!value) reset();
        onOpenChange(value);
      }}
      size="md"
      icon={<UserPlus />}
      title="Registro Anagrafico della Gilda"
      description={
        kind === "PC"
          ? "Un personaggio giocante con scheda D&D completa."
          : isQuickNpc
            ? "Un PNG al volo: bastano nome e razza."
            : "Un PNG con scheda completa da compilare."
      }
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {create.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            Iscrivi nel Registro
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Tipo PC / NPC (solo Master/Admin) */}
        {!lockKind && isMaster && (
          <ConsoleField label="Tipo">
            <ConsoleSegmented<CharacterKind>
              options={[
                { value: "NPC", label: "PNG" },
                { value: "PC", label: "Giocante" },
              ]}
              value={kind}
              onChange={setKind}
            />
          </ConsoleField>
        )}

        {/* Modalità NPC */}
        {kind === "NPC" && (
          <ConsoleField label="Modalità">
            <ConsoleSegmented<NpcMode>
              options={[
                { value: "quick", label: "Rapido" },
                { value: "full", label: "Completo" },
              ]}
              value={npcMode}
              onChange={setNpcMode}
            />
          </ConsoleField>
        )}

        <ConsoleField label="Nome">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) =>
              event.key === "Enter" && !isQuickNpc && handleSubmit()
            }
            placeholder="Nome del personaggio"
          />
        </ConsoleField>

        {/* Visibilità obbligatoria per gli NPC */}
        {isNpc && (
          <ConsoleField label="Visibilità" required>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as Visibility)}
            >
              <SelectTrigger
                className={cn(
                  "w-full",
                  visibility === "" && "border-crimson-bright/50"
                )}
              >
                <SelectValue placeholder="Scegli chi può vederlo…" />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITIES.map((value) => (
                  <SelectItem key={value} value={value}>
                    {VISIBILITY_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConsoleField>
        )}

        {/* Proprietario del PC */}
        {kind === "PC" && isMaster && (
          <ConsoleField
            label="Giocatore proprietario"
            hint={
              (players ?? []).length === 0
                ? "Nessun account giocatore disponibile. Potrai assegnarlo dopo."
                : undefined
            }
          >
            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Assegna un giocatore…" />
              </SelectTrigger>
              <SelectContent>
                {(players ?? []).map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConsoleField>
        )}
        {kind === "PC" && !isMaster && (
          <p className="rounded-md border border-hairline bg-night/30 px-3 py-2 text-xs text-muted-foreground">
            Questo personaggio sarà tuo: potrai gestirne la scheda.
          </p>
        )}

        {/* Campi NPC rapido */}
        {isQuickNpc && (
          <>
            <ConsoleField label="Razza">
              <Input
                value={race}
                onChange={(event) => setRace(event.target.value)}
                placeholder="Umano, elfo, orco…"
              />
            </ConsoleField>
            <ConsoleField label="Collegamenti (luoghi, fazioni, eventi, oggetti…)">
              <EntityMultiPicker
                value={linkedEntities}
                onChange={setLinkedEntities}
                placeholder="Cerca un'entità da collegare…"
              />
            </ConsoleField>
            <ConsoleField label="Descrizione breve">
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="Chi è, in poche parole…"
              />
            </ConsoleField>
            <ConsoleField label="Immagine (opzionale)">
              <ImageUpload
                value={imageUrl}
                onChange={setImageUrl}
                folder="character"
              />
            </ConsoleField>
          </>
        )}
      </div>
    </ImmersiveModal>
  );
}
