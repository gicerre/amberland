"use client";

import { PageHeader } from "@/components/shared/page-header";
import { GraphView } from "@/features/entities/components/graph-view";

export default function GraphPage() {
  return (
    <div>
      <PageHeader
        title="Vista Rete"
        subtitle="La ragnatela delle cronache: ogni nodo è un'entità, ogni filo un legame o un confine."
      />
      <GraphView />
    </div>
  );
}
