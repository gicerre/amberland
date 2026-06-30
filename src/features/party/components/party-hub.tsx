"use client";

import { useState } from "react";

import { HubShell, type HubSection } from "@/components/shared/hub-shell";
import { imageIcon } from "@/components/shared/image-icon";
import { ListPageHero } from "@/components/shared/list-page-hero";

import { BagSection } from "../bag/bag-section";
import { DiaryBook } from "../diary/diary-book";
import { PartyCharacters } from "./party-characters";
import { PartyHeaderPanel } from "./party-header-panel";
import { QuestOverviewBox } from "./quest-overview-box";

/* ============================================================
 * Area Party — il registro ufficiale della compagnia. Stesso pattern
 * UX dell'Area Personale: pannello identità in alto a destra + tre
 * grandi card (Personaggi, Borsa Conservante, Diario di Campagna).
 * ============================================================ */

// Icone custom (arte in /public/icons).
const PartyIcon = imageIcon("/icons/dragon.png");
const CharactersIcon = imageIcon("/icons/helmet.png");
const BagIcon = imageIcon("/icons/box.png");
const DiaryIcon = imageIcon("/icons/book.png");

const SECTIONS: HubSection[] = [
  {
    value: "personaggi",
    label: "Personaggi",
    description: "La hall degli eroi",
    icon: CharactersIcon,
  },
  {
    value: "borsa",
    label: "Borsa Conservante",
    description: "Il deposito condiviso",
    icon: BagIcon,
  },
  {
    value: "diario",
    label: "Diario di Campagna",
    description: "Le cronache della compagnia",
    icon: DiaryIcon,
  },
];

export function PartyHub() {
  const [active, setActive] = useState("personaggi");

  return (
    <>
      {/* TODO sfondo dedicato: src="/images/party.webp" */}
      <ListPageHero
        src="/images/bg_party.webp"
        alt="Il Party"
        accent="#d4af37"
        eyebrow="Il registro della compagnia"
        title="Il Party"
        subtitle="Il registro ufficiale della compagnia: eroi, tesori e cronache condivise."
      />
      <HubShell
        title="Il Party"
        subtitle="Il registro ufficiale della compagnia: eroi, tesori e cronache condivise."
        icon={PartyIcon}
        headerPanel={<PartyHeaderPanel />}
        sections={SECTIONS}
        active={active}
        onSelect={setActive}
        bareIcons
        cardImage="/images/texture_boxes.webp"
        hideBanner
      >
        <div className="space-y-6">
          <QuestOverviewBox />
          {active === "personaggi" && <PartyCharacters />}
          {active === "borsa" && <BagSection />}
          {active === "diario" && <DiaryBook scope="party" />}
        </div>
      </HubShell>
    </>
  );
}
