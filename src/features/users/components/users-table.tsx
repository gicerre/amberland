"use client";

import {
  Ban,
  KeyRound,
  LockOpen,
  MoreHorizontal,
  Shield,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-provider";
import { ROLE_BADGE_CLASSES, ROLE_LABELS } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";
import type { AdminUserDto } from "@/types/models";

import { useAdminUsers, useDeleteUser, useUpdateUser } from "../data";
import { EditRoleDialog, ResetPasswordDialog } from "./user-dialogs";

function StatusBadge({ disabled }: { disabled: boolean }) {
  return disabled ? (
    <Badge
      variant="outline"
      className="border-red-500/50 bg-red-500/10 text-[10px] text-red-300"
    >
      Bloccato
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="border-emerald-600/50 bg-emerald-900/20 text-[10px] text-emerald-300"
    >
      Attivo
    </Badge>
  );
}

/** Tabella di gestione account (solo ADMIN): tabella su desktop, card su mobile. */
export function UsersTable() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading } = useAdminUsers();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [editingRole, setEditingRole] = useState<AdminUserDto | null>(null);
  const [resettingPassword, setResettingPassword] =
    useState<AdminUserDto | null>(null);
  const [deleting, setDeleting] = useState<AdminUserDto | null>(null);

  const toggleDisabled = (user: AdminUserDto) =>
    updateUser.mutate({ uid: user.id, values: { disabled: !user.disabled } });

  const confirmDelete = () => {
    if (!deleting) return;
    deleteUser.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

  // Menu azioni — condiviso tra tabella e card; trigger 44px su mobile.
  const userMenu = (user: AdminUserDto) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 md:size-8"
          aria-label={`Azioni per ${user.username}`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => setEditingRole(user)}>
          <Shield className="size-4" />
          Modifica ruolo
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => setResettingPassword(user)}>
          <KeyRound className="size-4" />
          Reimposta password
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => toggleDisabled(user)}>
          {user.disabled ? (
            <>
              <LockOpen className="size-4" />
              Sblocca account
            </>
          ) : (
            <>
              <Ban className="size-4" />
              Blocca account
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(user)}>
          <Trash2 className="size-4" />
          Elimina account
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const userName = (user: AdminUserDto, isSelf: boolean) => (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate font-medium">{user.username}</span>
      {isSelf && (
        <Badge variant="outline" className="border-gold/40 text-[10px] text-gold">
          tu
        </Badge>
      )}
      {user.mustChangePassword && (
        <KeyRound
          className="size-3.5 shrink-0 text-amber-400"
          aria-label="Deve cambiare la password"
        />
      )}
    </div>
  );

  if (isLoading) {
    return <Skeleton className="h-72 w-full rounded-xl bg-muted/60" />;
  }

  if (!users || users.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nessun account registrato"
        description="Crea il primo account per dare accesso al regno."
      />
    );
  }

  return (
    <>
      {/* ── Mobile: lista di card ── */}
      <div className="space-y-2.5 md:hidden">
        {users.map((user) => {
          const isSelf = user.id === currentUser?.uid;
          return (
            <div
              key={user.id}
              className="rounded-xl border border-hairline bg-gradient-to-b from-stone-surface to-stone-mid/80 p-3.5 shadow-[0_4px_16px_-8px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center gap-3">
                <Avatar className="size-10 border border-gold/30">
                  <AvatarFallback className="bg-gold/10 font-heading text-sm font-bold text-gold">
                    {user.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  {userName(user, isSelf)}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", ROLE_BADGE_CLASSES[user.role])}
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    <StatusBadge disabled={user.disabled} />
                  </div>
                </div>
                {!isSelf && userMenu(user)}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-0.5 border-t border-hairline pt-2 text-[11px] text-muted-foreground">
                <span>
                  Ultimo accesso:{" "}
                  {formatDate(user.lastLogin ? new Date(user.lastLogin) : null, true)}
                </span>
                <span>
                  Creato:{" "}
                  {formatDate(user.createdAt ? new Date(user.createdAt) : null)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop: tabella ── */}
      <div className="hidden overflow-x-auto rounded-xl border border-hairline bg-card/60 md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Utente</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="hidden lg:table-cell">Ultimo accesso</TableHead>
              <TableHead className="hidden xl:table-cell">Creato</TableHead>
              <TableHead className="w-16 text-right">Azioni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const isSelf = user.id === currentUser?.uid;
              return (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8 border border-gold/30">
                        <AvatarFallback className="bg-gold/10 font-heading text-sm font-bold text-gold">
                          {user.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {userName(user, isSelf)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px]", ROLE_BADGE_CLASSES[user.role])}
                    >
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge disabled={user.disabled} />
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(
                      user.lastLogin ? new Date(user.lastLogin) : null,
                      true
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground xl:table-cell">
                    {formatDate(user.createdAt ? new Date(user.createdAt) : null)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isSelf ? (
                      <span className="pr-2 text-xs text-muted-foreground">—</span>
                    ) : (
                      userMenu(user)
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <EditRoleDialog
        user={editingRole}
        onOpenChange={(open) => !open && setEditingRole(null)}
      />
      <ResetPasswordDialog
        user={resettingPassword}
        onOpenChange={(open) => !open && setResettingPassword(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Eliminare l'account ${deleting?.username ?? ""}?`}
        description="Verranno cancellati l'accesso, il profilo e l'area personale. L'operazione è irreversibile."
        loading={deleteUser.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
