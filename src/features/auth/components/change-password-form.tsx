"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { homeFor } from "@/components/layout/nav-config";

import { useAuth } from "../auth-provider";
import { changePasswordSchema, type ChangePasswordValues } from "../schemas";
import { changeOwnPassword, translateAuthError } from "../service";

export function ChangePasswordForm() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values: ChangePasswordValues) => {
    if (!user) return;
    try {
      await changeOwnPassword(user, values.currentPassword, values.newPassword);
      toast.success("Parola d'ordine aggiornata", {
        description: "La tua nuova chiave segreta è stata forgiata.",
      });
      router.replace(homeFor(profile?.role));
    } catch (error) {
      toast.error("Operazione non riuscita", {
        description: translateAuthError(error),
      });
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password attuale</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nuova password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                />
              </FormControl>
              <FormDescription>
                Almeno 8 caratteri, con lettere e numeri.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Conferma nuova password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  className="h-11"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-11 w-full font-heading text-base font-semibold tracking-widest uppercase"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Forgiatura in corso…
            </>
          ) : (
            "Conferma la nuova password"
          )}
        </Button>
      </form>
    </Form>
  );
}
