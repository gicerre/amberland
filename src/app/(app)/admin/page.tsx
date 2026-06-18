"use client";

import { Ban, Crown, UserPlus, Users } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { FrameCard } from "@/design-system";
import { useAdminUsers } from "@/features/users/data";
import { CreateUserDialog } from "@/features/users/components/user-dialogs";
import { UsersTable } from "@/features/users/components/users-table";

/** Dashboard amministrativa: statistiche e gestione account. */
export default function AdminPage() {
  const { data: users } = useAdminUsers();
  const [createOpen, setCreateOpen] = useState(false);

  const total = users?.length ?? 0;
  const masters = users?.filter((user) => user.role === "MASTER").length ?? 0;
  const players = users?.filter((user) => user.role === "PLAYER").length ?? 0;
  const blocked = users?.filter((user) => user.disabled).length ?? 0;

  const stats = [
    { label: "Account totali", value: total, icon: Users },
    { label: "Master", value: masters, icon: Crown },
    { label: "Giocatori", value: players, icon: Users },
    { label: "Bloccati", value: blocked, icon: Ban },
  ];

  return (
    <div>
      <PageHeader
        title="Amministrazione"
        subtitle="Gestisci gli accessi al regno: account, ruoli e password."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            Nuovo utente
          </Button>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <FrameCard key={stat.label} contentClassName="p-5">
              <div className="flex items-center justify-between">
                <Icon className="size-5 text-gold/70" />
                <span className="font-heading text-3xl font-bold text-gold">
                  {stat.value}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
            </FrameCard>
          );
        })}
      </div>

      <UsersTable />

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
