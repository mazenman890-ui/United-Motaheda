import type { DeliveryStatus } from "@pharmacy/contracts";
import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { cn } from "./UI";

type GeofenceStatusBannerProps = {
  lang: "ar" | "en";
  status: DeliveryStatus | null | undefined;
  className?: string;
};

export function GeofenceStatusBanner({ lang, status, className }: GeofenceStatusBannerProps) {
  if (!status) return null;

  if (!status.isDeliverable) {
    const message =
      status.reasonCode === "OUT_OF_ZONE"
        ? lang === "ar"
          ? "عنوانك خارج نطاق خدمة الفرع المختار حالياً."
          : "Your location is outside our service zone for the selected branch."
        : lang === "ar"
          ? "لا يمكن تأكيد إمكانية التوصيل حالياً."
          : "Delivery availability cannot be confirmed right now.";

    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-800",
          className,
        )}
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-black">{lang === "ar" ? "غير قابل للتوصيل" : "Not deliverable"}</p>
          <p className="text-xs font-semibold leading-relaxed text-rose-700">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div className="space-y-1">
          <p className="text-sm font-black">{lang === "ar" ? "التوصيل متاح" : "Deliverable"}</p>
          <p className="text-xs font-semibold text-emerald-800">
            {lang === "ar" ? "رسوم التوصيل:" : "Delivery fee:"}{" "}
            <span className="font-black">{status.cost ?? 0} EGP</span>
          </p>
        </div>
      </div>

      {status.eta ? (
        <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-xs font-black text-emerald-800">
          <Clock3 className="h-4 w-4" />
          {lang === "ar"
            ? `من ${status.eta.minMinutes} إلى ${status.eta.maxMinutes} دقيقة`
            : `${status.eta.minMinutes}–${status.eta.maxMinutes} min`}
        </div>
      ) : null}
    </div>
  );
}

