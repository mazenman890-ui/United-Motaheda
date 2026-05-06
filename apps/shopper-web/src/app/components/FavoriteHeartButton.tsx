import { Heart } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useFavorites } from "../../contexts/FavoritesContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { cn } from "./UI";

export function FavoriteHeartButton({
  productId,
  className,
  size = "md",
}: {
  productId: string;
  className?: string;
  size?: "sm" | "md";
}) {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(productId);
  const canUse = Boolean(user?.id && user.role === "customer");

  if (!canUse) {
    return null;
  }

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggleFavorite(productId);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border bg-white/95 shadow-sm transition-colors",
        size === "sm" ? "h-9 w-9" : "h-11 w-11",
        active
          ? "border-rose-200 text-rose-600 hover:bg-rose-50"
          : "border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-500",
        className,
      )}
      aria-pressed={active}
      aria-label={active ? t("favorite_remove") : t("favorite_add")}
      title={active ? t("favorite_remove") : t("favorite_add")}
    >
      <Heart className={cn(iconClass, active && "fill-current")} aria-hidden />
    </button>
  );
}
