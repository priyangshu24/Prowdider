import { z } from "zod";

export const createLeadSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phoneNumber: z.string().trim().min(10).max(20),
  city: z.string().trim().min(2).max(100),
  serviceId: z.coerce.number().int().min(1).max(3),
  description: z.string().trim().min(10).max(1000),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;

export function normalizePhoneNumber(value: string) {
  return value.replace(/\D/g, "");
}
