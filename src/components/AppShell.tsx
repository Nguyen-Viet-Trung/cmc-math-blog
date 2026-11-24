"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Award,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Sigma,
} from "lucide-react";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { SetupBanner } from "@/components/SetupBanner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/useAppSession";
import { getRoutePageTitle, SIDEBAR_STORAGE_KEY } from "@/lib/navigation";

const AppMobileDrawer = dynamic(
  () =>
    import("@/components/AppMobileDrawer").then((m) => m.AppMobileDrawer),
  { ssr: false }
);

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { siteName, user, isDemoMode, isLoadingSession, refreshSession } =
    useAppSession();

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1") {
        setCollapsed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    setPendingHref(null);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    function handleDocumentClick(e: MouseEvent) {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey
      ) {
        return;
      }
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      const targetPath = href.split("?")[0].split("#")[0];
      const currentFull = window.location.pathname + window.location.search;
      if (href !== currentFull && targetPath !== pathname) {
        setPendingHref(targetPath);
      }
    }
    document.addEventListener("click", handleDocumentClick);
    return () => document.removeEventListener("click", handleDocumentClick);
  }, [pathname]);

  function toggleSidebarCollapse() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }

  const effectivePath = pendingHref ?? pathname;
  const pageTitle = getRoutePageTitle(effectivePath);
  const loginHref =
    pathname && pathname !== "/" && pathname !== "/login"
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";

  async function handleSignOut() {
    try {
      const { createSupabaseBrowserClient } = await import(
        "@/lib/supabase/client"
      );
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    await refreshSession();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Chuyển tới nội dung chính
      </a>
      <AppSidebar
        siteName={siteName}
        collapsed={collapsed}
        effectivePath={effectivePath}
        user={user}
        isLoadingSession={isLoadingSession}
        onSignOut={handleSignOut}
      />

      {/* RIGHT COLUMN: Banner + Slim Header + Main Content + Compact Footer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <SetupBanner show={isDemoMode} />

        <header className="sticky top-0 z-30 flex h-[52px] w-full items-center border-b border-border bg-background/95 backdrop-blur-sm">
          {pendingHref && (
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px] overflow-hidden bg-primary/15">
              <div className="h-full w-1/2 animate-progress-indeterminate bg-primary" />
            </div>
          )}

          <div className="flex h-full w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            {/* Trái: Mobile drawer + logo HOẶC Desktop collapse toggle + tiêu đề trang */}
            <div className="flex min-w-0 items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDrawerMounted(true);
                  setDrawerOpen(true);
                }}
                className="h-8 w-8 shrink-0 lg:hidden"
                aria-label="Mở thanh điều hướng"
              >
                <Menu className="h-4 w-4" />
              </Button>

              <Link
                href="/"
                prefetch={false}
                className="flex items-center gap-2 lg:hidden"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Sigma className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-bold tracking-tight text-foreground">
                  {siteName}
                </span>
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleSidebarCollapse}
                className="hidden h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
                title={collapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
                aria-label={collapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>

              <span className="hidden truncate text-sm font-semibold text-foreground lg:inline">
                {pageTitle}
              </span>
            </div>

            {/* Phải: Điểm thưởng, Sáng/Tối, Avatar (mobile) và CTA chính */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {user && (
                <Link
                  href="/rewards"
                  prefetch={false}
                  className="hidden items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold tabular-nums text-bounty-foreground transition-colors hover:bg-muted sm:inline-flex"
                  title={`Điểm khả dụng đổi quà: ${user.pointsBalance}đ · Tổng điểm tích lũy: ${user.totalEarnedPoints}đ`}
                >
                  <Award className="h-3.5 w-3.5 text-bounty" />
                  <span>{user.pointsBalance} điểm</span>
                </Link>
              )}

              {user && <NotificationBell />}

              <ThemeToggle />

              {!isLoadingSession &&
                (user ? (
                  <Link
                    href="/profile"
                    prefetch={false}
                    className="rounded-full p-0.5 lg:hidden"
                    aria-label="Hồ sơ cá nhân"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage
                        src={user.avatarUrl ?? undefined}
                        alt={user.displayName}
                      />
                      <AvatarFallback className="text-[11px]">
                        {user.displayName.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ) : (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs lg:hidden"
                  >
                    <Link href={loginHref}>Đăng nhập</Link>
                  </Button>
                ))}

              <Button asChild size="sm" className="h-8 px-3">
                <Link href="/threads/new" prefetch={false}>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Đăng câu hỏi</span>
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1220px] flex-1 px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>

        <footer className="mt-8 flex min-h-[60px] items-center border-t border-border py-2 lg:h-[60px] lg:py-0">
          <div className="mx-auto flex w-full max-w-[1220px] flex-wrap items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:px-6 lg:px-8">
            <span className="font-medium text-foreground/80">
              {siteName} · CMA MATHS CLUB blog
            </span>
            <span className="italic">
              &ldquo;Nhà toán học xuất sắc nhìn thấy sự tương đồng giữa các phép
              chứng minh.&rdquo; — S. Banach
            </span>
          </div>
        </footer>
      </div>

      {drawerMounted && (
        <AppMobileDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          siteName={siteName}
          effectivePath={effectivePath}
          user={user}
          onSignOut={handleSignOut}
        />
      )}
    </div>
  );
}
