"use client";

import { DeskPlaque } from "@/components/shared/desk-plaque";
import { GraphView } from "@/features/entities/components/graph-view";

export default function GraphPage() {
  return (
    <div>
      <DeskPlaque
        eyebrow="Tavolo cartografico"
        title="La Ragnatela delle Cronache"
        subtitle="Ogni nodo è un'entità, ogni filo un legame o un confine."
      />
      <GraphView />
    </div>
  );
}
