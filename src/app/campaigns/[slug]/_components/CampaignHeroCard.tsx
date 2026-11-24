import Link from "next/link";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCampaignPhase,
  getCampaignPhaseLabel,
} from "@/lib/campaign-rules";
import { getCoverAccentClass } from "@/lib/cover-accent";
import { formatDateVNLocal } from "@/lib/format";
import type { CampaignDetail } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CampaignHeroCard({
  camp,
  viewerId,
  completedCount,
}: {
  camp: CampaignDetail;
  viewerId: string | null;
  completedCount: number;
}) {
  const phase = getCampaignPhase(camp.startsAt, camp.endsAt);
  const accent = getCoverAccentClass(camp.coverColor);
  const totalChallenges = camp.items.length;
  const progressPercent =
    totalChallenges > 0
      ? Math.min(100, Math.round((completedCount / totalChallenges) * 100))
      : 0;

  return (
    <Card className="overflow-hidden">
      <div className={cn("h-1.5 w-full", accent)} />
      <div className="space-y-4 p-6 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  phase === "active"
                    ? "success"
                    : phase === "upcoming"
                      ? "bounty"
                      : "subtle"
                }
              >
                {getCampaignPhaseLabel(phase)}
              </Badge>
              {!camp.isPublished && (
                <Badge variant="subtle">Bản nháp (chỉ Admin thấy)</Badge>
              )}
              <span className="inline-flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateVNLocal(camp.startsAt)} →{" "}
                {formatDateVNLocal(camp.endsAt)}
              </span>
            </div>
            <h1 className="heading-1">{camp.title}</h1>
          </div>

          <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/35 px-3.5 py-2 text-xs tabular-nums">
            <div>
              <span className="block text-[11px] text-muted-foreground">
                Thử thách
              </span>
              <strong className="text-sm font-bold text-foreground">
                {camp.threadCount}
              </strong>
            </div>
            <div className="border-l border-border pl-3.5">
              <span className="block text-[11px] text-muted-foreground">
                Mốc Award
              </span>
              <strong className="text-sm font-bold text-bounty">
                {camp.awardCount}
              </strong>
            </div>
            <div className="border-l border-border pl-3.5">
              <span className="block text-[11px] text-muted-foreground">
                Đạt giải
              </span>
              <strong className="text-sm font-bold text-success">
                {camp.awardeesCount}
              </strong>
            </div>
          </div>
        </div>

        {camp.description && (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {camp.description}
          </p>
        )}

        {viewerId ? (
          <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-foreground">
                Tiến độ của bạn: {completedCount} / {totalChallenges} thử thách
                được duyệt
              </span>
              <span className="font-semibold tabular-nums text-primary">
                {progressPercent}%
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Tiến độ hoàn thành giải đấu"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Khi lời giải của bạn trong các bài thử thách dưới đây được Admin
              phê duyệt đúng trong thời gian giải đấu, hệ thống sẽ tự động mở
              khóa Award, cộng điểm thưởng và gắn Huy hiệu vào hồ sơ.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3 text-xs">
            <span className="text-muted-foreground">
              Đăng nhập để theo dõi tiến độ hoàn thành thử thách và tự động nhận
              Huy hiệu vào hồ sơ cá nhân.
            </span>
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/login?next=${encodeURIComponent(`/campaigns/${camp.slug}`)}`}
              >
                Đăng nhập
              </Link>
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
