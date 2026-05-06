"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiErrorSchema = void 0;
exports.apiResponseSchema = apiResponseSchema;
const zod_1 = require("zod");
exports.ApiErrorSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    details: zod_1.z.unknown().optional(),
});
function apiResponseSchema(dataSchema) {
    return zod_1.z.discriminatedUnion("success", [
        zod_1.z.object({
            success: zod_1.z.literal(true),
            data: dataSchema,
            error: zod_1.z.null(),
        }),
        zod_1.z.object({
            success: zod_1.z.literal(false),
            data: zod_1.z.null(),
            error: exports.ApiErrorSchema,
        }),
    ]);
}
//# sourceMappingURL=apiResponse.js.map