import { AppShell } from "@/components/layout/app-shell";
import { AuthGuard } from "@/features/auth/guard";

/** Layout dell'area autenticata: guardia di accesso + struttura con sidebar. */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  );
}

