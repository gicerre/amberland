import { RoleGate } from "@/features/auth/guard";

/** Il pannello contenuti è riservato a MASTER e ADMIN. */
export default function MasterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate allow={["ADMIN", "MASTER"]}>{children}</RoleGate>;
}
