"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchSchema = exports.GovernorateSchema = void 0;
const zod_1 = require("zod");
const geo_1 = require("./geo");
exports.GovernorateSchema = zod_1.z.literal("Cairo");
exports.BranchSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    nameAr: zod_1.z.string().min(1),
    nameEn: zod_1.z.string().min(1),
    governorate: exports.GovernorateSchema,
    area: zod_1.z.string().min(1),
    lat: geo_1.CoordinatesSchema.shape.lat,
    lng: geo_1.CoordinatesSchema.shape.lng,
    mapEmbedSrc: zod_1.z.string().url().optional(),
    isActive: zod_1.z.boolean().default(true),
});
//# sourceMappingURL=branch.js.map