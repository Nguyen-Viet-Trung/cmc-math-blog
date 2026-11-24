import Link from "next/link";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { formatDateVNLocal } from "@/lib/format";
import type { CampaignGrantItem } from "@/lib/types";

export function CampaignHallOfFame({
  grants,
}: {
  grants: CampaignGrantItem[];
}) {
  if (grants.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="heading-2">
        Bảng Vinh danh Giải đấu ({grants.length})
      </h2>
      <Card className="divide-y divide-border overflow-hidden">
        {grants.map((g) => (
          <div
            key={g.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs"
          >
            <Link
              href={`/members/${g.userId}`}
              prefetch={false}
              className="group flex min-w-0 items-center gap-2.5"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarImage
                  src={g.userAvatarUrl ?? undefined}
                  alt={g.userDisplayName}
                />
                <AvatarFallback className="text-[11px]">
                  {g.userDisplayName.slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground group-hover:text-primary">
                  {g.userDisplayName}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {g.userGradeLevel} · {g.awardTitle}
                </p>
              </div>
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <CampaignBadgePill
                name={g.badgeName}
                icon={g.badgeIcon}
                color={g.badgeColor}
              />
              {g.pointsAwarded > 0 && (
                <span className="font-semibold tabular-nums text-bounty">
                  +{g.pointsAwarded}đ
                </span>
              )}
              <span className="tabular-nums text-muted-foreground">
                {formatDateVNLocal(g.awardedAt)}
              </span>
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}
