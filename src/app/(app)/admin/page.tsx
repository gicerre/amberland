"use client";

import { Ban, Crown, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";

import { DeskPlaque } from "@/components/shared/desk-plaque";
import { Button } from "@/components/ui/button";
import { StatGrid, TomeHeading, type StatItem } from "@/design-system";
import { CreateUserDialog } from "@/features/users/components/user-dialogs";
import { UsersTable } from "@/features/users/components/users-table";
import { useAdminUsers } from "@/features/users/data";

/* ───────────────────────── PAGE ───────────────────────── */

export default function AdminPage() {
  const { data: users } = useAdminUsers();
  const [createOpen, setCreateOpen] = useState(false);

  const stats: StatItem[] = useMemo(() => {
    const total = users?.length ?? 0;
    const masters = users?.filter((u) => u.role === "MASTER").length ?? 0;
    const players = users?.filter((u) => u.role === "PLAYER").length ?? 0;
    const blocked = users?.filter((u) => u.disabled).length ?? 0;
    return [
      { icon: Users, label: "Account", value: total },
      { icon: Crown, label: "Master", value: masters },
      { icon: Users, label: "Giocatori", value: players },
      {
        icon: Ban,
        label: "Bloccati",
        value: blocked,
        accent: blocked > 0 ? "crimson" : "gold",
      },
    ];
  }, [users]);

  return (
    <div className="space-y-7">
      <DeskPlaque
        eyebrow="Guardiania del portale"
        title="Registro degli Abitanti"
        subtitle="Controllo degli accessi, ruoli e volontà degli abitanti."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">Registra un abitante</span>
          </Button>
        }
      />

      {/* Panoramica accessi (a colpo d'occhio) */}
      <StatGrid items={stats} className="grid-cols-2 sm:grid-cols-4" />

      {/* Registro degli account */}
      <section>
        <TomeHeading
          icon={Users}
          title="Registro degli account"
          meta={users?.length ?? 0}
        />
        <UsersTable />
      </section>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
