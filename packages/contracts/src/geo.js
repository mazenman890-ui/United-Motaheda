"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolygonSchema = exports.CoordinatesSchema = void 0;
exports.pointInPolygon = pointInPolygon;
const zod_1 = require("zod");
exports.CoordinatesSchema = zod_1.z.object({
    lat: zod_1.z.number().finite(),
    lng: zod_1.z.number().finite(),
});
exports.PolygonSchema = zod_1.z.object({
    points: zod_1.z.array(exports.CoordinatesSchema).min(3),
});
function pointInPolygon(point, polygon) {
    const pts = polygon.points;
    if (pts.length < 3)
        return false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[j];
        const b = pts[i];
        const cross = (point.lat - a.lat) * (b.lng - a.lng) - (point.lng - a.lng) * (b.lat - a.lat);
        if (Math.abs(cross) > 1e-12)
            continue;
        const dot = (point.lng - a.lng) * (b.lng - a.lng) + (point.lat - a.lat) * (b.lat - a.lat);
        if (dot < 0)
            continue;
        const lenSq = (b.lng - a.lng) ** 2 + (b.lat - a.lat) ** 2;
        if (dot <= lenSq)
            return true;
    }
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i].lng;
        const yi = pts[i].lat;
        const xj = pts[j].lng;
        const yj = pts[j].lat;
        const intersects = yi > point.lat !== yj > point.lat
            && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
        if (intersects)
            inside = !inside;
    }
    return inside;
}
//# sourceMappingURL=geo.js.map