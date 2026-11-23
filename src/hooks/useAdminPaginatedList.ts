"use client";

import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { PaginatedResult } from "@/lib/pagination";

export function useDebouncedValue<T>(value: T, delayMs = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function useAdminPaginatedList<T>(params: {
  resource: "rewards" | "redemptions" | "students" | "threads" | "feedbacks";
  page: number;
  pageSize: number;
  query?: string;
  status?: string;
  type?: string;
  initialData: PaginatedResult<T>;
}) {
  const isDefaultView =
    params.page === 1 &&
    !params.query?.trim() &&
    (!params.status || params.status === "all") &&
    (!params.type || params.type === "all");

  const query = useQuery<PaginatedResult<T>>({
    queryKey: [
      "admin-list",
      params.resource,
      params.page,
      params.pageSize,
      params.query?.trim() ?? "",
      params.status ?? "all",
      params.type ?? "all",
    ],
    queryFn: async () => {
      const sp = new URLSearchParams({
        resource: params.resource,
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      if (params.query?.trim()) sp.set("q", params.query.trim());
      if (params.status && params.status !== "all") sp.set("status", params.status);
      if (params.type && params.type !== "all") sp.set("type", params.type);

      const res = await fetch(`/api/admin/list?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Không thể tải dữ liệu quản trị.");
      return (await res.json()) as PaginatedResult<T>;
    },
    initialData: isDefaultView ? params.initialData : undefined,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  });

  return {
    data: query.data ?? params.initialData,
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
