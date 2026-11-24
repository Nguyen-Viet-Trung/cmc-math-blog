import Link from "next/link";
import {
  Award,
  CheckCircle2,
  Flame,
  HelpCircle,
  Lock,
  MessageSquare,
  Trophy,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDateTimeVN, formatRelativeDate } from "@/lib/format";
import type { ActivityEventType, ActivityItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ActivityEventRowProps {
  item: ActivityItem;
  categoryNameBySlug: Record<string, string>;
}

const EVENT_CONFIG: Record<
  ActivityEventType,
  {
    verb: string;
    label: string;
    icon: typeof HelpCircle;
    iconClassName: string;
    badgeClassName: string;
  }
> = {
  new_question: {
    verb: "vừa đăng bài viết mới",
    label: "Bài mới",
    icon: HelpCircle,
    iconClassName: "text-primary bg-primary/10",
    badgeClassName: "border-border bg-muted/50 text-foreground",
  },
  new_solution: {
    verb: "vừa tham gia giải bài",
    label: "Lời giải",
    icon: MessageSquare,
    iconClassName: "text-foreground bg-muted",
    badgeClassName: "border-border bg-muted/50 text-muted-foreground",
  },
  accepted_solution: {
    verb: "có lời giải được chọn đúng",
    label: "Lời giải đúng",
    icon: CheckCircle2,
    iconClassName: "text-success bg-success-surface",
    badgeClassName:
      "border-success-border bg-success-surface text-success-foreground",
  },
  badge_earned: {
    verb: "vừa đạt Huy hiệu mới",
    label: "Huy hiệu",
    icon: Award,
    iconClassName: "text-bounty bg-bounty-surface",
    badgeClassName:
      "border-bounty-border bg-bounty-surface text-bounty-foreground",
  },
  campaign_launched: {
    verb: "vừa mở Giải đấu mới",
    label: "Giải đấu",
    icon: Trophy,
    iconClassName: "text-bounty bg-bounty-surface",
    badgeClassName:
      "border-bounty-border bg-bounty-surface text-bounty-foreground",
  },
};

export function ActivityEventRow({
  item,
  categoryNameBySlug,
}: ActivityEventRowProps) {
  const cfg = EVENT_CONFIG[item.eventType] ?? EVENT_CONFIG.new_question;
  const Icon = cfg.icon;
  const isBlind = item.metadata?.isBlindSubmission === true;
  const threadType =
    typeof item.metadata?.threadType === "string"
      ? item.metadata.threadType
      : null;
  const awardedPoints =
    typeof item.metadata?.awardedPoints === "number"
      ? item.metadata.awardedPoints
      : typeof item.metadata?.bonusPoints === "number"
        ? item.metadata.bonusPoints
        : 0;
  const categoryName = item.categorySlug
    ? categoryNameBySlug[item.categorySlug] ?? item.categorySlug
    : null;

  const verb =
    item.eventType === "new_question" && threadType === "challenge"
      ? "vừa mở Thử thách Tuần mới"
      : item.eventType === "new_question" && threadType === "research"
        ? "vừa đăng bài Research mới"
        : item.eventType === "new_question" && threadType === "news"
          ? "vừa chia sẻ bản tin mới"
          : item.eventType === "new_solution" && isBlind
            ? "vừa nộp bài Thử thách Tuần"
            : cfg.verb;

  return (
    <article className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/35 sm:gap-3.5 sm:px-5">
      <div className="relative mt-0.5 shrink-0">
        <Link
          href={`/members/${item.actor.id}`}
          prefetch={false}
          className="block rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Avatar className="h-9 w-9 border border-border">
            <AvatarImage
              src={item.actor.avatarUrl ?? undefined}
              alt={item.actor.displayName}
            />
            <AvatarFallback className="text-xs font-semibold">
              {item.actor.displayName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Link>
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-background p-0.5",
            cfg.iconClassName
          )}
        >
          {threadType === "challenge" && item.eventType === "new_question" ? (
            <Flame className="h-2.5 w-2.5" />
          ) : (
            <Icon className="h-2.5 w-2.5" />
          )}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <Link
              href={`/members/${item.actor.id}`}
              prefetch={false}
              className="font-semibold text-foreground hover:text-primary"
            >
              {item.actor.displayName}
            </Link>{" "}
            <span>{verb}</span>
          </p>
          <time
            dateTime={item.createdAt}
            title={formatDateTimeVN(item.createdAt)}
            className="shrink-0 text-[11px] tabular-nums text-muted-foreground"
          >
            {formatRelativeDate(item.createdAt)}
          </time>
        </div>

        <Link
          href={item.href}
          prefetch={false}
          className="block text-sm font-semibold leading-snug text-foreground line-clamp-2 hover:text-primary"
        >
          {item.title}
        </Link>

        {item.summary && (
          <p
            className={cn(
              "text-xs leading-relaxed line-clamp-2",
              isBlind
                ? "inline-flex items-center gap-1.5 text-muted-foreground italic"
                : "text-muted-foreground"
            )}
          >
            {isBlind && <Lock className="h-3 w-3 shrink-0" />}
            <span>{item.summary}</span>
          </p>
        )}

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <Badge
            variant="outline"
            className={cn("px-1.5 py-0 text-[11px] font-medium", cfg.badgeClassName)}
          >
            {cfg.label}
          </Badge>
          {categoryName && (
            <Link
              href={`/?cat=${encodeURIComponent(item.categorySlug ?? "")}`}
              prefetch={false}
              className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              {categoryName}
            </Link>
          )}
          {awardedPoints > 0 && (
            <span className="rounded border border-bounty-border bg-bounty-surface px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-bounty-foreground">
              +{awardedPoints}đ
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
