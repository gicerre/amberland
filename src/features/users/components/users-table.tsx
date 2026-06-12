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

/** Tabella di gestione account (solo ADMIN). */
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
    updateUser.mutate({
      uid: user.id,
      values: { disabled: !user.disabled },
    });

  const confirmDelete = () => {
    if (!deleting) return;
    deleteUser.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  };

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
      <div className="overflow-x-auto rounded-xl border border-gold/15 bg-card/60">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Utente</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead className="hidden sm:table-cell">Stato</TableHead>
              <TableHead className="hidden md:table-cell">
                Ultimo accesso
              </TableHead>
              <TableHead className="hidden lg:table-cell">Creato</TableHead>
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
                      <span className="font-medium">{user.username}</span>
                      {isSelf && (
                        <Badge
                          variant="outline"
                          className="border-gold/40 text-[10px] text-gold"
                        >
                          tu
                        </Badge>
                      )}
                      {user.mustChangePassword && (
                        <KeyRound
                          className="size-3.5 text-amber-400"
                          aria-label="Deve cambiare la password"
                        />
                      )}
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
                  <TableCell className="hidden sm:table-cell">
                    {user.disabled ? (
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
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {formatDate(
                      user.lastLogin ? new Date(user.lastLogin) : null,
                      true
                    )}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">
                    {formatDate(
                      user.createdAt ? new Date(user.createdAt) : null
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isSelf ? (
                      <span className="pr-2 text-xs text-muted-foreground">
                        —
                      </span>
                    ) : (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Azioni per ${user.username}`}
                          >
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onSelect={() => setEditingRole(user)}
                          >
                            <Shield className="size-4" />
                            Modifica ruolo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => setResettingPassword(user)}
                          >
                            <KeyRound className="size-4" />
                            Reimposta password
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => toggleDisabled(user)}
                          >
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
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(user)}
                          >
                            <Trash2 className="size-4" />
                            Elimina account
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
