"use client";

import Link from "next/link";
import { LogOut, ShieldCheck, Sigma } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { NAV_GROUPS, isNavRouteActive } from "@/lib/navigation";
import type { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AppMobileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteName: string;
  effectivePath: string;
  user: UserProfile | null;
  onSignOut: () => void;
}

export function AppMobileDrawer({
  open,
  onOpenChange,
  siteName,
  effectivePath,
  user,
  onSignOut,
}: AppMobileDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[264px] p-4">
        <div className="flex items-center gap-2.5 pr-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sigma className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <SheetTitle className="truncate text-sm">{siteName}</SheetTitle>
            <p className="text-[11px] text-muted-foreground">
              CMA MATHS CLUB blog
            </p>
          </div>
        </div>

        <Separator className="my-3.5" />

        <nav
          aria-label="Danh mục chức năng"
          className="flex flex-1 flex-col overflow-y-auto pr-0.5"
        >
          {NAV_GROUPS.map((group, groupIdx) => (
            <div
              key={group.id}
              className={cn(
                groupIdx > 0 && "mt-3 border-t border-border/60 pt-3"
              )}
            >
              <p
                className={cn(
                  "section-label mb-1.5 px-2.5 text-[10.5px]",
                  group.priority === "primary"
                    ? "text-primary/90"
                    : "text-muted-foreground/85"
                )}
              >
                {group.label}
              </p>
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
                      onClick={() => onOpenChange(false)}
                      className={cn(
                        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                        active
                          ? isPrimary
                            ? "bg-primary/10 font-semibold text-foreground"
                            : "bg-muted font-semibold text-foreground"
                          : isPrimary
                            ? "font-medium text-foreground/85 hover:bg-muted/60 hover:text-foreground"
                            : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
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
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {user?.role === "admin" && (
            <div className="mt-3 border-t border-border/60 pt-3">
              <p className="section-label mb-1.5 px-2.5 text-[10.5px]">
                Quản trị
              </p>
              <Link
                href="/admin"
                prefetch={false}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
                  isNavRouteActive(effectivePath, "/admin")
                    ? "bg-muted font-semibold text-foreground"
                    : "font-normal text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
                Admin Portal
              </Link>
            </div>
          )}
        </nav>

        <div className="mt-auto space-y-3 border-t border-border pt-3.5">
          {user && (
            <div className="flex items-center justify-between gap-2 px-1">
              <Link
                href="/profile"
                prefetch={false}
                onClick={() => onOpenChange(false)}
                className="flex min-w-0 items-center gap-2"
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
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user.displayName}
                  </p>
                  <p className="text-[11px] font-medium tabular-nums text-bounty">
                    {user.pointsBalance}đ khả dụng ·{" "}
                    <span className="text-muted-foreground">
                      {user.totalEarnedPoints}đ tổng
                    </span>
                  </p>
                </div>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => {
                  onOpenChange(false);
                  void onSignOut();
                }}
                aria-label="Đăng xuất"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between px-1">
            <span className="text-xs text-muted-foreground">Giao diện</span>
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
