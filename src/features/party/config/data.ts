"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { toast } from "sonner";

import { useAuth } from "@/features/auth/auth-provider";
import { COLLECTIONS } from "@/lib/constants";
import { db } from "@/lib/firebase/client";
import { DEFAULT_PARTY_CONFIG, type PartyConfig } from "@/types/party";

/* ============================================================
 * Identità del Party — documento `settings/party`, modificabile dal
 * Master (nome, stemma, motto). Membri e ultima attività sono derivati.
 * ============================================================ */

export const PARTY_CONFIG_KEY = "party-config";
const PARTY_DOC_ID = "party";

export function usePartyConfig() {
  const { role } = useAuth();
  return useQuery({
    queryKey: [PARTY_CONFIG_KEY],
    enabled: role !== null,
    queryFn: async (): Promise<PartyConfig> => {
      const snapshot = await getDoc(
        doc(db, COLLECTIONS.settings, PARTY_DOC_ID)
      );
      if (!snapshot.exists()) return DEFAULT_PARTY_CONFIG;
      const data = snapshot.data();
      return {
        name: (data.name as string) || DEFAULT_PARTY_CONFIG.name,
        emblemUrl: (data.emblemUrl as string) ?? "",
        motto: (data.motto as string) ?? "",
        updatedAt: (data.updatedAt as PartyConfig["updatedAt"]) ?? null,
      };
    },
  });
}

export function usePartyConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Partial<Omit<PartyConfig, "updatedAt">>) => {
      await setDoc(
        doc(db, COLLECTIONS.settings, PARTY_DOC_ID),
        { ...patch, updatedAt: serverTimestamp() },
        { merge: true }
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [PARTY_CONFIG_KEY] });
      toast.success("Identità del Party aggiornata");
    },
    onError: (error: Error) =>
      toast.error("Salvataggio non riuscito", { description: error.message }),
  });
}
