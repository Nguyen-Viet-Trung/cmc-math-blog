"use client";

import { memo } from "react";
import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, Sigma } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NAV_GROUPS, isNavRouteActive } from "@/lib/navigation";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  siteName: string;
  collapsed: boolean;
  effectivePath: string;
  user: UserProfile | null;
  isLoadingSession: boolean;
  onSignOut: () => void;
}

export const AppSidebar = memo(function AppSidebar({
  siteName,
  collapsed,
  effectivePath,
  user,
  isLoadingSession,
  onSignOut,
}: AppSidebarProps) {
  const loginHref =
    effectivePath && effectivePath !== "/" && effectivePath !== "/login"
      ? `/login?next=${encodeURIComponent(effectivePath)}`
      : "/login";

  return (
    <aside
      aria-label="Điều hướng chính"
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-card/40 transition-[width] duration-150 lg:flex",
        collapsed ? "w-[64px]" : "w-[228px]"
      )}
    >
      {/* Brand header — khớp chiều cao h-[52px] của Top Header */}
      <div
        className={cn(
          "flex h-[52px] shrink-0 items-center border-b border-border",
          collapsed ? "justify-center px-2" : "px-4"
        )}
      >
        <Link
          href="/"
          prefetch={false}
          title={`${siteName} — CMA MATHS CLUB blog`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sigma className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
                {siteName}
              </span>
              <span className="truncate text-[11px] leading-tight text-muted-foreground">
                CMA MATHS CLUB
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Navigation links grouped by priority */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <nav aria-label="Danh mục chức năng" className="flex flex-col">
          {NAV_GROUPS.map((group, groupIdx) => (
            <div
              key={group.id}
              className={cn(
                groupIdx > 0 &&
                  (collapsed
                    ? "mt-2.5 border-t border-border/70 pt-2.5"
                    : "mt-3.5 border-t border-border/60 pt-3")
              )}
            >
              {!collapsed && (
                <p
                  title={group.description}
                  className={cn(
                    "section-label mb-1.5 px-2.5 text-[10.5px]",
                    group.priority === "primary"
                      ? "text-primary/90"
                      : "text-muted-foreground/85"
                  )}
                >
                  {group.label}
                </p>
              )}
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isNavRouteActive(effectivePath, item.href);
                  const isPrimary = group.priority === "primary";
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      title={collapsed ? `${group.label}: ${item.label}` : undefined}
                      className={cn(
                        "relative flex h-9 items-center rounded-md text-[13.5px] transition-colors",
                        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                        active
                          ? isPrimary
                            ? "bg-primary/10 font-semibold text-foreground"
                            : "bg-muted font-semibold text-foreground"
                          : isPrimary
                            ? "font-medium text-foreground/85 hover:bg-muted/60 hover:text-foreground"
                            : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {active && !collapsed && (
                        <span className="absolute bottom-1.5 left-0 top-1.5 w-[2.5px] rounded-full bg-primary" />
                      )}
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          active
                            ? "text-primary"
                            : isPrimary
                              ? "text-primary/80"
                              : "text-muted-foreground"
                        )}
                      />
                      {!collapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {user?.role === "admin" && (
          <div
            className={cn(
              collapsed
                ? "mt-2.5 border-t border-border/70 pt-2.5"
                : "mt-3.5 border-t border-border/60 pt-3"
            )}
          >
            {!collapsed && (
              <p className="section-label mb-1.5 px-2.5 text-[10.5px]">
                Quản trị
              </p>
            )}
            <Link
              href="/admin"
              prefetch={false}
              aria-current={
                isNavRouteActive(effectivePath, "/admin") ? "page" : undefined
              }
              aria-label={collapsed ? "Admin Portal" : undefined}
              title={collapsed ? "Quản trị: Admin Portal" : undefined}
              className={cn(
                "relative flex h-9 items-center rounded-md text-[13.5px] transition-colors",
                collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                isNavRouteActive(effectivePath, "/admin")
                  ? "bg-muted font-semibold text-foreground"
                  : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {isNavRouteActive(effectivePath, "/admin") && !collapsed && (
                <span className="absolute bottom-1.5 left-0 top-1.5 w-[2.5px] rounded-full bg-primary" />
              )}
              <ShieldCheck
                className={cn(
                  "h-4 w-4 shrink-0",
                  isNavRouteActive(effectivePath, "/admin")
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              />
              {!collapsed && <span className="truncate">Admin Portal</span>}
            </Link>
          </div>
        )}
      </div>

      {/* Sidebar Footer: Khớp chiều cao h-[60px] + border-t với Footer cột phải */}
      <div
        className={cn(
          "flex h-[60px] shrink-0 items-center border-t border-border",
          collapsed ? "justify-center px-1.5" : "px-2.5"
        )}
      >
        {isLoadingSession ? (
          <Skeleton
            className={cn(
              "rounded-md",
              collapsed ? "mx-auto h-8 w-8" : "h-9 w-full"
            )}
          />
        ) : user ? (
          collapsed ? (
            <div className="flex items-center gap-1">
              <Link
                href="/profile"
                prefetch={false}
                title={`${user.displayName} (Khả dụng: ${user.pointsBalance}đ · Tổng đạt: ${user.totalEarnedPoints}đ)`}
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
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void onSignOut()}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex w-full items-center gap-1.5">
              <Link
                href="/profile"
                prefetch={false}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-muted/70"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={user.displayName}
                  />
                  <AvatarFallback className="text-[11px]">
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold leading-tight text-foreground">
                    {user.displayName}
                  </p>
                  <p className="truncate text-[11px] leading-tight text-muted-foreground">
                    {user.nickname
                      ? `${user.nickname} · ${user.gradeLevel}`
                      : user.gradeLevel}
                  </p>
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => void onSignOut()}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        ) : collapsed ? (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mx-auto flex h-8 w-8"
            title="Đăng nhập"
          >
            <Link href={loginHref} aria-label="Đăng nhập">
              <LogIn className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Link href={loginHref}>
              <LogIn className="h-4 w-4" />
              Đăng nhập / Đăng ký
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
});
