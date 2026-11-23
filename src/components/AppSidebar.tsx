"use client";

import Link from "next/link";
import { LogIn, LogOut, ShieldCheck, Sigma } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MAIN_NAV_ITEMS, isNavRouteActive } from "@/lib/navigation";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  siteName: string;
  collapsed: boolean;
  effectivePath: string;
  user: UserProfile | null;
  isLoadingSession: boolean;
  onSignOut: () => Promise<void>;
}

export function AppSidebar({
  siteName,
  collapsed,
  effectivePath,
  user,
  isLoadingSession,
  onSignOut,
}: AppSidebarProps) {
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
          prefetch={true}
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

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <nav className="flex flex-col gap-0.5">
          {MAIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isNavRouteActive(effectivePath, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "relative flex h-9 items-center rounded-md text-[13.5px] transition-colors",
                  collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                  active
                    ? "bg-muted font-semibold text-foreground"
                    : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                {active && !collapsed && (
                  <span className="absolute bottom-1.5 left-0 top-1.5 w-[2.5px] rounded-full bg-primary" />
                )}
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {user?.role === "admin" && (
          <div className="mt-4 border-t border-border pt-3">
            {!collapsed && (
              <p className="section-label mb-1.5 px-2.5">Quản trị</p>
            )}
            <Link
              href="/admin"
              prefetch={true}
              title={collapsed ? "Admin Portal" : undefined}
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

      {/* Sidebar Footer: Single Source of Truth cho tài khoản trên Desktop */}
      <div className="shrink-0 border-t border-border p-2.5">
        {isLoadingSession ? (
          <Skeleton
            className={cn(
              "rounded-md",
              collapsed ? "mx-auto h-8 w-8" : "h-10 w-full"
            )}
          />
        ) : user ? (
          collapsed ? (
            <div className="flex flex-col items-center gap-1.5">
              <Link
                href="/profile"
                prefetch={true}
                title={`${user.displayName} (${user.pointsBalance} điểm)`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.avatarUrl ?? undefined}
                    alt={user.displayName}
                  />
                  <AvatarFallback className="text-xs">
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
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Link
                href="/profile"
                prefetch={true}
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
            <Link href="/login" prefetch={true} aria-label="Đăng nhập">
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
            <Link href="/login" prefetch={true}>
              <LogIn className="h-4 w-4" />
              Đăng nhập / Đăng ký
            </Link>
          </Button>
        )}
      </div>
    </aside>
  );
}
