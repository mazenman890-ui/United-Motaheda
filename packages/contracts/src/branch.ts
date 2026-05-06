import { z } from "zod";
import { CoordinatesSchema } from "./geo";

export const GovernorateSchema = z.literal("Cairo");
export type Governorate = z.infer<typeof GovernorateSchema>;

export const BranchSchema = z.object({
  id: z.string().min(1),
  nameAr: z.string().min(1),
  nameEn: z.string().min(1),
  governorate: GovernorateSchema,
  area: z.string().min(1),
  lat: CoordinatesSchema.shape.lat,
  lng: CoordinatesSchema.shape.lng,
  mapEmbedSrc: z.string().url().optional(),
  isActive: z.boolean().default(true),
});

export type Branch = z.infer<typeof BranchSchema>;

