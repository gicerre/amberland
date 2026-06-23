"use client";

import { Backpack, BookOpen, ScrollText, Target } from "lucide-react";
import { useState } from "react";

import { HubShell, type HubSection } from "@/components/shared/hub-shell";
import { LoadingScreen } from "@/components/shared/loading-screen";
import { useAuth } from "@/features/auth/auth-provider";
import { PcHeaderPanel } from "@/features/personal-area/components/pc-header-panel";
import { GoalsSection } from "@/features/personal-area/goals/goals-section";
import { InventorySection } from "@/features/personal-area/inventory/inventory-section";
import { TimelinePanel } from "@/features/personal-area/timeline/timeline-panel";
import { DiaryBook } from "@/features/party/diary/diary-book";
import { imageIcon } from "@/components/shared/image-icon";

/* ───────────────────────── ICONS ───────────────────────── */

const BackpackIcon = imageIcon("/icons/backpack.png");
const TargetIcon = imageIcon("/icons/target.png");
const BookIcon = imageIcon("/icons/book.png");
const ScrollIcon = imageIcon("/icons/pergamena.png");

/* ───────────────────────── SECTIONS ───────────────────────── */

const SECTIONS: HubSection[] = [
  {
    value: "inventario",
    label: "Inventario",
    description: "Lo zaino dell'avventuriero",
    icon: BackpackIcon,
  },
  {
    value: "obiettivi",
    label: "Obiettivi",
    description: "La bacheca delle imprese",
    icon: TargetIcon,
  },
  {
    value: "diario",
    label: "Diario",
    description: "Le cronache personali",
    icon: BookIcon,
  },
];

/* ───────────────────────── PAGE ───────────────────────── */

export default function PersonalAreaPage() {
  const { user } = useAuth();
  const [active, setActive] = useState("inventario");

  if (!user) {
    return <LoadingScreen className="min-h-[60svh]" />;
  }

  return (
    <HubShell
      title="Area Personale"
      subtitle="Il tomo privato del tuo avventuriero: nessuno oltre te può sfogliarlo."
      icon={ScrollIcon}
      headerPanel={<PcHeaderPanel />}

      sections={SECTIONS}
      active={active}
      onSelect={setActive}

      /* ───── STILE COERENTE PARTY / HOME ───── */
      bannerImage="/images/bg_personal.webp"
      cardImage="/images/texture_boxes.webp"
      bareIcons
    >
      <div className="space-y-6">
        {active === "inventario" && <InventorySection />}
        {active === "obiettivi" && <GoalsSection />}
        {active === "diario" && <DiaryBook scope="personal" />}

        {/* sempre visibile come layer secondario */}
        <TimelinePanel />
      </div>
    </HubShell>
  );
}