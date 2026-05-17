import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from "../api";
import { DEFAULT_PREFERENCES, type NotificationPreferences } from "../types";

const KEY = (userId: string) => ["notification-preferences", userId] as const;

export function useNotificationPreferences(userId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery<NotificationPreferences>({
    queryKey: userId ? KEY(userId) : ["notification-preferences", "anonymous"],
    enabled: !!userId,
    queryFn: () => fetchNotificationPreferences(userId!),
    initialData: DEFAULT_PREFERENCES,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: (patch: Partial<NotificationPreferences>) =>
      updateNotificationPreferences(userId!, patch),
    onMutate: async (patch) => {
      if (!userId) return;
      await qc.cancelQueries({ queryKey: KEY(userId) });
      const previous = qc.getQueryData<NotificationPreferences>(KEY(userId));
      qc.setQueryData<NotificationPreferences>(KEY(userId), (curr) => {
        const c = curr ?? DEFAULT_PREFERENCES;
        return {
          channels:   { ...c.channels,   ...(patch.channels   ?? {}) },
          categories: { ...c.categories, ...(patch.categories ?? {}) },
        };
      });
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (userId && ctx?.previous) qc.setQueryData(KEY(userId), ctx.previous);
    },
    onSuccess: (next) => {
      if (userId) qc.setQueryData(KEY(userId), next);
    },
  });

  return {
    preferences: query.data ?? DEFAULT_PREFERENCES,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    update: mutation.mutate,
    isUpdating: mutation.isPending,
  };
}
