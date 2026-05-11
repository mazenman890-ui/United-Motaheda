import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { GOVERNORATE_LOCK } from "../constants/location";
import { cn } from "./UI";

type BranchItem = {
  id: string;
  nameAr: string;
  nameEn: string;
  area: string;
};

type BranchSelectorProps = {
  lang: "ar" | "en";
  locations: readonly BranchItem[];
  selectedArea: string;
  selectedBranchId: string;
  onChangeArea: (value: string) => void;
  onChangeBranch: (branchId: string) => void;
  className?: string;
};

export function BranchSelector({
  lang,
  locations,
  selectedArea,
  selectedBranchId,
  onChangeArea,
  onChangeBranch,
  className,
}: BranchSelectorProps) {
  const areas = useMemo(() => {
    return Array.from(new Set(locations.map((branch) => branch.area))).sort();
  }, [locations]);

  const branchesInArea = useMemo(() => {
    return locations.filter((branch) => branch.area === selectedArea);
  }, [locations, selectedArea]);

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-teal-200/70 bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-800">
          <MapPin className="h-4 w-4" />
          {lang === "ar" ? "المحافظة:" : "Governorate:"} {lang === "ar" ? "القاهرة" : GOVERNORATE_LOCK}
        </span>
        <span className="text-xs font-semibold text-slate-500">
          {lang === "ar"
            ? "الخدمة متاحة داخل القاهرة فقط."
            : "Service is restricted to Cairo only."}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">
            {lang === "ar" ? "المنطقة" : "Area"}
          </span>
          <select
            value={selectedArea}
            onChange={(e) => onChangeArea(e.target.value)}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.06)] outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15"
          >
            <option value="">{lang === "ar" ? "اختر المنطقة" : "Select area"}</option>
            {areas.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-black text-slate-700">
            {lang === "ar" ? "الفرع" : "Branch"}
          </span>
          <select
            value={selectedBranchId}
            onChange={(e) => onChangeBranch(e.target.value)}
            disabled={!selectedArea}
            className={cn(
              "h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_2px_10px_rgba(15,23,42,0.06)] outline-none transition-colors focus:border-teal-400 focus:ring-2 focus:ring-teal-500/15",
              !selectedArea && "opacity-70",
            )}
          >
            <option value="">{lang === "ar" ? "اختر الفرع" : "Select branch"}</option>
            {branchesInArea.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {lang === "ar"
                  ? `${branch.nameAr} — ${branch.area}`
                  : `${branch.nameEn} — ${branch.area}`}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

