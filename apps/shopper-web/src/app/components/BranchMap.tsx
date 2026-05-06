import { MapPin } from "lucide-react";
import { cn } from "./UI";
import type { SiteLocation } from "../data";

type BranchMapProps = {
  locations: readonly SiteLocation[];
  selectedBranchId: string;
  isArabic: boolean;
  onSelectBranch: (branchId: string) => void;
  className?: string;
};

const MAP_PADDING = 12;

export function BranchMap({
  locations,
  selectedBranchId,
  isArabic,
  onSelectBranch,
  className,
}: BranchMapProps) {
  const validLocations = locations.filter(
    (location) => Number.isFinite(location.lat) && Number.isFinite(location.lng),
  );

  if (validLocations.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[280px] items-center justify-center rounded-[1.7rem] border border-slate-200 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500",
          className,
        )}
      >
        {isArabic ? "لا توجد إحداثيات متاحة للفروع حالياً." : "Branch coordinates are unavailable right now."}
      </div>
    );
  }

  const latitudes = validLocations.map((location) => location.lat);
  const longitudes = validLocations.map((location) => location.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return (
    <div
      className={cn(
        "relative min-h-[320px] overflow-hidden rounded-[1.7rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#eef8f7_100%)]",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.12),transparent_34%)]" />
      <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-x-6 top-6 flex items-center justify-between gap-3">
        <div className="rounded-full border border-white/80 bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm">
          {isArabic ? "خريطة الفروع" : "Branch Map"}
        </div>
        <div className="rounded-full border border-slate-200 bg-white/92 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500 shadow-sm">
          {locations.length} {isArabic ? "فروع" : "branches"}
        </div>
      </div>

      <div className="absolute inset-0">
        {validLocations.map((location) => {
          const normalizedX = (location.lng - minLng) / lngRange;
          const normalizedY = (location.lat - minLat) / latRange;
          const left = MAP_PADDING + normalizedX * (100 - MAP_PADDING * 2);
          const top = MAP_PADDING + (1 - normalizedY) * (100 - MAP_PADDING * 2);
          const selected = location.id === selectedBranchId;
          const label = isArabic ? location.nameAr : location.nameEn;

          return (
            <button
              key={location.id}
              type="button"
              onClick={() => onSelectBranch(location.id)}
              className="group absolute -translate-x-1/2 -translate-y-1/2 text-left focus-visible:outline-none"
              style={{ left: `${left}%`, top: `${top}%` }}
              aria-label={label}
            >
              <span
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border shadow-[0_12px_30px_rgba(15,23,42,0.15)] transition-transform duration-200 group-hover:scale-105",
                  selected
                    ? "border-teal-500 bg-teal-500 text-white"
                    : "border-white/80 bg-white text-slate-700",
                )}
              >
                <MapPin className="h-5 w-5" />
              </span>
              <span
                className={cn(
                  "pointer-events-none absolute start-1/2 top-[calc(100%+0.6rem)] hidden min-w-max -translate-x-1/2 rounded-full border px-3 py-1.5 text-[11px] font-black shadow-sm sm:block",
                  selected
                    ? "border-teal-200 bg-white text-teal-700"
                    : "border-slate-200 bg-white/95 text-slate-600",
                )}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
