import { z } from "zod";

// Lettere, numeri, underscore e trattino (es. "dungeon-master"); 3-20 caratteri.
export const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;
export const PASSWORD_MIN_LENGTH = 8;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Almeno ${PASSWORD_MIN_LENGTH} caratteri`)
  .regex(/[a-zA-Z]/, "Deve contenere almeno una lettera")
  .regex(/[0-9]/, "Deve contenere almeno un numero");

export const loginSchema = z.object({
  username: z.string().min(1, "Inserisci il nome utente"),
  password: z.string().min(1, "Inserisci la password"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Inserisci la password attuale"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    message: "La nuova password deve essere diversa da quella attuale",
    path: ["newPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
