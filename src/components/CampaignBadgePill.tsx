import Link from "next/link";
import {
  Award,
  Crown,
  Flame,
  Gift,
  Medal,
  Shield,
  Sparkles,
  Star,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDateVNLocal } from "@/lib/format";
import type {
  BadgeColorKey,
  BadgeIconKey,
  UserEarnedBadge,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const BADGE_ICON_MAP: Record<BadgeIconKey, LucideIcon> = {
  trophy: Trophy,
  medal: Medal,
  crown: Crown,
  star: Star,
  flame: Flame,
  award: Award,
  sparkles: Sparkles,
  shield: Shield,
};

const BADGE_TONE_CLASSES: Record<
  BadgeColorKey,
  { pill: string; icon: string }
> = {
  amber: {
    pill: "border-bounty-border bg-bounty-surface text-bounty-foreground",
    icon: "text-bounty",
  },
  blue: {
    pill: "border-primary/30 bg-primary/10 text-primary",
    icon: "text-primary",
  },
  emerald: {
    pill: "border-success-border bg-success-surface text-success-foreground",
    icon: "text-success",
  },
  rose: {
    pill: "border-destructive/30 bg-destructive/10 text-destructive",
    icon: "text-destructive",
  },
  indigo: {
    pill: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    icon: "text-indigo-600 dark:text-indigo-400",
  },
  slate: {
    pill: "border-border bg-muted text-foreground",
    icon: "text-muted-foreground",
  },
};

export function CampaignBadgePill({
  name,
  icon,
  color,
  size = "sm",
  title,
  className,
}: {
  name: string;
  icon: BadgeIconKey;
  color: BadgeColorKey;
  size?: "sm" | "md";
  title?: string;
  className?: string;
}) {
  const Icon = BADGE_ICON_MAP[icon] ?? Trophy;
  const tone = BADGE_TONE_CLASSES[color] ?? BADGE_TONE_CLASSES.amber;

  return (
    <span
      title={title ?? name}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none",
        size === "md" ? "px-3 py-1.5 text-xs" : "px-2.5 py-1 text-[11px]",
        tone.pill,
        className
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          size === "md" ? "h-3.5 w-3.5" : "h-3 w-3",
          tone.icon
        )}
      />
      <span className="truncate">{name}</span>
    </span>
  );
}

export function UserBadgesCabinet({
  badges,
  showRewardStatus = false,
  ownerName,
  id,
}: {
  badges: UserEarnedBadge[];
  showRewardStatus?: boolean;
  ownerName?: string;
  id?: string;
}) {
  const totalBonusPoints = badges.reduce(
    (sum, item) => sum + item.pointsAwarded,
    0
  );

  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="heading-2 flex items-center gap-2">
            <Medal className="h-4 w-4 text-bounty" />
            Huy hiệu &amp; Giải thưởng ({badges.length})
          </h2>
          {totalBonusPoints > 0 && (
            <span className="rounded-full border border-bounty-border bg-bounty-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-bounty-foreground">
              +{totalBonusPoints}đ từ giải đấu
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs font-medium">
          <Link
            href="/badges"
            prefetch={false}
            className="text-muted-foreground transition-colors hover:text-primary hover:underline"
          >
            Bộ sưu tập Huy hiệu
          </Link>
          <Link
            href="/campaigns"
            prefetch={false}
            className="text-primary hover:underline"
          >
            Xem Giải đấu
          </Link>
        </div>
      </div>

      {badges.length === 0 ? (
        <Card className="border-dashed p-6 text-center text-xs text-muted-foreground">
          {ownerName ? (
            <>
              <span className="font-medium text-foreground">{ownerName}</span>{" "}
              chưa đạt huy hiệu hay giải thưởng nào từ các giải đấu. Khám phá{" "}
              <Link
                href="/campaigns"
                prefetch={false}
                className="font-medium text-primary hover:underline"
              >
                Giải đấu đang mở
              </Link>{" "}
              hoặc{" "}
              <Link
                href="/badges"
                prefetch={false}
                className="font-medium text-primary hover:underline"
              >
                Bộ sưu tập Huy hiệu
              </Link>{" "}
              của CLB!
            </>
          ) : (
            <>
              Chưa có Huy hiệu giải đấu nào. Tham gia giải các bài thử thách
              trong mục{" "}
              <Link
                href="/campaigns"
                prefetch={false}
                className="font-medium text-primary hover:underline"
              >
                Giải đấu
              </Link>{" "}
              để mở khóa Award và Huy hiệu!
            </>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Quick badge showcase bar */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-muted/25 px-3.5 py-2.5">
            {badges.map((b) => (
              <Link
                key={`pill-${b.id}`}
                href={`/campaigns/${b.campaignSlug}`}
                prefetch={false}
                className="transition-opacity hover:opacity-85"
              >
                <CampaignBadgePill
                  name={b.badgeName}
                  icon={b.badgeIcon}
                  color={b.badgeColor}
                  size="sm"
                  title={`${b.awardTitle} · ${b.campaignTitle} (Đạt ngày ${formatDateVNLocal(b.awardedAt)})`}
                />
              </Link>
            ))}
          </div>

          {/* Detailed awards & badges list */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {badges.map((b) => (
              <Link
                key={b.id}
                href={`/campaigns/${b.campaignSlug}`}
                prefetch={false}
                className="group block"
              >
                <Card className="flex h-full flex-col justify-between gap-2.5 p-4 transition-colors hover:border-primary/40 hover:bg-muted/20">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CampaignBadgePill
                        name={b.badgeName}
                        icon={b.badgeIcon}
                        color={b.badgeColor}
                        size="md"
                      />
                      {b.pointsAwarded > 0 && (
                        <span className="text-xs font-semibold tabular-nums text-bounty">
                          +{b.pointsAwarded}đ
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground group-hover:text-primary">
                        {b.awardTitle}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        Giải đấu: {b.campaignTitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2 text-[11px] text-muted-foreground">
                    <span className="tabular-nums">
                      Đạt ngày {formatDateVNLocal(b.awardedAt)}
                    </span>
                    {b.rewardName && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground">
                        <Gift className="h-3 w-3 text-bounty" />
                        <span className="max-w-[160px] truncate">
                          {b.rewardName}
                        </span>
                        {showRewardStatus && (
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px]",
                              b.rewardStatus === "fulfilled"
                                ? "bg-success-surface text-success-foreground"
                                : "bg-bounty-surface text-bounty-foreground"
                            )}
                          >
                            {b.rewardStatus === "fulfilled"
                              ? "Đã nhận"
                              : "Chờ trao"}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
