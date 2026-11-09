"use client";

import {
  ArrowRightLeft,
  ArrowUpRight,
  Copy,
  FlaskConical,
  Package,
  Shield,
  ShieldPlus,
  Sparkles,
  Star,
  Swords,
  Trash2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";

import { TagInput } from "@/components/shared/tag-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useEntitiesByType, useEntity } from "@/features/entities/data";
import { ENTITY_REGISTRY } from "@/features/entities/registry";
import { TransferItemDialog } from "@/features/items/components/transfer-item-dialog";
import { useItemMutations } from "@/features/items/data";
import { RichTextRenderer } from "@/components/shared/rich-text-lazy";
import {
  isEmptyRichText,
  type RichTextValue,
} from "@/components/shared/rich-text-utils";
import { cn } from "@/lib/utils";
import {
  CONDITION_KINDS,
  RESOURCE_RECHARGES,
  type Ability,
  type ConditionEntry,
  type EquipmentCategory,
  type ResourceEntry,
} from "@/types/entities";

import {
  ABILITY_LABELS,
  ABILITY_SHORT,
  ALIGNMENT_OPTIONS,
  CONDITION_KIND_LABELS,
  CONDITION_KIND_STYLES,
  DND_CLASSES,
  EQUIPMENT_CATEGORY_LABELS,
  RESOURCE_RECHARGE_LABELS,
  SKILLS,
  abilityModifier,
  formatModifier,
} from "../constants";
import {
  useCodex,
  type CodexItemPatch,
  type InspectorTarget,
} from "./codex-context";
import {
  abilityMod,
  abilityTotal,
  factotum,
  genId,
  matchEntityByName,
  saveMod,
  skillMod,
} from "./derive";
import { InlineNumber, InlineText, InlineTextarea, Stepper } from "./inline-edit";
import { useMediaQuery } from "./use-media";

/* ============================================================
 * CodexInspector — la lente del Codex.
 *
 * Qualsiasi elemento della scheda (oggetto, incantesimo, skill,
 * caratteristica, condizione, risorsa, classe, identità, entità
 * collegata) si apre qui: un pannello flottante su vetro con
 * artwork, statistiche, modifica sul posto e azioni rapide.
 * Desktop: drawer da destra. Mobile: sheet dal basso.
 * ============================================================ */

const EQUIP_ICON: Record<EquipmentCategory, LucideIcon> = {
  weapon: Swords,
  armor: Shield,
  shield: ShieldPlus,
  magic: Sparkles,
  consumable: FlaskConical,
  misc: Package,
};

const EQUIP_TINT: Record<EquipmentCategory, string> = {
  weapon: "text-crimson-light",
  armor: "text-silver",
  shield: "text-silver",
  magic: "text-arcane-bright",
  consumable: "text-emerald-bright",
  misc: "text-muted-foreground",
};

function spellTint(level: number): string {
  if (level === 0) return "text-silver";
  if (level <= 2) return "text-emerald-bright";
  if (level <= 4) return "text-arcane-bright";
  if (level <= 6) return "text-gold-bright";
  return "text-crimson-light";
}

/* ── Building block: sezione dell'inspector ── */

function InspectorSection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-hairline px-5 py-4 first:border-t-0">
      {title && (
        <p className="mb-2.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
          {title}
        </p>
      )}
      {children}
    </section>
  );
}

function InspectorRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-9 items-center justify-between gap-3 py-0.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 items-center justify-end gap-2 text-sm text-foreground">
        {children}
      </div>
    </div>
  );
}

/** Eliminazione a due tempi: il primo click arma, il secondo conferma. */
function DangerAction({
  label,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(timer);
  }, [armed]);
  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => (armed ? onConfirm() : setArmed(true))}
      className={cn(armed && "animate-[chain-shake_300ms_ease-out]")}
    >
      <Trash2 className="size-3.5" />
      {armed ? confirmLabel : label}
    </Button>
  );
}

/** Ritratto/emblema in testa all'inspector. */
function InspectorArt({
  imageUrl,
  icon: Icon,
  tint,
  alt,
}: {
  imageUrl?: string;
  /** Lucide o emblema custom del registro entità. */
  icon: ComponentType<{ className?: string }>;
  tint?: string;
  alt: string;
}) {
  if (imageUrl) {
    return (
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={imageUrl}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, 28rem"
          className="animate-[image-reveal_420ms_var(--ease-out)_both] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-surface-1/20 to-transparent" />
      </div>
    );
  }
  return (
    <div className="grid h-28 w-full place-items-center bg-gradient-to-b from-surface-2 to-surface-1">
      <span className="grid size-16 place-items-center rounded-2xl border border-hairline-strong bg-surface-0">
        <Icon className={cn("size-8", tint ?? "text-gold")} />
      </span>
    </div>
  );
}

