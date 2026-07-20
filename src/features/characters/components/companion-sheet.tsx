"use client";

import { PawPrint, Star, Swords, User } from "lucide-react";
import { useState } from "react";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { ImmersiveModal } from "@/design-system";
import { ABILITIES, type Companion } from "@/types/entities";

import { ABILITY_SHORT, abilityModifier, formatModifier } from "../constants";

/**
 * Griglia compatta dei famigli: card cliccabili che aprono la scheda
 * singola del compagno (sola lettura — si modifica dalla scheda del PG).
 */
export function CompanionsGrid({
  companions,
  ownerName,
}: {
  companions: Companion[];
  ownerName?: string;
}) {
  const [active, setActive] = useState<Companion | null>(null);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {companions.map((companion) => {
          const subtitle = [companion.size, companion.kind, companion.alignment]
            .filter(Boolean)
            .join(" · ");
          return (
            <button
              key={companion.id}
              type="button"
              onClick={() => setActive(companion)}
              className="group flex items-center gap-3 rounded-xl border border-hairline-strong bg-card/60 p-3 text-left transition-all hover:-translate-y-0.5 hover:elev-2 hover:border-gold/45"
            >
              <span className="size-14 shrink-0 overflow-hidden rounded-lg border border-hairline">
                <FantasyImage
                  src={companion.imageUrl}
                  alt={companion.name}
                  fallbackIcon={PawPrint}
                  className="size-14"
                  sizes="56px"
                />
              </span>
              <span className="min-w-0">
                <span className="font-heading flex items-center gap-1 font-semibold text-gold-bright">
                  {companion.name || "Famiglio"}
                  {companion.featured && (
                    <Star className="size-3.5 fill-gold text-gold" />
                  )}
                </span>
                {subtitle && (
                  <span className="block truncate text-xs text-muted-foreground italic">
                    {subtitle}
                  </span>
                )}
                <span className="text-[11px] text-gold/70 group-hover:underline">
                  Apri scheda →
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {active && (
        <CompanionSheetDialog
          companion={active}
          ownerName={ownerName}
          open={Boolean(active)}
          onOpenChange={(open) => !open && setActive(null)}
        />
      )}
    </>
  );
}

/** Scheda singola del famiglio (sola lettura), in stile stat block. */
export function CompanionSheetDialog({
  companion,
  ownerName,
  open,
  onOpenChange,
}: {
  companion: Companion;
  ownerName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const subtitle = [companion.size, companion.kind, companion.alignment]
    .filter(Boolean)
    .join(" · ");
  const meta = (
    [
      ["Classe Armatura", companion.armorClass ?? ""],
      ["Punti Ferita", companion.hitPoints ?? ""],
      ["Velocità", companion.speed ?? ""],
      ["Sensi", companion.senses ?? ""],
      ["Linguaggi", companion.languages ?? ""],
    ] as [string, string][]
  ).filter(([, value]) => Boolean(value));

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={<PawPrint />}
      title={
        <span className="inline-flex items-center gap-2">
          {companion.name || "Famiglio"}
          {companion.featured && (
            <Star className="size-4 fill-gold text-gold" />
          )}
        </span>
      }
      description={
        <span className="flex flex-col gap-1">
          <span>{subtitle || "Compagno"}</span>
          {ownerName && (
            <span className="flex items-center gap-1.5 text-gold/80">
              <User className="size-3.5" />
              Compagno di {ownerName}
            </span>
          )}
        </span>
      }
    >
      <div className="space-y-4">
        {companion.imageUrl && (
          <div className="block w-full overflow-hidden rounded-xl border border-hairline-strong">
            <FantasyImage
              src={companion.imageUrl}
              alt={companion.name}
              className="h-48 w-full"
              sizes="(max-width: 640px) 100vw, 512px"
            />
          </div>
        )}

        {companion.abilities && (
          <div className="grid grid-cols-6 gap-1.5">
            {ABILITIES.map((ability) => {
              const score = companion.abilities?.[ability] ?? 10;
              return (
                <div
                  key={ability}
                  className="flex flex-col items-center gap-0.5 rounded-md border border-hairline bg-night/30 px-2 py-1.5 text-center"
                >
                  <p className="text-[9px] tracking-widest text-muted-foreground uppercase">
                    {ABILITY_SHORT[ability]}
                  </p>
                  <p className="text-sm font-bold text-foreground">{score}</p>
                  <p className="text-[9px] text-gold-bright">
                    {formatModifier(abilityModifier(score))}
                  </p>
                </div>
              );
            })}
          </div>
        )}

          {meta.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-hairline bg-night/30 p-3 text-sm">
              {meta.map(([key, value]) => (
                <div key={key} className="flex flex-col">
                  <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                    {key}
                  </dt>
                  <dd className="font-medium text-foreground">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {(companion.traits ?? []).length > 0 && (
            <div className="space-y-2">
              {(companion.traits ?? []).map((trait) => (
                <p key={trait.id} className="text-sm">
                  <span className="font-semibold text-gold-bright">
                    {trait.name || "Tratto"}.
                  </span>{" "}
                  <span className="whitespace-pre-line text-foreground/90">
                    {trait.detail}
                  </span>
                </p>
              ))}
            </div>
          )}

          {(companion.attacks ?? []).length > 0 && (
            <div className="space-y-2 border-t border-hairline pt-3">
              <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase">
                Azioni
              </p>
              {(companion.attacks ?? []).map((attack) => (
                <p key={attack.id} className="flex items-start gap-1.5 text-sm">
                  <Swords className="mt-0.5 size-3.5 shrink-0 text-gold/60" />
                  <span>
                    <span className="font-semibold text-foreground">
                      {attack.name || "Attacco"}.
                    </span>
                    {attack.detail && (
                      <span className="whitespace-pre-line text-foreground/90">
                        {" "}
                        {attack.detail}
                      </span>
                    )}
                  </span>
                </p>
              ))}
            </div>
          )}

          {companion.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">
              {companion.description}
            </p>
          )}

          <p className="border-t border-hairline pt-3 text-xs text-muted-foreground italic">
            La scheda del famiglio si modifica dalla scheda del personaggio.
          </p>
      </div>
    </ImmersiveModal>
  );
}
