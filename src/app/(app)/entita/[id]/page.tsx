import { EntityView } from "@/features/entities/components/entity-view";

/** Pagina di dettaglio universale di un'entità delle cronache. */
export default async function EntityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EntityView id={id} />;
}
