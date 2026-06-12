"use client";

import { EntityListPage } from "@/features/entities/components/entity-list-page";

export default function QuestsPage() {
  return (
    <EntityListPage
      type="quest"
      chipFieldKey="status"
      subtitle="Le imprese del party: incarichi, misteri e chiamate all'avventura."
      emptyTitle="Nessuna quest nelle cronache"
      emptyDescription="Le bacheche delle taverne sono vuote. Il Master sta tramando qualcosa…"
    />
  );
}
