import type { Timestamp } from "firebase/firestore";

/**
 * Configurazione del Party (`settings/party`): identità condivisa della
 * compagnia, modificabile dal Master. Membri e ultima attività sono
 * derivati dai dati (PC con partyMember, timestamp di note/borsa).
 */
export interface PartyConfig {
  name: string;
  emblemUrl: string;
  motto: string;
  updatedAt: Timestamp | null;
}

export const DEFAULT_PARTY_CONFIG: PartyConfig = {
  name: "La Compagnia",
  emblemUrl: "",
  motto: "",
  updatedAt: null,
};
