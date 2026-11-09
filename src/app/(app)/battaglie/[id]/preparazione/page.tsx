import { redirect } from "next/navigation";

/**
 * La preparazione separata non esiste più: tutta la configurazione di una
 * battlemap vive nell'editor. La rotta resta solo per non rompere i
 * collegamenti già in giro.
 */
export default async function BattlePreparationRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/battaglie/${id}/editor`);
}
