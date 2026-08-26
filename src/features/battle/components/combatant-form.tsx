"use client";

import { Skull, Users } from "lucide-react";
import { useState } from "react";

import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ConsoleField, ConsoleSectionHeading, ConsoleSegmented } from "@/design-system";
import {
  COMBATANT_SIDE_OPTIONS,
  ENEMY_CATEGORY_OPTIONS,
} from "@/features/battle/constants";
import { useCreateCombatants } from "@/features/battle/data";
import { useEntitiesByType } from "@/features/entities/data";
import {
  BATTLE_LIMITS,
  type Battle,
  type CombatantSide,
  type EnemyCategory,
} from "@/types/battle";

/* ============================================================
 * Nuova pedina sul campo.
 *
 * Un solo modulo per nemici, alleati e PNG: cambia la fazione, non il
 * gesto. La "Quantità" è la scorciatoia che evita al Master di creare
 * otto Goblin a mano — ci pensa l'API, con suffissi e colori distinti.
 * ============================================================ */

/** Ingombro in celle, con i nomi del manuale. */
const SIZE_OPTIONS = [
  { value: "1", label: "Media" },
  { value: "2", label: "Grande" },
  { value: "3", label: "Enorme" },
  { value: "4", label: "Mastodontica" },
];

export function CombatantForm({
  battle,
  open,
  onOpenChange,
}: {
  battle: Battle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const create = useCreateCombatants(battle.id);
  // Le pedine nascono dal codex: creature dal Bestiario, PG e PNG dai
  // Personaggi. In entrambi i casi si copia uno SNAPSHOT — modificare la
  // scheda a scontro in corso non cambia la pedina sul campo.
  const { data: bestiary } = useEntitiesByType("creature", open);
  const { data: characters } = useEntitiesByType("character", open);
  const [source, setSource] = useState<"creature" | "character">("creature");

  const [side, setSide] = useState<CombatantSide>("ENEMY");
  const [publicName, setPublicName] = useState("");
  const [realName, setRealName] = useState("");
  const [category, setCategory] = useState<EnemyCategory>("STANDARD");
  const [tokenUrl, setTokenUrl] = useState("");
  const [size, setSize] = useState("1");
  const [speed, setSpeed] = useState(9);
  const [maxHp, setMaxHp] = useState(10);
  const [armorClass, setArmorClass] = useState(12);
  const [count, setCount] = useState(1);
  const [masterNotes, setMasterNotes] = useState("");
  const [sourceEntityId, setSourceEntityId] = useState<string | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [deploy, setDeploy] = useState(true);
  const [visible, setVisible] = useState(true);

  const reset = () => {
    setPublicName("");
    setRealName("");
    setTokenUrl("");
    setMasterNotes("");
    setSourceEntityId(null);
    setOwnerId(null);
    setCount(1);
  };

  const catalogue = source === "creature" ? (bestiary ?? []) : (characters ?? []);

  /** Import dal codex: nome, ritratto e — se c'è — la scheda. */
  const importEntity = (entityId: string) => {
    const entity = catalogue.find((candidate) => candidate.id === entityId);
    if (!entity) return;
    setSourceEntityId(entity.id);
    setPublicName(entity.name);
    setTokenUrl(entity.imageUrl || "");
    if (entity.sheet) {
      setMaxHp(entity.sheet.maxHp || 10);
      setArmorClass(entity.sheet.armorClass || 12);
      const parsed = Number.parseFloat(String(entity.sheet.speed ?? ""));
      if (Number.isFinite(parsed) && parsed > 0) setSpeed(parsed);
    }
    if (source === "character") {
      // Un personaggio con un proprietario resta suo: la pedina la muove
      // il giocatore, non il Master.
      setOwnerId(entity.ownerId ?? null);
      if (entity.ownerId) setSide("PC");
    } else {
      setOwnerId(null);
    }
  };

  const submit = () => {
    const name = publicName.trim();
    if (!name) return;
    // Al centro del campo: da lì il Master trascina dove serve.
    const center = {
      x: Math.floor(battle.grid.cols / 2),
      y: Math.floor(battle.grid.rows / 2),
    };
    create.mutate(
      {
        side,
        publicName: name,
        tokenUrl,
        size: Number(size),
        category: side === "PC" ? null : category,
        sourceEntityId,
        ownerId,
        speed,
        visible,
        position: deploy ? center : null,
        count,
        secret: {
          realName: realName.trim() || undefined,
          hp: { max: maxHp, current: maxHp, temp: 0 },
          armorClass,
          masterNotes: masterNotes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nuova pedina</DialogTitle>
          <DialogDescription>
            Gli HP e il nome vero restano tuoi: finiscono nel documento
            riservato, che i giocatori non possono leggere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <ConsoleField label="Fazione">
            <ConsoleSegmented
              value={side}
              onChange={(value) => setSide(value as CombatantSide)}
              options={COMBATANT_SIDE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
            />
          </ConsoleField>

          {((bestiary ?? []).length > 0 || (characters ?? []).length > 0) && (
            <ConsoleField
              label="Dal codex"
              hint="Copia nome, ritratto e statistiche. La pedina resta indipendente dalla voce del codex."
            >
              <div className="space-y-2">
                <ConsoleSegmented
                  value={source}
                  onChange={(value) => {
                    setSource(value as "creature" | "character");
                    setSourceEntityId(null);
                  }}
                  options={[
                    { value: "creature", label: "Bestiario" },
                    { value: "character", label: "Personaggi" },
                  ]}
                />
                <Select
                  value={sourceEntityId ?? ""}
                  onValueChange={importEntity}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        source === "creature"
                          ? "Scegli una creatura…"
                          : "Scegli un personaggio…"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {catalogue.map((entity) => (
                      <SelectItem key={entity.id} value={entity.id}>
                        {entity.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </ConsoleField>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <ConsoleField label="Nome pubblico" required>
              <Input
                value={publicName}
                maxLength={BATTLE_LIMITS.maxNameLength}
                placeholder="Figura incappucciata"
                onChange={(event) => setPublicName(event.target.value)}
              />
            </ConsoleField>
            <ConsoleField
              label="Nome vero"
              hint="Solo tu lo vedi."
            >
              <Input
                value={realName}
                maxLength={BATTLE_LIMITS.maxNameLength}
                placeholder="Grimtooth"
                onChange={(event) => setRealName(event.target.value)}
              />
            </ConsoleField>
          </div>

          {side !== "PC" && (
            <ConsoleField label="Categoria" hint="Decide il colore dell'anello.">
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as EnemyCategory)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENEMY_CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ConsoleField>
          )}

          <ConsoleField label="Pedina">
            <ImageUpload value={tokenUrl} onChange={setTokenUrl} folder="token" />
          </ConsoleField>

          <div className="grid gap-4 sm:grid-cols-2">
            <ConsoleField label="Ingombro">
              <ConsoleSegmented
                value={size}
                onChange={setSize}
                options={SIZE_OPTIONS}
              />
            </ConsoleField>
            <ConsoleField label={`Movimento (${battle.grid.unit})`}>
              <Input
                type="number"
                min={0}
                step={battle.grid.cellSize}
                value={speed}
                onChange={(event) => setSpeed(Number(event.target.value))}
                className="tabular-nums"
              />
            </ConsoleField>
          </div>

          <ConsoleSectionHeading
            icon={<Skull />}
            title="Dati riservati"
            subtitle="Punti ferita e difesa: mai visibili al party."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <ConsoleField label="Punti ferita">
              <Input
                type="number"
                min={0}
                value={maxHp}
                onChange={(event) => setMaxHp(Number(event.target.value))}
                className="tabular-nums"
              />
            </ConsoleField>
            <ConsoleField label="Classe Armatura">
              <Input
                type="number"
                min={0}
                value={armorClass}
                onChange={(event) => setArmorClass(Number(event.target.value))}
                className="tabular-nums"
              />
            </ConsoleField>
          </div>
          <ConsoleField label="Note del Master">
            <Textarea
              rows={2}
              value={masterNotes}
              maxLength={BATTLE_LIMITS.maxNoteLength}
              placeholder="Fugge sotto i 10 PF; chiama rinforzi al secondo round."
              onChange={(event) => setMasterNotes(event.target.value)}
            />
          </ConsoleField>

          <ConsoleSectionHeading
            icon={<Users />}
            title="Schieramento"
            subtitle="Quante copie e dove compaiono."
          />
          <ConsoleField
            label="Quantità"
            hint={
              count > 1
                ? `Nasceranno «${publicName || "Nemico"} A», «B»… con anelli di colore diverso.`
                : undefined
            }
          >
            <Input
              type="number"
              min={1}
              max={BATTLE_LIMITS.maxDuplicateCount}
              value={count}
              onChange={(event) =>
                setCount(
                  Math.min(
                    BATTLE_LIMITS.maxDuplicateCount,
                    Math.max(1, Number(event.target.value) || 1)
                  )
                )
              }
              className="tabular-nums"
            />
          </ConsoleField>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Schiera subito al centro del campo
            </span>
            <Switch checked={deploy} onCheckedChange={setDeploy} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">
              Visibile al party (spegni per un agguato)
            </span>
            <Switch checked={visible} onCheckedChange={setVisible} />
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={submit}
            disabled={!publicName.trim() || create.isPending}
          >
            {count > 1 ? `Schiera ${count} pedine` : "Schiera la pedina"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
