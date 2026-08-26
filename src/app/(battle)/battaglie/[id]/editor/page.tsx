import { BattlemapEditorPage } from "@/features/battle/editor/editor-page";

/** Battlemap Editor: la mappa a schermo pieno, strumenti attorno. */
export default async function BattleMapEditorRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BattlemapEditorPage id={id} />;
}
