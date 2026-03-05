import { z } from "zod/v4";

export const empfehlungCreateSchema = z.object({
  kunde_name: z.string().min(1, "Name ist erforderlich").max(120),
  kunde_kontakt: z.string().max(200).optional(),
  empfehler_name: z.string().min(1, "Name ist erforderlich").max(120),
  empfehler_email: z.email("Ungültige E-Mail-Adresse").max(200),
  handwerker_id: z.string().uuid("Ungültige Partner-ID"),
  ref_code: z
    .string()
    .regex(/^#SEE-\d{4}-[A-Z0-9]{4,6}$/, "Ungültiges Ref-Code Format")
    .optional(),
});

export const empfehlungCompleteSchema = z.object({
  rechnungsbetrag: z
    .number()
    .positive("Betrag muss positiv sein")
    .max(999999, "Betrag zu hoch"),
});

export const handwerkerCreateSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.email().max(200),
  telefon: z.string().max(50).optional(),
  provision_prozent: z.number().min(0).max(50),
});

export const handwerkerUpdateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  email: z.email().max(200).optional(),
  telefon: z.string().max(50).optional().nullable(),
  provision_prozent: z.number().min(0).max(50).optional(),
  active: z.boolean().optional(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
