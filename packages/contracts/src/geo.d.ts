import { z } from "zod";
export declare const CoordinatesSchema: z.ZodObject<{
    lat: z.ZodNumber;
    lng: z.ZodNumber;
}, z.core.$strip>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export declare const PolygonSchema: z.ZodObject<{
    points: z.ZodArray<z.ZodObject<{
        lat: z.ZodNumber;
        lng: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Polygon = z.infer<typeof PolygonSchema>;
export declare function pointInPolygon(point: Coordinates, polygon: Polygon): boolean;
