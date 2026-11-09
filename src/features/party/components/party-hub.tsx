"use client";

import { HubShell, type HubSection } from "@/components/shared/hub-shell";
import { imageIcon } from "@/components/shared/image-icon";
import { ListPageHero } from "@/components/shared/list-page-hero";

import { PartyItemsSection } from "@/features/items/components/party-items-section";
import { useSearchParamState } from "@/hooks/use-search-param-state";

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
    label: "Oggetti e tesoro",
    description: "Borsa, zaini e monete",
    icon: BagIcon,
  },
  {
    value: "diario",
    label: "Diario di Campagna",
    description: "Le cronache della compagnia",
    icon: DiaryIcon,
  },
];

const SECTION_VALUES = ["personaggi", "borsa", "diario"] as const;

export function PartyHub() {
  // La sezione aperta sta nell'URL (?sezione=borsa): indietro e refresh la ritrovano.
  const [active, setActive] = useSearchParamState("sezione", "personaggi", SECTION_VALUES);

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
        onSelect={(value) => setActive(value as (typeof SECTION_VALUES)[number])}
        bareIcons
        cardImage="/images/texture_boxes.webp"
        hideBanner
      >
        <div className="space-y-6">
          <QuestOverviewBox />
          {active === "personaggi" && <PartyCharacters />}
          {active === "borsa" && <PartyItemsSection />}
          {active === "diario" && <DiaryBook scope="party" />}
        </div>
      </HubShell>
    </>
  );
}
