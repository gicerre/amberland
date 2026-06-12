"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Dices, Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { passwordSchema } from "@/features/auth/schemas";
import { ROLE_LABELS } from "@/lib/constants";
import { generatePassword } from "@/lib/utils";
import { ROLES, type AdminUserDto, type Role } from "@/types/models";

import { useCreateUser, useUpdateUser } from "../data";
import { createUserSchema, type CreateUserValues } from "../schemas";

/* --------------------------- Crea utente --------------------------- */

export function CreateUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createUser = useCreateUser();

  const form = useForm<CreateUserValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { username: "", password: "", role: "PLAYER" },
  });

  const onSubmit = (values: CreateUserValues) => {
    createUser.mutate(values, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Nuovo utente</DialogTitle>
          <DialogDescription>
            Comunica le credenziali al giocatore: al primo accesso dovrà
            scegliere una nuova password.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome utente</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="aragorn_87" autoComplete="off" />
                  </FormControl>
                  <FormDescription>
                    Da 3 a 20 caratteri: lettere, numeri, underscore o trattino.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password iniziale</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        form.setValue("password", generatePassword(), {
                          shouldValidate: true,
                        })
                      }
                    >
                      <Dices className="size-4" />
                      Genera
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ruolo</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role} — {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={createUser.isPending}>
                {createUser.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Crea account
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------- Modifica ruolo -------------------------- */

export function EditRoleDialog({
  user,
  onOpenChange,
}: {
  user: AdminUserDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateUser = useUpdateUser();
  const [role, setRole] = useState<Role | null>(null);

  const currentRole = role ?? user?.role ?? "PLAYER";

  const handleSave = () => {
    if (!user) return;
    updateUser.mutate(
      { uid: user.id, values: { role: currentRole } },
      {
        onSuccess: () => {
          setRole(null);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) setRole(null);
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Ruolo di {user?.username}
          </DialogTitle>
          <DialogDescription>
            Il nuovo ruolo sarà effettivo dal prossimo accesso dell&rsquo;utente.
          </DialogDescription>
        </DialogHeader>

        <Select
          value={currentRole}
          onValueChange={(value) => setRole(value as Role)}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((option) => (
              <SelectItem key={option} value={option}>
                {option} — {ROLE_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annulla
          </Button>
          <Button
            onClick={handleSave}
            disabled={updateUser.isPending || currentRole === user?.role}
          >
            {updateUser.isPending && <Loader2 className="size-4 animate-spin" />}
            Assegna ruolo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------- Reimposta password ------------------------- */

const resetPasswordSchema = z.object({ password: passwordSchema });
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordDialog({
  user,
  onOpenChange,
}: {
  user: AdminUserDto | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateUser = useUpdateUser();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "" },
  });

  const onSubmit = (values: ResetPasswordValues) => {
    if (!user) return;
    updateUser.mutate(
      { uid: user.id, values: { password: values.password } },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog
      open={user !== null}
      onOpenChange={(open) => {
        if (!open) form.reset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Reimposta la password di {user?.username}
          </DialogTitle>
          <DialogDescription>
            Le sessioni attive verranno revocate e l&rsquo;utente dovrà cambiare
            la password al prossimo accesso.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nuova password temporanea</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        form.setValue("password", generatePassword(), {
                          shouldValidate: true,
                        })
                      }
                    >
                      <Dices className="size-4" />
                      Genera
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annulla
              </Button>
              <Button type="submit" disabled={updateUser.isPending}>
                {updateUser.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Reimposta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
