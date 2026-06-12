"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Minus,
  Plus,
  Scroll,
  Shield,
  Sparkles,
  Swords,
  User,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
import { ImageUpload } from "@/components/shared/image-upload";
import { Badge } from "@/components/ui/badge";
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
import { useAuth } from "@/features/auth/auth-provider";
import { useEntityMutations } from "@/features/entities/data";
import { cn } from "@/lib/utils";
import { ABILITIES, type Ability } from "@/types/entities";
import type { ClassEntry } from "@/types/entities";

import {
  ABILITY_LABELS,
  ABILITY_SHORT,
  ALIGNMENT_OPTIONS,
  DND_CLASSES,
  abilityModifier,
  formatModifier,
} from "../constants";
import { buildPcInput, writePublicCard, type PcWizardDraft } from "../data";

const STEPS = [
  { label: "Identità", hint: "Chi sei" },
  { label: "Origini e Classe", hint: "Stirpe e arte" },
  { label: "Aspetto", hint: "Corpo e indole" },
  { label: "Caratteristiche", hint: "Le tue doti" },
  { label: "Riepilogo", hint: "Il tuo eroe" },
] as const;

const STEP_IMAGES = [
  "/img/step_0.webp",
  "/img/step_1.webp",
  "/img/step_2.webp",
  "/img/step_3.webp",
  "/img/step_4.webp",
];

type Abilities = Record<Ability, number>;
const DEFAULT_ABILITIES: Abilities = {
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
};

interface DraftState {
  step: number;
  name: string;
  imageUrl: string;
  race: string;
  primaryClass: string;
  primarySubclass: string;
  primaryLevel: number;
  multiclass: string;
  multiclassLevel: number;
  alignment: string;
  gender: string;
  height: string;
  age: string;
  weight: string;
  abilities: Abilities;
}

const EMPTY: DraftState = {
  step: 0,
  name: "",
  imageUrl: "",
  race: "",
  primaryClass: "",
  primarySubclass: "",
  primaryLevel: 1,
  multiclass: "",
  multiclassLevel: 1,
  alignment: "",
  gender: "",
  height: "",
  age: "",
  weight: "",
  abilities: DEFAULT_ABILITIES,
};

/**
 * Wizard di prima creazione del PC: esperienza guidata, immersiva e a
 * step, salvata con lo stesso modello dati dei PC esistenti (vedi
 * buildPcInput). Usato dal gate del primo accesso.
 */
