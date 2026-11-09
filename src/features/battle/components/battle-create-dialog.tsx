"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import { ConsoleField } from "@/design-system";
import { useCreateBattle } from "@/features/battle/data";
import { BATTLE_LIMITS } from "@/types/battle";

/**
 * Apertura di un nuovo campo di battaglia: qui si chiede solo il minimo
 * indispensabile: la mappa vera si disegna nella preparazione, dove il
 * Master vede l'anteprima dal vivo.
 */
export function BattleCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const create = useCreateBattle();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { name: trimmed, description: description.trim() },
      {
        onSuccess: ({ id }) => {
          onOpenChange(false);
          setName("");
          setDescription("");
          router.push(`/battaglie/${id}/editor`);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuovo campo di battaglia</DialogTitle>
          <DialogDescription>
            Nasce come bozza: nessuno lo vede finché non lo apri al party.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <ConsoleField label="Nome" required>
            <Input
              value={name}
              autoFocus
              maxLength={BATTLE_LIMITS.maxNameLength}
              placeholder="Agguato al Passo del Corvo"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit();
              }}
            />
          </ConsoleField>
          <ConsoleField label="Descrizione">
            <Textarea
              value={description}
              rows={3}
              maxLength={BATTLE_LIMITS.maxDescriptionLength}
              placeholder="Cosa accade, e perché si combatte qui."
              onChange={(event) => setDescription(event.target.value)}
            />
          </ConsoleField>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={submit}
            disabled={!name.trim() || create.isPending}
          >
            Traccia il campo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
