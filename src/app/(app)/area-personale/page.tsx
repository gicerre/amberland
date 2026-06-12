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

const SECTIONS: HubSection[] = [
  {
    value: "inventario",
    label: "Inventario",
    description: "Lo zaino dell'avventuriero",
    icon: Backpack,
  },
  {
    value: "obiettivi",
    label: "Obiettivi",
    description: "La bacheca delle imprese",
    icon: Target,
  },
  {
    value: "diario",
    label: "Diario",
    description: "Le cronache personali",
    icon: BookOpen,
  },
];

/**
 * Area Personale: il diario privato del personaggio. Pannello del PC in
 * alto a destra; tre grandi card aprono Inventario, Obiettivi e Diario.
 * Tutti i contenuti sono visibili solo al proprietario dell'account.
 */
export default function PersonalAreaPage() {
  const { user } = useAuth();
  const [active, setActive] = useState("inventario");

  if (!user) return <LoadingScreen className="min-h-[60svh]" />;

  return (
    <HubShell
      title="Area Personale"
      subtitle="Il diario privato del tuo avventuriero: solo i tuoi occhi possono leggerlo."
      icon={ScrollText}
      headerPanel={<PcHeaderPanel />}
      sections={SECTIONS}
      active={active}
      onSelect={setActive}
    >
      {active === "inventario" && <InventorySection />}
      {active === "obiettivi" && <GoalsSection />}
      {active === "diario" && <DiaryBook scope="personal" />}
      <TimelinePanel />
    </HubShell>
  );
}
