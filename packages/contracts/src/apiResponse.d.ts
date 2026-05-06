import { z } from "zod";
export declare const ApiErrorSchema: z.ZodObject<{
    code: z.ZodString;
    message: z.ZodString;
    details: z.ZodOptional<z.ZodUnknown>;
}, z.core.$strip>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiResponse<T> = {
    success: true;
    data: T;
    error: null;
} | {
    success: false;
    data: null;
    error: ApiError;
};
export declare function apiResponseSchema<TSchema extends z.ZodTypeAny>(dataSchema: TSchema): z.ZodDiscriminatedUnion<[z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: TSchema;
    error: z.ZodNull;
}, z.core.$strip>, z.ZodObject<{
    success: z.ZodLiteral<false>;
    data: z.ZodNull;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strip>], "success">;
