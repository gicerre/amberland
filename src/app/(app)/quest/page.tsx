"use client";

import { EntityListPage } from "@/features/entities/components/entity-list-page";

export default function QuestsPage() {
  return (
    <EntityListPage
      type="quest"
      groupByFieldKey="status"
      customGroups={[
        { label: "Attive", values: ["ACTIVE"] },
        { label: "Prossime", values: ["NEXT"] },
        { label: "Segrete", values: ["SECRET"] },
        { label: "Disponibili", values: ["AVAILABLE"] },
        { label: "Completate e fallite", values: ["COMPLETED", "FAILED"] },
      ]}
      subtitle="Le imprese del party: organizzate per stato — disponibili, in corso, completate."
      emptyTitle="Nessuna quest nelle cronache"
      emptyDescription="Le bacheche delle taverne sono vuote. Il Master sta tramando qualcosa…"
    />
  );
}
