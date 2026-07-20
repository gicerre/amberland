"use client";

import { EntityListPage } from "@/features/entities/components/entity-list-page";

export default function ItemsPage() {
  return (
    <EntityListPage
      type="item"
      chipFieldKey="category"
      subtitle="Tesori, reliquie e manufatti: il catalogo del bottino e dei perni della trama."
      emptyTitle="La sala del tesoro è vuota"
      emptyDescription="Nemmeno una moneta consunta. Le ricchezze del regno attendono di essere catalogate."
      hero={{
        eyebrow: "Tesori e reliquie",
        accent: "var(--ember-bright)",
        src: "/images/oggetti.webp",
      }}
    />
  );
}
