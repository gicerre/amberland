import { BattlePreparation } from "@/features/battle/components/battle-preparation";

/** Preparazione del campo di battaglia: griglia, sfondo, calibrazione. */
export default async function BattlePreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BattlePreparation id={id} />;
}
