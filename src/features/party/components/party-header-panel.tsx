"use client";

import { Clock, Loader2, Pencil, Shield, Users } from "lucide-react";
import { useState } from "react";

import { CornerOrnaments } from "@/components/shared/fantasy-card";
import { FantasyImage } from "@/components/shared/fantasy-image";
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
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/auth-provider";
import { usePartyPublicCards } from "@/features/characters/data";
import { useBagLog } from "@/features/party/bag/data";
import { useNotes } from "@/features/party/diary/data";

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

/** Pannello identità del Party, in alto a destra nella Home del Party. */
export function PartyHeaderPanel() {
  const { isMaster } = useAuth();
  const { data: config } = usePartyConfig();
  const { data: cards } = usePartyPublicCards();
  const { data: notes } = useNotes();
  const { data: bagLog } = useBagLog();
  const [editOpen, setEditOpen] = useState(false);

  const memberCount = (cards ?? []).length;
  const lastActivity = Math.max(
    notes?.[0]?.createdAt?.toMillis?.() ?? 0,
    bagLog?.[0]?.createdAt?.toMillis?.() ?? 0
  );

  return (
    <div className="relative flex h-full flex-col items-center gap-3 overflow-hidden rounded-2xl border border-gold/35 bg-gradient-to-b from-gold/10 to-night/60 p-5 text-center">
      <CornerOrnaments className="size-5 border-gold/55" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.16),transparent_65%)]" />

      <span className="relative z-10 mt-1 flex size-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-gold/50 bg-night/40 shadow-[0_0_30px_rgba(212,175,55,0.25)]">
        {config?.emblemUrl ? (
          <FantasyImage
            src={config.emblemUrl}
            alt={config.name}
            fallbackIcon={Shield}
            className="size-24"
            sizes="96px"
          />
        ) : (
          <Shield className="size-10 text-gold" />
        )}
      </span>

      <div className="relative z-10">
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="font-heading text-xl font-bold tracking-wide text-gold-bright hover:underline"
        >
          {config?.name ?? "La Compagnia"}
        </button>
        {config?.motto && (
          <p className="mt-0.5 text-sm text-foreground/80 italic">
            «{config.motto}»
          </p>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5">
          <Users className="size-3.5 text-gold/70" />
          {memberCount} {memberCount === 1 ? "membro" : "membri"}
        </span>
        <span className="flex items-center justify-center gap-1.5">
          <Clock className="size-3.5 text-gold/70" />
          Attività: {timeAgo(lastActivity)}
        </span>
      </div>

      {isMaster && (
        <Button
          variant="default"
          size="sm"
          className="relative z-10 mt-auto w-full border-gold/30"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Modifica identità
        </Button>
      )}

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <Shield className="size-5 text-gold" />
            Identità del Party
          </DialogTitle>
          <DialogDescription>
            {isMaster
              ? "Nome, motto e stemma della compagnia."
              : "L'identità della compagnia, definita dal Master."}
          </DialogDescription>
        </DialogHeader>

        {isMaster ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome del Party</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="I Cavalieri dell'Alba"
              />
            </div>
            <div className="space-y-2">
              <Label>Motto (opzionale)</Label>
              <Input
                value={motto}
                onChange={(event) => setMotto(event.target.value)}
                placeholder="Uniti fino all'ultima alba"
              />
            </div>
            <div className="space-y-2">
              <Label>Stemma (opzionale)</Label>
              <ImageUpload value={emblemUrl} onChange={setEmblemUrl} folder="misc" />
            </div>
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

        {isMaster && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annulla
            </Button>
            <Button onClick={submit} disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              Salva
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
