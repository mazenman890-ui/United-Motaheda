import { z } from "zod";
export declare const GovernorateSchema: z.ZodLiteral<"Cairo">;
export type Governorate = z.infer<typeof GovernorateSchema>;
export declare const BranchSchema: z.ZodObject<{
    id: z.ZodString;
    nameAr: z.ZodString;
    nameEn: z.ZodString;
    governorate: z.ZodLiteral<"Cairo">;
    area: z.ZodString;
    lat: z.ZodNumber;
    lng: z.ZodNumber;
    mapEmbedSrc: z.ZodOptional<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type Branch = z.infer<typeof BranchSchema>;
