import { AuthGuard } from "@/features/auth/guard";

/**
 * Route group del Campo di Battaglia: nessuna sidebar, nessun contenitore.
 * L'editor e la schermata di scontro vogliono l'intero schermo — la mappa
 * è il contenuto, non un riquadro dentro un'altra pagina.
 */
export default function BattleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
