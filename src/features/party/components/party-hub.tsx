"use client";

import { Backpack, BookText, Swords, Users } from "lucide-react";
import { useState } from "react";

import { HubShell, type HubSection } from "@/components/shared/hub-shell";

import { BagSection } from "../bag/bag-section";
import { DiaryBook } from "../diary/diary-book";
import { ActiveQuestsReminder } from "./active-quests-reminder";
import { PartyCharacters } from "./party-characters";
import { PartyHeaderPanel } from "./party-header-panel";
import { QuestOverviewBox } from "./quest-overview-box";

/* ============================================================
 * Area Party — il registro ufficiale della compagnia. Stesso pattern
 * UX dell'Area Personale: pannello identità in alto a destra + tre
 * grandi card (Personaggi, Borsa Conservante, Diario di Campagna).
 * ============================================================ */

const SECTIONS: HubSection[] = [
  {
    value: "personaggi",
    label: "Personaggi",
    description: "La hall degli eroi",
    icon: Users,
  },
  {
    value: "borsa",
    label: "Borsa Conservante",
    description: "Il deposito condiviso",
    icon: Backpack,
  },
  {
    value: "diario",
    label: "Diario di Campagna",
    description: "Le cronache della compagnia",
    icon: BookText,
  },
];

export function PartyHub() {
  const [active, setActive] = useState("personaggi");

  return (
    <HubShell
      title="Il Party"
      subtitle="Il registro ufficiale della compagnia: eroi, tesori e cronache condivise."
      icon={Swords}
      headerPanel={<PartyHeaderPanel />}
      sections={SECTIONS}
      active={active}
      onSelect={setActive}
    >
      <div className="space-y-6">
        <QuestOverviewBox />
        <ActiveQuestsReminder />
        {active === "personaggi" && <PartyCharacters />}
        {active === "borsa" && <BagSection />}
        {active === "diario" && <DiaryBook scope="party" />}
      </div>
    </HubShell>
  );
}
