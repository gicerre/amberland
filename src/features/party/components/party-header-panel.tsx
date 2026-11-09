"use client";

import { Clock, Loader2, Pencil, Shield, User, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { FantasyImage } from "@/components/shared/fantasy-image";
import { FALLEN_FILTER } from "@/components/shared/immersive-hero";
import { ImageUpload } from "@/components/shared/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ConsoleField,
  FrameOverlay,
  getAsset,
  ImmersiveModal,
} from "@/design-system";
import { useAuth } from "@/features/auth/auth-provider";
import { usePartyPublicCards } from "@/features/characters/data";
import { useItemLog } from "@/features/items/data";
import { useNotes } from "@/features/party/diary/data";

import { cn } from "@/lib/utils";

import { usePartyConfig, usePartyConfigMutation } from "../config/data";

function timeAgo(ms: number): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "poco fa";
  if (min < 60) return `${min} min fa`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h fa`;
  const d = Math.floor(h / 24);
  return `${d} g fa`;
}

/**
 * Stendardo della Compagnia: l'emblema a tutto campo (in dissolvenza),
 * nome, motto, ritratti dei membri e attività — il "box da party D&D".
 */
export function PartyHeaderPanel() {
  const { isMaster } = useAuth();
  const { data: config } = usePartyConfig();
  const { data: cards } = usePartyPublicCards();
  const { data: notes } = useNotes();
  const { data: bagLog } = useItemLog();
  const [editOpen, setEditOpen] = useState(false);

  const name = config?.name ?? "La Compagnia";
  const members = cards ?? [];
  const memberCount = members.length;
  const lastActivity = Math.max(
    notes?.[0]?.createdAt?.toMillis?.() ?? 0,
    bagLog?.[0]?.createdAt?.toMillis?.() ?? 0
  );

  return (
    <div className="group relative flex h-full min-h-[18rem] flex-col justify-end overflow-hidden rounded-2xl shadow-[0_14px_44px_-16px_rgba(0,0,0,0.85)]">
      {/* ── Emblema a tutto campo (dissolvenza cinematografica) ── */}
      <div className="absolute inset-0">
        {config?.emblemUrl ? (
          <div className="absolute inset-0 animate-[image-reveal_900ms_ease-out_both]">
            <FantasyImage
              src={config.emblemUrl}
              alt={name}
              fallbackIcon={Shield}
              className="size-full transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 1024px) 100vw, 340px"
              position="center"
            />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-gold/12 via-card to-night/85">
            <Shield className="size-28 text-gold/15" />
          </div>
        )}
      </div>

      {/* Veli per leggibilità + alone dorato superiore */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/82 to-background/10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_60%_at_50%_0%,rgba(200,167,93,0.16),transparent_60%)]" />

      {/* ── Identità, in basso ── */}
      <div className="relative z-10 p-6">
        <p className="font-heading text-[10px] font-bold tracking-[0.34em] text-gold/70 uppercase">
          ◆ La Compagnia ◆
        </p>
        <h2 className="text-gold-gradient mt-1 font-heading text-2xl font-black tracking-wide drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
          {name}
        </h2>
        {config?.motto && (
          <p className="mt-1 text-sm text-foreground/85 italic">
            «{config.motto}»
          </p>
        )}

        {/* Ritratti dei membri */}
        {memberCount > 0 && (
          <div className="mt-3.5 flex items-center gap-2">
            <div className="flex -space-x-2.5">
              {members.slice(0, 6).map((entry) => (
                <Link
                  key={entry.id}
                  href={`/entita/${entry.id}`}
                  title={entry.card.name}
                  className="relative size-9 overflow-hidden rounded-full border-2 border-stone-mid shadow-[0_2px_6px_rgba(0,0,0,0.5)] ring-1 ring-gold/45 transition-transform hover:z-10 hover:-translate-y-0.5 hover:ring-gold/70"
                >
                  <FantasyImage
                    src={entry.card.tokenUrl || entry.card.imageUrl}
                    alt={entry.card.name}
                    fallbackIcon={User}
                    className={cn("size-full", entry.card.isDead && FALLEN_FILTER)}
                    sizes="36px"
                  />
                </Link>
              ))}
            </div>
            {memberCount > 6 && (
              <span className="font-heading text-xs text-gold/80">
                +{memberCount - 6}
              </span>
            )}
          </div>
        )}

        {/* Stat chips */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong bg-black/45 px-2.5 py-1.5 text-xs">
            <Users className="size-3.5 text-gold/70" />
            <strong className="text-gold-bright">{memberCount}</strong>
            <span className="text-muted-foreground">
              {memberCount === 1 ? "membro" : "membri"}
            </span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-hairline-strong bg-black/45 px-2.5 py-1.5 text-xs">
            <Clock className="size-3.5 text-gold/70" />
            <span className="text-muted-foreground">{timeAgo(lastActivity)}</span>
          </span>
        </div>

        {/* Azione (solo Master) */}
        {isMaster && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-10 w-full"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            Modifica identità
          </Button>
        )}
      </div>

      {/* Cornice metallica sovrapposta */}
      <FrameOverlay asset={getAsset("window_04")} borderWidth="1.4rem" />

      <PartyConfigDialog open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
}

function PartyConfigDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isMaster } = useAuth();
  const { data: config } = usePartyConfig();
  const save = usePartyConfigMutation();
  const [name, setName] = useState("");
  const [motto, setMotto] = useState("");
  const [emblemUrl, setEmblemUrl] = useState("");

  // Sincronizza i campi quando si apre.
  const [synced, setSynced] = useState(false);
  if (open && config && !synced) {
    setName(config.name);
    setMotto(config.motto);
    setEmblemUrl(config.emblemUrl);
    setSynced(true);
  }
  if (!open && synced) setSynced(false);

  const submit = () =>
    save.mutate(
      { name: name.trim() || "La Compagnia", motto: motto.trim(), emblemUrl },
      { onSuccess: () => onOpenChange(false) }
    );

  return (
    <ImmersiveModal
      open={open}
      onOpenChange={onOpenChange}
      size="md"
      icon={<Shield />}
      title="Identità del Party"
      description={
        isMaster
          ? "Nome, motto e stemma della compagnia."
          : "L'identità della compagnia, definita dal Master."
      }
      footer={
        isMaster ? (
          <>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Salva
            </Button>
          </>
        ) : undefined
      }
    >
      {isMaster ? (
        <div className="space-y-5">
          <ConsoleField label="Nome del Party">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="I Cavalieri dell'Alba"
            />
          </ConsoleField>
          <ConsoleField label="Motto (opzionale)">
            <Input
              value={motto}
              onChange={(event) => setMotto(event.target.value)}
              placeholder="Uniti fino all'ultima alba"
            />
          </ConsoleField>
          <ConsoleField label="Stemma (opzionale)">
            <ImageUpload value={emblemUrl} onChange={setEmblemUrl} folder="misc" />
          </ConsoleField>
        </div>
      ) : (
        <div className="space-y-2 text-center">
          <p className="font-heading text-lg text-gold-bright">
            {config?.name ?? "La Compagnia"}
          </p>
          {config?.motto && (
            <p className="text-sm text-muted-foreground italic">
              «{config.motto}»
            </p>
          )}
        </div>
      )}
    </ImmersiveModal>
  );
}
