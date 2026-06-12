"use client";

import { CharacterDashboard } from "@/features/characters/components/character-dashboard";

export default function CharactersPage() {
  return (
    <CharacterDashboard
      restrictKind="NPC"
      title="Personaggi"
      subtitle="PNG, alleati e rivali: i volti che popolano le cronache del regno."
    />
  );
}
