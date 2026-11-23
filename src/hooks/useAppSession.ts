"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFallbackSiteName } from "@/lib/env";
import type { UserProfile } from "@/lib/types";

export interface AppSessionData {
  siteName: string;
  user: UserProfile | null;
  isDemoMode: boolean;
}

export const APP_SESSION_QUERY_KEY = ["app-session"] as const;

export function useAppSession() {
  const queryClient = useQueryClient();

  const query = useQuery<AppSessionData>({
    queryKey: APP_SESSION_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        return {
          siteName: getFallbackSiteName(),
          user: null,
          isDemoMode: false,
        };
      }
      return (await res.json()) as AppSessionData;
    },
    staleTime: 2 * 60 * 1000, // Giữ cache trên thanh điều hướng suốt 2 phút khi chuyển qua lại các trang!
    refetchOnWindowFocus: true,
  });

  return {
    siteName: query.data?.siteName ?? "CMC",
    user: query.data?.user ?? null,
    isDemoMode: query.data?.isDemoMode ?? false,
    isLoadingSession: query.isLoading,
    refreshSession: () =>
      queryClient.invalidateQueries({ queryKey: APP_SESSION_QUERY_KEY }),
  };
}
