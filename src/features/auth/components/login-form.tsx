"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { loginSchema, type LoginValues } from "../schemas";
import { loginWithUsername, translateAuthError } from "../service";

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const onSubmit = async (values: LoginValues) => {
    try {
      const { mustChangePassword } = await loginWithUsername(
        values.username,
        values.password
      );
      toast.success("Bentornato in Amberland");
      router.replace(mustChangePassword ? "/cambia-password" : "/home");
    } catch (error) {
      toast.error("Accesso negato", { description: translateAuthError(error) });
    }
  };

  const { isSubmitting } = form.formState;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome utente</FormLabel>
              <FormControl>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold/60" />
                  <Input
                    {...field}
                    autoComplete="username"
                    placeholder="Il tuo nome nel regno"
                    className="h-11 pl-9"
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold/60" />
                  <Input
                    {...field}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="La tua parola segreta"
                    className="h-11 pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-gold"
                    aria-label={
                      showPassword ? "Nascondi password" : "Mostra password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
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
              Apertura dei cancelli…
            </>
          ) : (
            "Accedi"
          )}
        </Button>
      </form>
    </Form>
  );
}
