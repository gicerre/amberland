"use client";

import { EntityListPage } from "@/features/entities/components/entity-list-page";

export default function BestiaryPage() {
  return (
    <EntityListPage
      type="creature"
      chipFieldKey="creatureType"
      subtitle="Mostri e bestie che popolano le terre selvagge: conoscerli può salvarti la vita."
      emptyTitle="Il bestiario è intonso"
      emptyDescription="Nessuna creatura è stata avvistata… o nessuno è sopravvissuto per raccontarlo."
    />
  );
}