/* ============================================================
 * Corpi specifici per tipo di bersaglio.
 * ============================================================ */

function ItemBody({ id }: { id: string }) {
  const { items, canEdit, updateItem, removeItem, duplicateItem, inspect, place } =
    useCodex();
  const router = useRouter();
  const { consume } = useItemMutations();
  const [moveOpen, setMoveOpen] = useState(false);
  const item = items.find((entry) => entry.id === id);
  // Arricchimento: il modello del catalogo collegato (o, in mancanza,
  // un oggetto omonimo) fornisce artwork, effetti e collegamento.
  const { data: itemEntities } = useEntitiesByType("item");
  const linked = item
    ? (itemEntities ?? []).find((entity) => entity.id === item.catalogId) ??
      matchEntityByName(itemEntities, item.name)
    : undefined;

  if (!item) return <MissingBody />;
  const Icon = EQUIP_ICON[item.category];

  const patchItem = (patch: CodexItemPatch) => updateItem(id, patch);

  const duplicate = async () => {
    const copyId = await duplicateItem(id);
    if (copyId) inspect({ type: "item", id: copyId });
  };

  return (
    <>
      <InspectorArt
        imageUrl={linked?.imageUrl}
        icon={Icon}
        tint={EQUIP_TINT[item.category]}
        alt={item.name}
      />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          {EQUIPMENT_CATEGORY_LABELS[item.category]}
          {item.equipped && (
            <span className="ml-2 text-emerald-bright">· Equipaggiato</span>
          )}
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          <InlineText
            value={item.name}
            onCommit={(name) => patchItem({ name })}
            disabled={!canEdit}
            placeholder="Oggetto senza nome"
            ariaLabel="Nome dell'oggetto"
          />
        </SheetTitle>
      </SheetHeader>

      <InspectorSection>
        <InspectorRow label="Categoria">
          {canEdit ? (
            <Select
              value={item.category}
              onValueChange={(category) =>
                patchItem({ category: category as EquipmentCategory })
              }
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(
                  Object.keys(EQUIPMENT_CATEGORY_LABELS) as EquipmentCategory[]
                ).map((category) => (
                  <SelectItem key={category} value={category}>
                    {EQUIPMENT_CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            EQUIPMENT_CATEGORY_LABELS[item.category]
          )}
        </InspectorRow>
        <InspectorRow label="Quantità">
          <Stepper
            disabled={!canEdit}
            onDecrement={() =>
              patchItem({ quantity: Math.max(1, item.quantity - 1) })
            }
            onIncrement={() => patchItem({ quantity: item.quantity + 1 })}
            decrementLabel="Riduci quantità"
            incrementLabel="Aumenta quantità"
          >
            <InlineNumber
              value={item.quantity}
              min={1}
              onCommit={(quantity) => patchItem({ quantity })}
              disabled={!canEdit}
              ariaLabel="Quantità"
              className="w-8 text-center font-heading font-bold"
            />
          </Stepper>
        </InspectorRow>
        <InspectorRow label="Equipaggiato">
          <Switch
            checked={item.equipped}
            onCheckedChange={(equipped) => patchItem({ equipped })}
            disabled={!canEdit}
            aria-label="Equipaggiato"
          />
        </InspectorRow>
        {place && (
          <>
            <InspectorRow label="Sintonizzato">
              <Switch
                checked={item.attuned}
                onCheckedChange={(attuned) => patchItem({ attuned })}
                disabled={!canEdit}
                aria-label="Sintonizzato"
              />
            </InspectorRow>
            <InspectorRow label="Impilabile">
              <Switch
                checked={item.stackable}
                onCheckedChange={(stackable) => patchItem({ stackable })}
                disabled={!canEdit}
                aria-label="Impilabile (si unisce agli oggetti uguali)"
              />
            </InspectorRow>
          </>
        )}
      </InspectorSection>

      {place && canEdit && (
        <InspectorSection>
          <div className="flex flex-wrap items-center gap-2">
            {item.category === "consumable" && (
              <Button
                size="sm"
                onClick={() => consume.mutate({ itemId: id, quantity: 1 })}
                disabled={consume.isPending}
              >
                <FlaskConical className="size-3.5" />
                Usa uno
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(true)}>
              <ArrowRightLeft className="size-3.5" />
              Sposta…
            </Button>
          </div>
          <TransferItemDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            item={{
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              stackable: item.stackable,
              from: place,
            }}
          />
        </InspectorSection>
      )}

      <InspectorSection title="Note e proprietà">
        <InlineTextarea
          value={item.notes}
          onCommit={(notes) => patchItem({ notes })}
          disabled={!canEdit}
          emptyHint="Nessuna nota. Clicca per aggiungere proprietà, danni, incantamenti…"
          ariaLabel="Note dell'oggetto"
          rows={3}
        />
      </InspectorSection>

      {linked && (
        <InspectorSection title="Dal Codex del mondo">
          {Boolean(linked.fields.requiresAttunement) && (
            <Badge variant="outline" className="mb-2 border-arcane-bright/40 text-arcane-bright">
              Richiede sintonia
            </Badge>
          )}
          {Boolean(linked.fields.value) && (
            <InspectorRow label="Valore">
              <span className="text-gold-bright">{String(linked.fields.value)} mo</span>
            </InspectorRow>
          )}
          {!isEmptyRichText(linked.fields.effects as RichTextValue) && (
            <RichTextRenderer
              content={linked.fields.effects as RichTextValue}
              className="mt-1 text-sm leading-relaxed text-foreground/85"
            />
          )}
          {!isEmptyRichText(linked.description as RichTextValue) && (
            <RichTextRenderer
              content={linked.description as RichTextValue}
              className="mt-2 line-clamp-6 text-sm leading-relaxed text-foreground/75"
            />
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => router.push(`/entita/${linked.id}`)}
          >
            <ArrowUpRight className="size-3.5" />
            Apri nel Codex
          </Button>
        </InspectorSection>
      )}

      {canEdit && (
        <InspectorSection>
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" size="sm" onClick={() => void duplicate()}>
              <Copy className="size-3.5" />
              Duplica
            </Button>
            <DangerAction
              label="Elimina"
              confirmLabel="Confermi?"
              onConfirm={() => {
                removeItem(id);
                inspect(null);
              }}
            />
          </div>
        </InspectorSection>
      )}
    </>
  );
}

function SpellBody({ id }: { id: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const spell = sheet.spells.find((entry) => entry.id === id);
  if (!spell) return <MissingBody />;

  const patchSpell = (patch: Partial<typeof spell>) =>
    patchSheet({
      spells: sheet.spells.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
    });

  return (
    <>
      <InspectorArt icon={Wand2} tint={spellTint(spell.level)} alt={spell.name} />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          {spell.level === 0 ? "Trucchetto" : `Incantesimo · ${spell.level}º livello`}
          {spell.prepared && (
            <span className="ml-2 text-emerald-bright">· Preparato</span>
          )}
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          <InlineText
            value={spell.name}
            onCommit={(name) => patchSpell({ name })}
            disabled={!canEdit}
            placeholder="Incantesimo senza nome"
            ariaLabel="Nome dell'incantesimo"
          />
        </SheetTitle>
      </SheetHeader>

      <InspectorSection>
        <InspectorRow label="Livello">
          <Stepper
            disabled={!canEdit}
            onDecrement={() => patchSpell({ level: Math.max(0, spell.level - 1) })}
            onIncrement={() => patchSpell({ level: Math.min(9, spell.level + 1) })}
            decrementLabel="Livello inferiore"
            incrementLabel="Livello superiore"
          >
            <span className="w-6 text-center font-heading font-bold text-parchment">
              {spell.level}
            </span>
          </Stepper>
        </InspectorRow>
        <InspectorRow label="Preparato">
          <Switch
            checked={spell.prepared}
            onCheckedChange={(prepared) => patchSpell({ prepared })}
            disabled={!canEdit}
            aria-label="Preparato"
          />
        </InspectorRow>
        {sheet.spellcastingAbility && (
          <InspectorRow label="Caratteristica da incantatore">
            <span>{ABILITY_LABELS[sheet.spellcastingAbility]}</span>
          </InspectorRow>
        )}
      </InspectorSection>

      <InspectorSection title="Effetti e note">
        <InlineTextarea
          value={spell.notes}
          onCommit={(notes) => patchSpell({ notes })}
          disabled={!canEdit}
          emptyHint="Nessuna nota. Clicca per annotare gittata, danni, componenti…"
          ariaLabel="Note dell'incantesimo"
          rows={4}
        />
      </InspectorSection>

      {canEdit && (
        <InspectorSection>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const copy = { ...spell, id: genId(), name: `${spell.name} (copia)` };
                patchSheet({ spells: [...sheet.spells, copy] });
                inspect({ type: "spell", id: copy.id });
              }}
            >
              <Copy className="size-3.5" />
              Duplica
            </Button>
            <DangerAction
              label="Elimina"
              confirmLabel="Confermi?"
              onConfirm={() => {
                patchSheet({
                  spells: sheet.spells.filter((entry) => entry.id !== id),
                });
                inspect(null);
              }}
            />
          </div>
        </InspectorSection>
      )}
    </>
  );
}

function SkillBody({ skillKey }: { skillKey: string }) {
  const { sheet, canEdit, patchSheet } = useCodex();
  const def = SKILLS[skillKey];
  if (!def) return <MissingBody />;

  const proficient = sheet.skills.includes(skillKey);
  const expert = sheet.expertise.includes(skillKey);
  const base = abilityMod(sheet, def.ability);
  const total = skillMod(sheet, skillKey);
  const jack = factotum(sheet);

  const setProficient = (next: boolean) =>
    patchSheet({
      skills: next
        ? [...sheet.skills, skillKey]
        : sheet.skills.filter((key) => key !== skillKey),
      // Senza competenza non può esserci expertise.
      expertise: next
        ? sheet.expertise
        : sheet.expertise.filter((key) => key !== skillKey),
    });

  const setExpert = (next: boolean) =>
    patchSheet({
      expertise: next
        ? [...sheet.expertise, skillKey]
        : sheet.expertise.filter((key) => key !== skillKey),
      skills:
        next && !proficient ? [...sheet.skills, skillKey] : sheet.skills,
    });

  return (
    <>
      <InspectorArt icon={Star} alt={def.label} />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          Abilità · {ABILITY_LABELS[def.ability]}
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          {def.label}
          <span className="ml-3 align-middle font-heading text-2xl text-parchment tabular-nums">
            {formatModifier(total)}
          </span>
        </SheetTitle>
      </SheetHeader>

      <InspectorSection title="Come si compone">
        <InspectorRow label={`Modificatore di ${ABILITY_LABELS[def.ability]}`}>
          <span className="tabular-nums">{formatModifier(base)}</span>
        </InspectorRow>
        {proficient && (
          <InspectorRow label="Competenza">
            <span className="tabular-nums text-gold-bright">
              {formatModifier(sheet.proficiencyBonus)}
            </span>
          </InspectorRow>
        )}
        {expert && (
          <InspectorRow label="Expertise">
            <span className="tabular-nums text-gold-bright">
              {formatModifier(sheet.proficiencyBonus)}
            </span>
          </InspectorRow>
        )}
        {!proficient && jack && (
          <InspectorRow label={`${jack.label} (metà competenza)`}>
            <span className="tabular-nums text-gold-bright">
              {formatModifier(jack.bonus)}
            </span>
          </InspectorRow>
        )}
      </InspectorSection>

      <InspectorSection title="Competenze">
        <InspectorRow label="Competente">
          <Switch
            checked={proficient}
            onCheckedChange={setProficient}
            disabled={!canEdit}
            aria-label="Competente"
          />
        </InspectorRow>
        <InspectorRow label="Expertise (doppia competenza)">
          <Switch
            checked={expert}
            onCheckedChange={setExpert}
            disabled={!canEdit}
            aria-label="Expertise"
          />
        </InspectorRow>
      </InspectorSection>
    </>
  );
}

function AbilityBody({ ability }: { ability: Ability }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const data = sheet.abilities[ability];
  const total = abilityTotal(sheet, ability);
  const mod = abilityModifier(total);
  const saveProficient = sheet.savingThrows.includes(ability);
  const relatedSkills = Object.keys(SKILLS).filter(
    (key) => SKILLS[key].ability === ability
  );

  const patchAbility = (patch: Partial<typeof data>) =>
    patchSheet({
      abilities: { ...sheet.abilities, [ability]: { ...data, ...patch } },
    });

  return (
    <>
      <div className="grid place-items-center gap-1 bg-gradient-to-b from-surface-2 to-surface-1 py-6">
        <span className="font-heading text-[11px] font-bold tracking-[0.2em] text-gold/70">
          {ABILITY_SHORT[ability]}
        </span>
        <span className="font-heading text-5xl leading-none font-bold text-parchment tabular-nums">
          {formatModifier(mod)}
        </span>
        <span className="text-sm text-muted-foreground tabular-nums">
          punteggio {total}
          {data.tempBonus !== 0 && (
            <span className="text-gold-bright">
              {" "}
              ({data.score} {formatModifier(data.tempBonus)})
            </span>
          )}
        </span>
      </div>
      <SheetHeader className="px-5 pt-3 pb-1">
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          {ABILITY_LABELS[ability]}
        </SheetTitle>
        <SheetDescription>
          Tiro salvezza: {formatModifier(saveMod(sheet, ability))}
          {saveProficient && " · competente"}
        </SheetDescription>
      </SheetHeader>

      <InspectorSection title="Valori">
        <InspectorRow label="Punteggio base">
          <Stepper
            disabled={!canEdit}
            onDecrement={() => patchAbility({ score: Math.max(1, data.score - 1) })}
            onIncrement={() => patchAbility({ score: Math.min(30, data.score + 1) })}
            decrementLabel="Riduci punteggio"
            incrementLabel="Aumenta punteggio"
          >
            <InlineNumber
              value={data.score}
              min={1}
              max={30}
              onCommit={(score) => patchAbility({ score })}
              disabled={!canEdit}
              ariaLabel={`Punteggio di ${ABILITY_LABELS[ability]}`}
              className="w-8 text-center font-heading font-bold"
            />
          </Stepper>
        </InspectorRow>
        <InspectorRow label="Bonus temporaneo">
          <Stepper
            disabled={!canEdit}
            onDecrement={() => patchAbility({ tempBonus: data.tempBonus - 1 })}
            onIncrement={() => patchAbility({ tempBonus: data.tempBonus + 1 })}
            decrementLabel="Riduci bonus temporaneo"
            incrementLabel="Aumenta bonus temporaneo"
          >
            <InlineNumber
              value={data.tempBonus}
              onCommit={(tempBonus) => patchAbility({ tempBonus })}
              disabled={!canEdit}
              format={formatModifier}
              ariaLabel="Bonus temporaneo"
              className={cn(
                "w-9 text-center font-heading font-bold",
                data.tempBonus > 0 && "text-emerald-bright",
                data.tempBonus < 0 && "text-crimson-light"
              )}
            />
          </Stepper>
        </InspectorRow>
        <InspectorRow label="Competenza nel tiro salvezza">
          <Switch
            checked={saveProficient}
            onCheckedChange={(next) =>
              patchSheet({
                savingThrows: next
                  ? [...sheet.savingThrows, ability]
                  : sheet.savingThrows.filter((entry) => entry !== ability),
              })
            }
            disabled={!canEdit}
            aria-label="Competenza nel tiro salvezza"
          />
        </InspectorRow>
      </InspectorSection>

      {relatedSkills.length > 0 && (
        <InspectorSection title="Abilità collegate">
          <ul className="space-y-1">
            {relatedSkills.map((key) => (
              <li key={key}>
                <button
                  type="button"
                  onClick={() => inspect({ type: "skill", key })}
                  className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-surface-2"
                >
                  <span className="text-foreground/90">{SKILLS[key].label}</span>
                  <span className="font-heading font-bold text-gold-bright tabular-nums">
                    {formatModifier(skillMod(sheet, key))}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </InspectorSection>
      )}
    </>
  );
}

function ConditionBody({ id }: { id: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const condition = sheet.conditions.find((entry) => entry.id === id);
  if (!condition) return <MissingBody />;

  const patchCondition = (patch: Partial<ConditionEntry>) =>
    patchSheet({
      conditions: sheet.conditions.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
    });

  return (
    <>
      <InspectorArt
        icon={Sparkles}
        tint={
          condition.kind === "BUFF"
            ? "text-emerald-bright"
            : condition.kind === "DEBUFF"
              ? "text-crimson-light"
              : "text-ember-bright"
        }
        alt={condition.name}
      />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          Effetto attivo
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          <InlineText
            value={condition.name}
            onCommit={(name) => patchCondition({ name })}
            disabled={!canEdit}
            placeholder="Effetto senza nome"
            ariaLabel="Nome dell'effetto"
          />
        </SheetTitle>
      </SheetHeader>

      <InspectorSection>
        <InspectorRow label="Tipo">
          {canEdit ? (
            <div className="flex gap-1">
              {CONDITION_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => patchCondition({ kind })}
                  aria-pressed={condition.kind === kind}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    condition.kind === kind
                      ? CONDITION_KIND_STYLES[kind]
                      : "border-hairline text-muted-foreground hover:border-hairline-strong hover:text-foreground"
                  )}
                >
                  {CONDITION_KIND_LABELS[kind]}
                </button>
              ))}
            </div>
          ) : (
            <Badge variant="outline" className={CONDITION_KIND_STYLES[condition.kind]}>
              {CONDITION_KIND_LABELS[condition.kind]}
            </Badge>
          )}
        </InspectorRow>
        <InspectorRow label="Origine">
          <InlineText
            value={condition.source}
            onCommit={(source) => patchCondition({ source })}
            disabled={!canEdit}
            placeholder="—"
            ariaLabel="Origine dell'effetto"
            className="text-right"
          />
        </InspectorRow>
        <InspectorRow label="Durata">
          <InlineText
            value={condition.duration}
            onCommit={(duration) => patchCondition({ duration })}
            disabled={!canEdit}
            placeholder="—"
            ariaLabel="Durata dell'effetto"
            className="text-right"
          />
        </InspectorRow>
      </InspectorSection>

      <InspectorSection title="Effetto meccanico">
        <InlineTextarea
          value={condition.detail}
          onCommit={(detail) => patchCondition({ detail })}
          disabled={!canEdit}
          emptyHint="Nessun dettaglio. Clicca per descrivere l'effetto."
          ariaLabel="Dettaglio dell'effetto"
          rows={3}
        />
      </InspectorSection>

      {canEdit && (
        <InspectorSection>
          <div className="flex justify-end">
            <DangerAction
              label="Rimuovi effetto"
              confirmLabel="Confermi?"
              onConfirm={() => {
                patchSheet({
                  conditions: sheet.conditions.filter((entry) => entry.id !== id),
                });
                inspect(null);
              }}
            />
          </div>
        </InspectorSection>
      )}
    </>
  );
}

function ResourceBody({ id }: { id: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const resource = sheet.resources.find((entry) => entry.id === id);
  if (!resource) return <MissingBody />;

  const patchResource = (patch: Partial<ResourceEntry>) =>
    patchSheet({
      resources: sheet.resources.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry
      ),
    });

  return (
    <>
      <InspectorArt icon={Sparkles} tint="text-gold" alt={resource.name} />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          Risorsa · {RESOURCE_RECHARGE_LABELS[resource.recharge]}
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          <InlineText
            value={resource.name}
            onCommit={(name) => patchResource({ name })}
            disabled={!canEdit}
            placeholder="Risorsa senza nome"
            ariaLabel="Nome della risorsa"
          />
        </SheetTitle>
      </SheetHeader>

      <InspectorSection>
        <InspectorRow label="Disponibili">
          <Stepper
            disabled={!canEdit}
            onDecrement={() =>
              patchResource({ current: Math.max(0, resource.current - 1) })
            }
            onIncrement={() =>
              patchResource({
                current: Math.min(resource.max, resource.current + 1),
              })
            }
            decrementLabel="Spendi un uso"
            incrementLabel="Recupera un uso"
          >
            <span className="min-w-10 text-center font-heading font-bold text-parchment tabular-nums">
              {resource.current}/{resource.max}
            </span>
          </Stepper>
        </InspectorRow>
        <InspectorRow label="Massimo">
          <Stepper
            disabled={!canEdit}
            onDecrement={() => {
              const max = Math.max(1, resource.max - 1);
              patchResource({ max, current: Math.min(resource.current, max) });
            }}
            onIncrement={() => patchResource({ max: resource.max + 1 })}
            decrementLabel="Riduci massimo"
            incrementLabel="Aumenta massimo"
          >
            <span className="w-6 text-center font-heading font-bold tabular-nums">
              {resource.max}
            </span>
          </Stepper>
        </InspectorRow>
        <InspectorRow label="Ricarica">
          {canEdit ? (
            <Select
              value={resource.recharge}
              onValueChange={(recharge) =>
                patchResource({
                  recharge: recharge as ResourceEntry["recharge"],
                })
              }
            >
              <SelectTrigger size="sm" className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_RECHARGES.map((recharge) => (
                  <SelectItem key={recharge} value={recharge}>
                    {RESOURCE_RECHARGE_LABELS[recharge]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            RESOURCE_RECHARGE_LABELS[resource.recharge]
          )}
        </InspectorRow>
      </InspectorSection>

      {canEdit && (
        <InspectorSection>
          <div className="flex justify-end">
            <DangerAction
              label="Rimuovi risorsa"
              confirmLabel="Confermi?"
              onConfirm={() => {
                patchSheet({
                  resources: sheet.resources.filter((entry) => entry.id !== id),
                });
                inspect(null);
              }}
            />
          </div>
        </InspectorSection>
      )}
    </>
  );
}

function ClassBody({ id }: { id: string }) {
  const { sheet, canEdit, patchSheet, inspect } = useCodex();
  const entry = sheet.classes.find((klass) => klass.id === id);
  if (!entry) return <MissingBody />;

  const patchClass = (patch: Partial<typeof entry>) =>
    patchSheet({
      classes: sheet.classes.map((klass) =>
        klass.id === id ? { ...klass, ...patch } : klass
      ),
    });

  return (
    <>
      <InspectorArt icon={Swords} alt={entry.className} />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          Classe · livello {entry.level}
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          <InlineText
            value={entry.className}
            onCommit={(className) => patchClass({ className })}
            disabled={!canEdit}
            placeholder="Classe"
            ariaLabel="Nome della classe"
          />
        </SheetTitle>
      </SheetHeader>

      <InspectorSection>
        <InspectorRow label="Sottoclasse">
          <InlineText
            value={entry.subclass}
            onCommit={(subclass) => patchClass({ subclass })}
            disabled={!canEdit}
            placeholder="—"
            ariaLabel="Sottoclasse"
            className="text-right"
          />
        </InspectorRow>
        <InspectorRow label="Livello">
          <Stepper
            disabled={!canEdit}
            onDecrement={() => patchClass({ level: Math.max(1, entry.level - 1) })}
            onIncrement={() => patchClass({ level: Math.min(20, entry.level + 1) })}
            decrementLabel="Riduci livello"
            incrementLabel="Aumenta livello"
          >
            <span className="w-6 text-center font-heading font-bold text-parchment tabular-nums">
              {entry.level}
            </span>
          </Stepper>
        </InspectorRow>
      </InspectorSection>

      {canEdit && (
        <InspectorSection>
          <p className="mb-3 text-xs text-muted-foreground">
            Suggerimenti: {DND_CLASSES.join(", ")}.
          </p>
          {sheet.classes.length > 1 && (
            <div className="flex justify-end">
              <DangerAction
                label="Rimuovi classe"
                confirmLabel="Confermi?"
                onConfirm={() => {
                  patchSheet({
                    classes: sheet.classes.filter((klass) => klass.id !== id),
                  });
                  inspect(null);
                }}
              />
            </div>
          )}
        </InspectorSection>
      )}
    </>
  );
}

function IdentityBody() {
  const { entity, sheet, hasSheet, canEdit, isMaster, isOwner, patchSheet, patchFields } =
    useCodex();

  const race = String(entity.fields.race ?? "");
  const alignment = String(entity.fields.alignment ?? "");

  return (
    <>
      <InspectorArt imageUrl={entity.imageUrl} icon={Star} alt={entity.name} />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          Identità
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          {entity.name}
        </SheetTitle>
      </SheetHeader>

      <InspectorSection title="Origini">
        <InspectorRow label="Razza">
          <InlineText
            value={race}
            onCommit={(next) => patchFields({ race: next })}
            disabled={!canEdit}
            ariaLabel="Razza"
            className="text-right"
          />
        </InspectorRow>
        {hasSheet && (
          <>
            <InspectorRow label="Sottorazza">
              <InlineText
                value={sheet.subrace}
                onCommit={(subrace) => patchSheet({ subrace })}
                disabled={!canEdit}
                ariaLabel="Sottorazza"
                className="text-right"
              />
            </InspectorRow>
            <InspectorRow label="Background">
              <InlineText
                value={sheet.background}
                onCommit={(background) => patchSheet({ background })}
                disabled={!canEdit}
                ariaLabel="Background"
                className="text-right"
              />
            </InspectorRow>
            <InspectorRow label="Divinità">
              <InlineText
                value={sheet.deity}
                onCommit={(deity) => patchSheet({ deity })}
                disabled={!canEdit}
                ariaLabel="Divinità"
                className="text-right"
              />
            </InspectorRow>
          </>
        )}
        <InspectorRow label="Allineamento">
          {canEdit ? (
            <Select
              value={alignment}
              onValueChange={(next) => patchFields({ alignment: next })}
            >
              <SelectTrigger size="sm" className="w-44">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                {ALIGNMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            alignment || "—"
          )}
        </InspectorRow>
      </InspectorSection>

      {hasSheet && (
        <>
          <InspectorSection title="Aspetto">
            {(
              [
                ["Genere", "gender"],
                ["Età", "age"],
                ["Altezza", "height"],
                ["Peso", "weight"],
              ] as const
            ).map(([label, key]) => (
              <InspectorRow key={key} label={label}>
                <InlineText
                  value={sheet[key]}
                  onCommit={(next) => patchSheet({ [key]: next })}
                  disabled={!canEdit}
                  ariaLabel={label}
                  className="text-right"
                />
              </InspectorRow>
            ))}
          </InspectorSection>

          <InspectorSection title="Lingue">
            {canEdit ? (
              <TagInput
                value={sheet.languages}
                onChange={(languages) => patchSheet({ languages })}
              />
            ) : sheet.languages.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {sheet.languages.map((language) => (
                  <Badge key={language} variant="outline" className="border-hairline-strong">
                    {language}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Nessuna lingua registrata.
              </p>
            )}
          </InspectorSection>

          <InspectorSection title="Progressione">
            <InspectorRow label="Punti esperienza">
              <InlineNumber
                value={sheet.xp}
                min={0}
                onCommit={(xp) => patchSheet({ xp })}
                disabled={!canEdit}
                ariaLabel="Punti esperienza"
                className="text-right font-heading font-bold text-gold-bright"
              />
            </InspectorRow>
            <InspectorRow label="Ispirazione">
              <Switch
                checked={sheet.inspiration}
                onCheckedChange={(inspiration) => patchSheet({ inspiration })}
                disabled={!canEdit}
                aria-label="Ispirazione"
              />
            </InspectorRow>
            <InspectorRow label="Indebolimento (0–6)">
              <Stepper
                disabled={!canEdit}
                onDecrement={() =>
                  patchSheet({ exhaustion: Math.max(0, sheet.exhaustion - 1) })
                }
                onIncrement={() =>
                  patchSheet({ exhaustion: Math.min(6, sheet.exhaustion + 1) })
                }
                decrementLabel="Riduci indebolimento"
                incrementLabel="Aumenta indebolimento"
              >
                <span
                  className={cn(
                    "w-6 text-center font-heading font-bold tabular-nums",
                    sheet.exhaustion > 0 ? "text-crimson-light" : "text-parchment"
                  )}
                >
                  {sheet.exhaustion}
                </span>
              </Stepper>
            </InspectorRow>
          </InspectorSection>
        </>
      )}

      {(isMaster || isOwner) && String(entity.fields.ownerName ?? "") && (
        <InspectorSection title="Fuori dal mondo">
          <InspectorRow label="Giocatore">
            <span>{String(entity.fields.ownerName)}</span>
          </InspectorRow>
        </InspectorSection>
      )}
    </>
  );
}

function EntityBody({ id }: { id: string }) {
  const router = useRouter();
  const { data: entity, isLoading } = useEntity(id);

  if (isLoading) {
    return (
      <div className="grid h-40 place-items-center text-sm text-muted-foreground">
        Consulto il Codex…
      </div>
    );
  }
  if (!entity) return <MissingBody />;

  const config = ENTITY_REGISTRY[entity.type];

  return (
    <>
      <InspectorArt imageUrl={entity.imageUrl} icon={config.icon} alt={entity.name} />
      <SheetHeader className="px-5 pt-4 pb-1">
        <SheetDescription className="text-[11px] font-semibold tracking-[0.12em] uppercase">
          {config.label}
        </SheetDescription>
        <SheetTitle className="text-gold-gradient font-heading text-2xl font-bold tracking-wide">
          {entity.name}
        </SheetTitle>
      </SheetHeader>
      {!isEmptyRichText(entity.description as RichTextValue) && (
        <InspectorSection>
          <RichTextRenderer
            content={entity.description as RichTextValue}
            className="line-clamp-[12] text-sm leading-relaxed text-foreground/85"
          />
        </InspectorSection>
      )}
      <InspectorSection>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/entita/${entity.id}`)}
        >
          <ArrowUpRight className="size-3.5" />
          Apri la pagina completa
        </Button>
      </InspectorSection>
    </>
  );
}

function MissingBody() {
  return (
    <div className="grid h-40 place-items-center px-6 text-center text-sm text-muted-foreground">
      Questa voce non esiste più nella scheda.
    </div>
  );
}

/* ============================================================
 * Il contenitore: drawer da destra (desktop) / dal basso (mobile).
 * ============================================================ */

function InspectorBody({ target }: { target: InspectorTarget }) {
  switch (target.type) {
    case "item":
      return <ItemBody id={target.id} />;
    case "spell":
      return <SpellBody id={target.id} />;
    case "skill":
      return <SkillBody skillKey={target.key} />;
    case "ability":
      return <AbilityBody ability={target.ability} />;
    case "condition":
      return <ConditionBody id={target.id} />;
    case "resource":
      return <ResourceBody id={target.id} />;
    case "class":
      return <ClassBody id={target.id} />;
    case "identity":
      return <IdentityBody />;
    case "entity":
      return <EntityBody id={target.id} />;
  }
}

export function CodexInspector() {
  const { inspectorTarget, inspect } = useCodex();
  const isMobile = useMediaQuery("(max-width: 639px)");

  // Chiave che forza il remount del corpo quando cambia il bersaglio
  // (l'animazione di ingresso riparte, gli stati locali si azzerano).
  const bodyKey = inspectorTarget
    ? Object.values(inspectorTarget).join(":")
    : "none";

  return (
    <Sheet
      open={inspectorTarget !== null}
      onOpenChange={(open) => {
        if (!open) inspect(null);
      }}
    >
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "gap-0 overflow-hidden border-hairline-strong bg-surface-1 p-0",
          isMobile
            ? "max-h-[86dvh] rounded-t-2xl"
            : "data-[side=right]:sm:max-w-[26rem]"
        )}
      >
        {isMobile && (
          <div
            aria-hidden
            className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-hairline-strong"
          />
        )}
        <ScrollArea className="min-h-0 flex-1">
          {inspectorTarget && (
            <div
              key={bodyKey}
              className="animate-[fade-up_240ms_var(--ease-out)_both] pb-4"
            >
              <InspectorBody target={inspectorTarget} />
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