export function PcCreationWizard({
  onCreated,
}: {
  onCreated: (id: string) => void;
}) {
  const { user, profile } = useAuth();
  const { create } = useEntityMutations();
  const storageKey = user ? `amberland:pc-wizard:${user.uid}` : null;

  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  // Ripristino dello stato salvato (bozza temporanea).
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<DraftState>;
        setDraft({ ...EMPTY, ...saved, abilities: { ...DEFAULT_ABILITIES, ...saved.abilities } });
      }
    } catch {
      /* bozza non valida: si riparte puliti */
    }
    setHydrated(true);
  }, [storageKey]);

  // Salvataggio temporaneo a ogni modifica.
  useEffect(() => {
    if (!storageKey || !hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      /* quota piena: ignoriamo */
    }
  }, [draft, storageKey, hydrated]);

  const set = <K extends keyof DraftState>(key: K, value: DraftState[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const setAbility = (ability: Ability, value: number) =>
    setDraft((current) => ({
      ...current,
      abilities: {
        ...current.abilities,
        [ability]: Math.min(30, Math.max(1, value)),
      },
    }));

  const step = draft.step;
  const totalLevel =
    Math.max(1, draft.primaryLevel) +
    (draft.multiclass.trim() ? Math.max(1, draft.multiclassLevel) : 0);

  const stepValid = useMemo(() => {
    switch (step) {
      case 0:
        return draft.name.trim().length >= 2;
      case 1:
        return (
          draft.primaryClass.trim().length >= 2 &&
          draft.race.trim().length >= 2 &&
          draft.primaryLevel >= 1
        );
      default:
        return true;
    }
  }, [step, draft]);

  const goNext = () => {
    if (!stepValid) return;
    set("step", Math.min(STEPS.length - 1, step + 1));
  };
  const goBack = () => set("step", Math.max(0, step - 1));

  const confirm = () => {
    if (!user || create.isPending) return;
    const classes: ClassEntry[] = [
      {
        id: crypto.randomUUID(),
        className: draft.primaryClass.trim(),
        subclass: draft.primarySubclass.trim(),
        level: Math.max(1, draft.primaryLevel),
      },
    ];
    if (draft.multiclass.trim()) {
      classes.push({
        id: crypto.randomUUID(),
        className: draft.multiclass.trim(),
        subclass: "",
        level: Math.max(1, draft.multiclassLevel),
      });
    }
    const abilities = Object.fromEntries(
      ABILITIES.map((a) => [a, { score: draft.abilities[a], tempBonus: 0 }])
    ) as PcWizardDraft["abilities"];

    const input = buildPcInput(
      {
        name: draft.name,
        imageUrl: draft.imageUrl,
        race: draft.race,
        classes,
        alignment: draft.alignment,
        gender: draft.gender,
        height: draft.height,
        age: draft.age,
        weight: draft.weight,
        abilities,
      },
      { id: user.uid, name: profile?.username ?? "" }
    );

    create.mutate(
      { data: input },
      {
        onSuccess: (id) => {
          void writePublicCard(id, {
            name: input.name,
            imageUrl: input.imageUrl,
            fields: input.fields,
            sheet: input.sheet,
          });
          if (storageKey) localStorage.removeItem(storageKey);
          onCreated(id);
        },
      }
    );
  };

  return (
    <div className="relative min-h-svh overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_55%)]" />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        {/* Titolo */}
        <div className="mb-6 text-center">
          <h1 className="text-gold-gradient font-heading text-3xl font-bold tracking-wider sm:text-4xl">
            Crea il tuo eroe
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Un passo alla volta, dai vita al personaggio che ti accompagnerà ad
            Amberland.
          </p>
        </div>

        {/* Stepper */}
        <Stepper current={step} onJump={(s) => s <= step && set("step", s)} />

        {/* Card a due colonne */}
        <div className="mt-6 flex flex-col-reverse overflow-hidden rounded-2xl border border-gold/30 bg-card/80 shadow-[0_0_50px_rgba(0,0,0,0.35)] lg:grid lg:grid-cols-[44%_56%]">
          {/* Colonna sinistra — contenuto step */}
          <div className="relative p-6 sm:p-8">
            <CornerOrnaments className="size-4 border-gold/40" />
            <div
              key={step}
              className="animate-in fade-in-50 slide-in-from-bottom-2 space-y-5 duration-300"
            >
              {step === 0 && (
                <StepIdentity draft={draft} set={set} />
              )}
              {step === 1 && (
                <StepOrigins
                  draft={draft}
                  set={set}
                  totalLevel={totalLevel}
                />
              )}
              {step === 2 && <StepAppearance draft={draft} set={set} />}
              {step === 3 && (
                <StepAbilities abilities={draft.abilities} setAbility={setAbility} />
              )}
              {step === 4 && <StepSummary draft={draft} totalLevel={totalLevel} />}
            </div>
          </div>

          {/* Colonna destra — illustrazione + preview live */}
          <div className="relative h-52 lg:h-auto">
            <Image
              src={STEP_IMAGES[step]}
              alt={STEPS[step].label}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 56vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-night/90 via-night/20 to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-night/10 lg:to-night/80" />
            <CharacterPreview draft={draft} totalLevel={totalLevel} />
          </div>
        </div>

        {/* Navigazione */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={step === 0}
            className="min-w-32"
          >
            <ChevronLeft className="size-4" />
            Indietro
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={goNext} disabled={!stepValid} className="min-w-32">
              Avanti
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              onClick={confirm}
              disabled={create.isPending}
              className="min-w-56"
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              Conferma e crea personaggio
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Stepper ----------------------------- */

function Stepper({
  current,
  onJump,
}: {
  current: number;
  onJump: (step: number) => void;
}) {
  return (
    <ol className="flex items-center justify-center gap-1.5 sm:gap-2">
      {STEPS.map((s, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={s.label} className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => onJump(index)}
              disabled={index > current}
              className={cn(
                "flex items-center gap-2 rounded-full border px-2.5 py-1.5 transition-all sm:px-3",
                active
                  ? "border-gold/60 bg-gold/15 shadow-[0_0_18px_rgba(212,175,55,0.2)]"
                  : done
                    ? "border-gold/40 bg-gold/5 hover:bg-gold/10"
                    : "border-gold/15 bg-night/30 opacity-70"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-bold",
                  active
                    ? "bg-gold text-night"
                    : done
                      ? "bg-gold/30 text-gold-bright"
                      : "bg-night/60 text-muted-foreground"
                )}
              >
                {done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  "hidden text-xs font-medium sm:inline",
                  active ? "text-gold-bright" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
            </button>
            {index < STEPS.length - 1 && (
              <span
                className={cn(
                  "h-px w-3 sm:w-6",
                  done ? "bg-gold/50" : "bg-gold/15"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------- Preview del PG --------------------------- */

function CharacterPreview({
  draft,
  totalLevel,
}: {
  draft: DraftState;
  totalLevel: number;
}) {
  const sub = [draft.race, draft.primaryClass].filter(Boolean).join(" · ");
  return (
    <div className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-xl border border-gold/30 bg-background/80 p-3 backdrop-blur-sm">
      <span className="size-14 shrink-0 overflow-hidden rounded-lg border border-gold/40">
        <FantasyImage
          src={draft.imageUrl}
          alt={draft.name || "Eroe"}
          fallbackIcon={User}
          className="size-14"
          sizes="56px"
        />
      </span>
      <div className="min-w-0">
        <p className="truncate font-heading font-bold text-gold-bright">
          {draft.name || "Senza nome"}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sub || "—"}</p>
        {(draft.primaryClass || totalLevel > 1) && (
          <Badge
            variant="outline"
            className="mt-1 border-gold/40 text-[10px] text-gold-bright"
          >
            Livello {totalLevel}
          </Badge>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Steps ------------------------------ */

type SetFn = <K extends keyof DraftState>(key: K, value: DraftState[K]) => void;

function StepHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof User;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="font-heading text-xl font-bold text-gold-bright">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StepIdentity({ draft, set }: { draft: DraftState; set: SetFn }) {
  return (
    <>
      <StepHeading
        icon={User}
        title="Identità"
        subtitle="Il nome e il volto del tuo eroe."
      />
      <div className="space-y-2">
        <Label>Nome del personaggio</Label>
        <Input
          autoFocus
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="Es. Kaelen Ombraluce"
        />
      </div>
      <div className="space-y-2">
        <Label>Ritratto / Avatar</Label>
        <ImageUpload
          value={draft.imageUrl}
          onChange={(url) => set("imageUrl", url)}
          folder="character"
        />
      </div>
    </>
  );
}

function StepOrigins({
  draft,
  set,
  totalLevel,
}: {
  draft: DraftState;
  set: SetFn;
  totalLevel: number;
}) {
  return (
    <>
      <StepHeading
        icon={Swords}
        title="Origini e Classe"
        subtitle="Stirpe, arte e cammino del tuo eroe."
      />
      <div className="space-y-2">
        <Label>Razza</Label>
        <Input
          value={draft.race}
          onChange={(event) => set("race", event.target.value)}
          placeholder="Umano, elfo, nano…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Classe</Label>
          <Input
            value={draft.primaryClass}
            onChange={(event) => set("primaryClass", event.target.value)}
            placeholder="Guerriero…"
            list="wizard-classes"
          />
        </div>
        <div className="space-y-2">
          <Label>Livello iniziale</Label>
          <Input
            type="number"
            min={1}
            value={draft.primaryLevel}
            onChange={(event) =>
              set("primaryLevel", Math.max(1, Number(event.target.value) || 1))
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Sottoclasse (opzionale)</Label>
        <Input
          value={draft.primarySubclass}
          onChange={(event) => set("primarySubclass", event.target.value)}
          placeholder="Campione, Evocatore…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 rounded-lg border border-gold/15 bg-night/30 p-3">
        <div className="space-y-2">
          <Label className="text-xs">Multiclasse (opzionale)</Label>
          <Input
            value={draft.multiclass}
            onChange={(event) => set("multiclass", event.target.value)}
            placeholder="Es. Ladro"
            list="wizard-classes"
          />
        </div>
        {draft.multiclass.trim() && (
          <div className="space-y-2">
            <Label className="text-xs">Livello multiclasse</Label>
            <Input
              type="number"
              min={1}
              value={draft.multiclassLevel}
              onChange={(event) =>
                set(
                  "multiclassLevel",
                  Math.max(1, Number(event.target.value) || 1)
                )
              }
            />
          </div>
        )}
      </div>
      <datalist id="wizard-classes">
        {DND_CLASSES.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <p className="text-xs text-muted-foreground">
        Livello totale del personaggio:{" "}
        <span className="font-semibold text-gold-bright">{totalLevel}</span>
      </p>
    </>
  );
}

function StepAppearance({ draft, set }: { draft: DraftState; set: SetFn }) {
  return (
    <>
      <StepHeading
        icon={Scroll}
        title="Aspetto e Personalità"
        subtitle="L'identità narrativa e fisica del tuo eroe."
      />
      <div className="space-y-2">
        <Label>Allineamento</Label>
        <Select
          value={draft.alignment}
          onValueChange={(value) => set("alignment", value)}
        >
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Genere</Label>
          <Input
            value={draft.gender}
            onChange={(event) => set("gender", event.target.value)}
            placeholder="Maschile, femminile…"
          />
        </div>
        <div className="space-y-2">
          <Label>Età</Label>
          <Input
            value={draft.age}
            onChange={(event) => set("age", event.target.value)}
            placeholder="Es. 27 anni"
          />
        </div>
        <div className="space-y-2">
          <Label>Altezza</Label>
          <Input
            value={draft.height}
            onChange={(event) => set("height", event.target.value)}
            placeholder="Es. 1,80 m"
          />
        </div>
        <div className="space-y-2">
          <Label>Peso</Label>
          <Input
            value={draft.weight}
            onChange={(event) => set("weight", event.target.value)}
            placeholder="Es. 78 kg"
          />
        </div>
      </div>
    </>
  );
}

function StepAbilities({
  abilities,
  setAbility,
}: {
  abilities: Abilities;
  setAbility: (ability: Ability, value: number) => void;
}) {
  return (
    <>
      <StepHeading
        icon={Shield}
        title="Caratteristiche"
        subtitle="Distribuisci le doti del tuo eroe."
      />
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {ABILITIES.map((ability) => {
          const score = abilities[ability];
          const mod = abilityModifier(score);
          return (
            <div
              key={ability}
              className="flex items-center gap-3 rounded-lg border border-gold/15 bg-night/30 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{ABILITY_LABELS[ability]}</p>
                <p className="text-xs text-muted-foreground">
                  {ABILITY_SHORT[ability]} · mod {formatModifier(mod)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setAbility(ability, score - 1)}
                  aria-label="Diminuisci"
                >
                  <Minus />
                </Button>
                <span className="w-8 text-center font-heading text-lg font-bold text-gold-bright">
                  {score}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-xs"
                  onClick={() => setAbility(ability, score + 1)}
                  aria-label="Aumenta"
                >
                  <Plus />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function StepSummary({
  draft,
  totalLevel,
}: {
  draft: DraftState;
  totalLevel: number;
}) {
  const rows: [string, string][] = [
    ["Razza", draft.race || "—"],
    [
      "Classe",
      [draft.primaryClass, draft.primarySubclass && `(${draft.primarySubclass})`]
        .filter(Boolean)
        .join(" ") || "—",
    ],
    ...(draft.multiclass.trim()
      ? ([["Multiclasse", `${draft.multiclass} (liv. ${draft.multiclassLevel})`]] as [
          string,
          string,
        ][])
      : []),
    ["Livello", String(totalLevel)],
    ["Allineamento", draft.alignment || "—"],
    ["Genere", draft.gender || "—"],
    ["Età", draft.age || "—"],
    ["Altezza", draft.height || "—"],
    ["Peso", draft.weight || "—"],
  ];

  return (
    <>
      <StepHeading
        icon={Sparkles}
        title="Riepilogo finale"
        subtitle="Controlla i dettagli prima di dare vita al tuo eroe."
      />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-gold/15 bg-night/30 p-4 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-3 gap-2">
        {ABILITIES.map((ability) => (
          <div
            key={ability}
            className="rounded-lg border border-gold/15 bg-night/30 py-2 text-center"
          >
            <p className="text-[10px] tracking-widest text-muted-foreground uppercase">
              {ABILITY_SHORT[ability]}
            </p>
            <p className="font-heading text-lg font-bold text-gold-bright">
              {draft.abilities[ability]}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatModifier(abilityModifier(draft.abilities[ability]))}
            </p>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Puoi tornare indietro per modificare qualsiasi dato. Alla conferma il
        personaggio verrà creato e legato al tuo account.
      </p>
    </>
  );
}
