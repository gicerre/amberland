import { z } from "zod";

import { passwordSchema, USERNAME_REGEX } from "@/features/auth/schemas";
import { ROLES } from "@/types/models";

/**
 * Schemi condivisi client/server per la gestione utenti
 * (validati sia nei form sia nelle API admin).
 */

export const createUserSchema = z.object({
  username: z
    .string()
    .regex(
      USERNAME_REGEX,
      "Da 3 a 20 caratteri: lettere, numeri, underscore o trattino"
    ),
  password: passwordSchema,
  role: z.enum(ROLES),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    role: z.enum(ROLES).optional(),
    password: passwordSchema.optional(),
    disabled: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
  })
  .refine(
    (values) => Object.values(values).some((value) => value !== undefined),
    { message: "Nessuna modifica richiesta" }
  );

export type UpdateUserValues = z.infer<typeof updateUserSchema>;
