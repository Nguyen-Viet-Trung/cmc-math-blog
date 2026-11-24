import Link from "next/link";
import { Medal, Trophy } from "lucide-react";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import type { BadgeCollectorSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TopBadgeCollectors({
  collectors,
}: {
  collectors: BadgeCollectorSummary[];
}) {
  if (collectors.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="heading-2 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-bounty" />
          Bảng vinh danh Sưu tầm Huy hiệu ({collectors.length})
        </h2>
        <p className="text-xs text-muted-foreground">
          Nhấn vào thành viên để xem toàn bộ Huy hiệu &amp; Giải thưởng trên hồ
          sơ công khai
        </p>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {collectors.map((collector, idx) => (
          <Link
            key={collector.userId}
            href={`/members/${collector.userId}#badges`}
            prefetch={false}
            className="group flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "w-6 shrink-0 font-mono text-xs font-bold tabular-nums",
                  idx === 0
                    ? "text-bounty"
                    : idx === 1
                      ? "text-foreground"
                      : idx === 2
                        ? "text-bounty/80"
                        : "text-muted-foreground"
                )}
              >
                #{idx + 1}
              </span>

              <Avatar className="h-9 w-9 shrink-0 border border-border">
                <AvatarImage
                  src={collector.avatarUrl ?? undefined}
                  alt={collector.displayName}
                />
                <AvatarFallback className="text-xs font-semibold">
                  {collector.displayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                  {collector.displayName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {collector.nickname
                    ? `${collector.nickname} · ${collector.gradeLevel}`
                    : collector.gradeLevel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="flex flex-wrap items-center gap-1">
                {collector.recentBadges.slice(0, 3).map((b) => (
                  <CampaignBadgePill
                    key={b.id}
                    name={b.badgeName}
                    icon={b.badgeIcon}
                    color={b.badgeColor}
                    size="sm"
                  />
                ))}
                {collector.badgeCount > 3 && (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
                    +{collector.badgeCount - 3}
                  </span>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-2 pl-1 text-xs tabular-nums">
                <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                  <Medal className="h-3.5 w-3.5 text-bounty" />
                  {collector.badgeCount}
                </span>
                {collector.totalBonusPoints > 0 && (
                  <span className="font-medium text-bounty">
                    +{collector.totalBonusPoints}đ
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </Card>
    </section>
  );
}
