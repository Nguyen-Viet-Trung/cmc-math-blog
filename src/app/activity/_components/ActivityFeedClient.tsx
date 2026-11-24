"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Compass,
  Loader2,
  LogIn,
  RefreshCw,
  Users,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  ActivityFeedPage,
  ActivityFeedTab,
  ActivityItem,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { ActivityEventRow } from "./ActivityEventRow";

interface ActivityFeedClientProps {
  initialTab: ActivityFeedTab;
  initialPage: ActivityFeedPage;
  isAuthenticated: boolean;
  followingCount: number;
  categoryNameBySlug: Record<string, string>;
}

interface TabCacheState {
  items: ActivityItem[];
  nextCursor: string | null;
  hasMore: boolean;
  loaded: boolean;
}

export function ActivityFeedClient({
  initialTab,
  initialPage,
  isAuthenticated,
  followingCount,
  categoryNameBySlug,
}: ActivityFeedClientProps) {
  const [activeTab, setActiveTab] = useState<ActivityFeedTab>(initialTab);
  const [feeds, setFeeds] = useState<Record<ActivityFeedTab, TabCacheState>>({
    discover:
      initialTab === "discover"
        ? { ...initialPage, loaded: true }
        : { items: [], nextCursor: null, hasMore: false, loaded: false },
    following:
      initialTab === "following"
        ? { ...initialPage, loaded: true }
        : { items: [], nextCursor: null, hasMore: false, loaded: false },
  });
  const [isLoadingTab, setIsLoadingTab] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  // Đồng bộ tab & dữ liệu khi điều hướng URL từ bên ngoài (vd bấm link Sidebar "Hoạt động")
  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;

    setActiveTab(initialTab);
    setError(null);
    setIsLoadingTab(false);
    setIsLoadingMore(false);
    setFeeds((prev) => ({
      ...prev,
      [initialTab]: { ...initialPage, loaded: true },
    }));
  }, [initialTab, initialPage]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const currentFeed = feeds[activeTab];

  async function fetchFeed(
    tab: ActivityFeedTab,
    options?: { cursor?: string | null; append?: boolean }
  ) {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestId = ++requestIdRef.current;

    const append = Boolean(options?.append);
    setError(null);
    if (append) {
      setIsLoadingMore(true);
      setIsLoadingTab(false);
    } else {
      setIsLoadingTab(true);
      setIsLoadingMore(false);
    }

    try {
      const sp = new URLSearchParams({ tab, limit: "20" });
      if (options?.cursor) sp.set("cursor", options.cursor);

      const res = await fetch(`/api/activity?${sp.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const data = (await res.json()) as {
        items?: ActivityItem[];
        nextCursor?: string | null;
        hasMore?: boolean;
        error?: string;
      };

      if (requestIdRef.current !== requestId) return;

      if (!res.ok) {
        setError(data.error || "Không thể tải dòng hoạt động lúc này.");
        return;
      }

      const incoming = Array.isArray(data.items) ? data.items : [];
      setFeeds((prev) => {
        const existing = prev[tab];
        const merged = append
          ? [
              ...existing.items,
              ...incoming.filter(
                (n) => !existing.items.some((e) => e.id === n.id)
              ),
            ]
          : incoming;
        return {
          ...prev,
          [tab]: {
            items: merged,
            nextCursor: data.nextCursor ?? null,
            hasMore: Boolean(data.hasMore),
            loaded: true,
          },
        };
      });
    } catch (err) {
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        requestIdRef.current !== requestId
      ) {
        return;
      }
      setError("Lỗi kết nối mạng. Vui lòng thử tải lại.");
    } finally {
      if (requestIdRef.current === requestId) {
        setIsLoadingTab(false);
        setIsLoadingMore(false);
      }
    }
  }

  function handleSwitchTab(nextTab: ActivityFeedTab) {
    if (nextTab === activeTab) return;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    requestIdRef.current += 1;

    setActiveTab(nextTab);
    setError(null);
    setIsLoadingTab(false);
    setIsLoadingMore(false);

    const nextUrl = nextTab === "following" ? "/activity?tab=following" : "/activity";
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", nextUrl);
    }

    if (nextTab === "following" && !isAuthenticated) {
      return;
    }

    if (!feeds[nextTab].loaded) {
      void fetchFeed(nextTab);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div
          role="tablist"
          aria-label="Chế độ xem dòng hoạt động"
          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "discover"}
            onClick={() => handleSwitchTab("discover")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
              activeTab === "discover"
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Compass className="h-3.5 w-3.5" />
            <span>Khám phá</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "following"}
            onClick={() => handleSwitchTab("following")}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded px-3 text-xs font-medium transition-colors",
              activeTab === "following"
                ? "bg-background font-semibold text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Đang theo dõi</span>
            {isAuthenticated && followingCount > 0 && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {followingCount}
              </span>
            )}
          </button>
        </div>

        {!(activeTab === "following" && !isAuthenticated) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isLoadingTab || isLoadingMore}
            onClick={() => void fetchFeed(activeTab)}
            className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", isLoadingTab && "animate-spin")}
            />
            <span>Làm mới</span>
          </Button>
        )}
      </div>

      {error && <Alert variant="destructive">{error}</Alert>}

      {activeTab === "following" && !isAuthenticated ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LogIn />
            </EmptyMedia>
            <EmptyTitle>Đăng nhập để theo dõi bạn học</EmptyTitle>
            <EmptyDescription>
              Theo dõi các thành viên bạn yêu thích để xem bài toán, lời giải hay
              và huy hiệu mới nhất của họ tại đây.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild size="sm">
              <Link href="/login?next=/activity?tab=following">Đăng nhập ngay</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : isLoadingTab && !currentFeed.loaded ? (
        <div className="flex items-center justify-center rounded-lg border border-border bg-card py-14 text-xs text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang tải dòng hoạt động...
        </div>
      ) : currentFeed.items.length === 0 ? (
        activeTab === "following" ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>
                {followingCount === 0
                  ? "Bạn chưa theo dõi thành viên nào"
                  : "Chưa có hoạt động mới từ người bạn theo dõi"}
              </EmptyTitle>
              <EmptyDescription>
                {followingCount === 0
                  ? "Khám phá Bảng vàng hoặc diễn đàn để theo dõi các bạn học cùng chuyên mục Toán yêu thích."
                  : "Các câu hỏi, lời giải đúng và huy hiệu mới nhất của thành viên bạn theo dõi sẽ xuất hiện tại đây."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm" variant="default">
                <Link href="/leaderboard" prefetch={false}>
                  Khám phá Bảng vàng
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleSwitchTab("discover")}
              >
                Xem tab Khám phá
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Activity />
              </EmptyMedia>
              <EmptyTitle>Chưa có hoạt động nào được ghi nhận</EmptyTitle>
              <EmptyDescription>
                Hãy là người đầu tiên đặt câu hỏi Toán học hoặc chia sẻ lời giải
                cùng câu lạc bộ.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild size="sm">
                <Link href="/threads/new" prefetch={false}>
                  Đăng câu hỏi đầu tiên
                </Link>
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="divide-y divide-border">
            {currentFeed.items.map((item) => (
              <ActivityEventRow
                key={item.id}
                item={item}
                categoryNameBySlug={categoryNameBySlug}
              />
            ))}
          </div>

          {currentFeed.hasMore && currentFeed.nextCursor && (
            <div className="border-t border-border bg-muted/20 px-4 py-3 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoadingMore}
                onClick={() =>
                  void fetchFeed(activeTab, {
                    cursor: currentFeed.nextCursor,
                    append: true,
                  })
                }
                className="h-8 text-xs"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Đang tải thêm...
                  </>
                ) : (
                  "Tải thêm hoạt động cũ hơn"
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
