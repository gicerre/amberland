import { RoleGate } from "@/features/auth/guard";

/** L'amministrazione è riservata agli ADMIN. */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <RoleGate allow={["ADMIN"]}>{children}</RoleGate>;
}
