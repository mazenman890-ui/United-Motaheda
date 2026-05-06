import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";
import { addFavoriteRow, fetchFavoriteProductIds, removeFavoriteRow } from "../services/favoritesApi";

type FavoritesContextType = {
  favoriteIds: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  isBusy: boolean;
  errorMessage: string;
};

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!user?.id || user.role !== "customer") {
      setFavoriteIds(new Set());
      setErrorMessage("");
      return;
    }

    let cancelled = false;
    void (async () => {
      setIsBusy(true);
      setErrorMessage("");
      try {
        const ids = await fetchFavoriteProductIds(user.id);
        if (!cancelled) {
          setFavoriteIds(new Set(ids));
        }
      } catch (error) {
        if (!cancelled) {
          setFavoriteIds(new Set());
          setErrorMessage(error instanceof Error ? error.message : "Wishlist is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setIsBusy(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds],
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (!user?.id || user.role !== "customer") {
        return;
      }

      const wasFavorite = favoriteIds.has(productId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorite) {
          next.delete(productId);
        } else {
          next.add(productId);
        }
        return next;
      });

      try {
        if (wasFavorite) {
          await removeFavoriteRow(user.id, productId);
        } else {
          await addFavoriteRow(user.id, productId);
        }
        setErrorMessage("");
      } catch {
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) {
            next.add(productId);
          } else {
            next.delete(productId);
          }
          return next;
        });
        setErrorMessage("Wishlist could not be updated right now.");
        toast.error("Wishlist could not be updated right now.");
      }
    },
    [favoriteIds, user?.id, user?.role],
  );

  const value = useMemo(
    () => ({
      favoriteIds,
      isFavorite,
      toggleFavorite,
      isBusy,
      errorMessage,
    }),
    [errorMessage, favoriteIds, isBusy, isFavorite, toggleFavorite],
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}
