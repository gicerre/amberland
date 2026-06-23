"use client";

import { Ban, Crown, UserPlus, Users } from "lucide-react";
import { useState, useMemo } from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { useAdminUsers } from "@/features/users/data";
import { CreateUserDialog } from "@/features/users/components/user-dialogs";
import { UsersTable } from "@/features/users/components/users-table";

/* ───────────────────────── PAGE ───────────────────────── */

export default function AdminPage() {
  const { data: users } = useAdminUsers();
  const [createOpen, setCreateOpen] = useState(false);

  const stats = useMemo(() => {
    const total = users?.length ?? 0;
    const masters = users?.filter((u) => u.role === "MASTER").length ?? 0;
    const players = users?.filter((u) => u.role === "PLAYER").length ?? 0;
    const blocked = users?.filter((u) => u.disabled).length ?? 0;

    return [
      {
        label: "Account totali",
        value: total,
        icon: Users,
      },
      {
        label: "Master",
        value: masters,
        icon: Crown,
      },
      {
        label: "Giocatori",
        value: players,
        icon: Users,
      },
      {
        label: "Bloccati",
        value: blocked,
        icon: Ban,
      },
    ];
  }, [users]);

  return (
    <div className="space-y-8">

      {/* ───────── HEADER ───────── */}
      <PageHeader
        title="Amministrazione del Regno"
        subtitle="Controllo degli accessi, ruoli e volontà degli abitanti."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <UserPlus className="size-4" />
            Nuovo utente
          </Button>
        }
      />

      {/* ───────── STATS GRID ───────── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">

        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-gold/15 fantasy-stripe-top"
            >
              {/* background layer */}
              <div className="absolute inset-0 bg-gradient-to-b from-stone-surface/80 via-stone-mid/70 to-night/90" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.10),transparent_60%)]" />

              {/* content */}
              <div className="relative p-5 flex flex-col items-center gap-3">

                <Icon className="size-6 text-gold/70" />

                <span className="font-heading text-3xl font-bold text-gold">
                  {stat.value}
                </span>

                <span className="text-sm text-muted-foreground text-center">
                  {stat.label}
                </span>

              </div>
            </div>
          );
        })}

      </section>

      {/* ───────── USERS TABLE ───────── */}
      <section className="relative overflow-hidden rounded-2xl border border-gold/10 fantasy-stripe-top">

        <div className="absolute inset-0 bg-gradient-to-b from-stone-surface/70 via-stone-mid/60 to-night/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_60%)]" />

        <div className="relative p-2 sm:p-4">
          <UsersTable />
        </div>

      </section>

      {/* ───────── DIALOG ───────── */}
      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />

    </div>
  );
}