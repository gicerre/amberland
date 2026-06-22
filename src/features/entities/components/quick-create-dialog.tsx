"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConsoleField, ImmersiveModal } from "@/design-system";
import { cn } from "@/lib/utils";
import {
  ENTITY_TYPES,
  VISIBILITIES,
  type EntityType,
  type Visibility,
} from "@/types/entities";

import { buildEntityInput, useEntitiesByType, useEntityMutations } from "../data";
import { ENTITY_REGISTRY, VISIBILITY_LABELS } from "../registry";

interface QuickCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tipo fisso (nasconde il selettore). */
  type?: EntityType;
  /** Genitore predefinito per le entità geografiche. */
  parentId?: string | null;
  /** Se true non naviga alla pagina dell'entità appena creata. */
  stay?: boolean;
}

/**
 * Creazione rapida: nome + tipo (+ genitore per la geografia).
 * Crea l'entità con i default del registro e apre la sua pagina,
 * dove il Master può completare la scheda.
 */
export function QuickCreateDialog({
  open,
  onOpenChange,
  type,
  parentId = null,
  stay = false,
}: QuickCreateDialogProps) {
  const router = useRouter();
  const { create } = useEntityMutations();

  const [selectedType, setSelectedType] = useState<EntityType>(type ?? "world");
  const [name, setName] = useState("");
  const [parent, setParent] = useState<string>(parentId ?? "");
  // Visibilità non scelta finché il Master non la imposta (obbligatoria).
  const [visibility, setVisibility] = useState<Visibility | "">("");

  const effectiveType = type ?? selectedType;
  const config = ENTITY_REGISTRY[effectiveType];
  const parentType = config.parentType;
  const { data: parentOptions } = useEntitiesByType(
    parentType ?? "world",
    open && parentType !== null
  );

  const needsParent = parentType !== null;
  const parentValue = parentId ?? parent;
  const canSubmit =
    name.trim().length >= 2 &&
    (!needsParent || Boolean(parentValue)) &&
    visibility !== "";

  const handleSubmit = () => {
    if (!canSubmit || create.isPending) return;
    create.mutate(
      {
        data: buildEntityInput(
          effectiveType,
          name,
          needsParent ? parentValue : null,
          visibility as Visibility
        ),
      },
      {
        onSuccess: (id) => {
          setName("");
          setVisibility("");
          onOpenChange(false);
          if (!stay) router.push(`/entita/${id}`);
        },
      }
    );
  };

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      icon={<Sparkles />}
      title={type ? `Aggiungi: ${config.label}` : "Creazione rapida"}
      description={config.flavor}
      footer={
        <>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || create.isPending}
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Incidi nel Registro
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!type && (
          <ConsoleField label="Tipo">
            <Select
              value={selectedType}
              onValueChange={(value) => {
                setSelectedType(value as EntityType);
                setParent("");
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((entityType) => {
                  const entry = ENTITY_REGISTRY[entityType];
                  const Icon = entry.icon;
                  return (
                    <SelectItem key={entityType} value={entityType}>
                      <Icon className="size-4" />
                      {entry.label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </ConsoleField>
        )}

        <ConsoleField label="Nome">
          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && handleSubmit()}
            placeholder={`Nome — ${config.label}`}
          />
        </ConsoleField>

        {needsParent && !parentId && (
          <ConsoleField
            label={`${ENTITY_REGISTRY[parentType!].label} di appartenenza`}
            hint={
              (parentOptions ?? []).length === 0
                ? `Non esiste ancora nessuna voce di tipo ${ENTITY_REGISTRY[parentType!].label}: creala prima.`
                : undefined
            }
          >
            <Select value={parent} onValueChange={setParent}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona…" />
              </SelectTrigger>
              <SelectContent>
                {(parentOptions ?? []).map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ConsoleField>
        )}

        {/* Visibilità obbligatoria: va scelta prima di salvare. */}
        <ConsoleField
          label="Visibilità"
          required
          hint={
            visibility === ""
              ? "Obbligatoria: decidi subito chi potrà vedere questa voce."
              : undefined
          }
        >
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
              <SelectValue placeholder="Scegli chi può vederla…" />
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
      </div>
    </ImmersiveModal>
  );
}
