"use client";

import { EntityListPage } from "@/features/entities/components/entity-list-page";

export default function FactionsPage() {
  return (
    <EntityListPage
      type="faction"
      chipFieldKey="factionType"
      subtitle="Regni, gilde, culti e casate: i poteri che muovono i fili del mondo."
      emptyTitle="Nessuna fazione conosciuta"
      emptyDescription="Nessun vessillo sventola ancora sulle cronache del regno."
      hero={{
        eyebrow: "Casate e poteri",
        accent: "#c43146",
        src: "/images/fazioni.webp",
      }}
    />
  );
}
