import { z } from "zod";

export const ApiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.unknown().optional(),
});

export type ApiError = z.infer<typeof ApiErrorSchema>;

export type ApiResponse<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: ApiError };

export function apiResponseSchema<TSchema extends z.ZodTypeAny>(dataSchema: TSchema) {
  return z.discriminatedUnion("success", [
    z.object({
      success: z.literal(true),
      data: dataSchema,
      error: z.null(),
    }),
    z.object({
      success: z.literal(false),
      data: z.null(),
      error: ApiErrorSchema,
    }),
  ]);
}

