import { Award, CheckCircle2, Flame, Gift, Lock, Trophy } from "lucide-react";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { ViewerCampaignProgress } from "@/lib/campaign-service";
import { formatDateVNLocal } from "@/lib/format";
import type { CampaignAwardItem } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CampaignAwardsSection({
  awards,
  viewerId,
  completedCount,
  grantedAwards,
}: {
  awards: CampaignAwardItem[];
  viewerId: string | null;
  completedCount: number;
  grantedAwards: ViewerCampaignProgress["grantedAwards"];
}) {
  return (
    <section className="space-y-3">
      <h2 className="heading-2 flex items-center gap-2">
        <Trophy className="h-4 w-4 text-bounty" />
        Hệ thống Award &amp; Huy hiệu ({awards.length})
      </h2>

      {awards.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          Ban Quản Trị chưa thiết lập mốc Award cho giải đấu này.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
          {awards.map((aw) => {
            const grant = grantedAwards[aw.id];
            const unlocked = Boolean(grant);
            const remaining = Math.max(
              0,
              aw.requiredCompletedCount - completedCount
            );

            return (
              <Card
                key={aw.id}
                className={cn(
                  "flex flex-col justify-between gap-3 p-4 sm:p-5",
                  unlocked && "border-success-border bg-success-surface/20"
                )}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <CampaignBadgePill
                      name={aw.badgeName}
                      icon={aw.badgeIcon}
                      color={aw.badgeColor}
                      size="md"
                    />
                    {unlocked ? (
                      <Badge variant="success">
                        <CheckCircle2 className="h-3 w-3" />
                        Đã đạt
                      </Badge>
                    ) : viewerId ? (
                      <Badge variant="subtle" className="tabular-nums">
                        <Lock className="h-3 w-3" />
                        Còn {remaining} bài
                      </Badge>
                    ) : (
                      <Badge variant="subtle" className="tabular-nums">
                        ≥ {aw.requiredCompletedCount} thử thách
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {aw.title}
                    </h3>
                    {aw.description && (
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {aw.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/45 px-2 py-1 font-medium tabular-nums text-foreground">
                      <Flame className="h-3.5 w-3.5 text-primary" />
                      Hoàn thành {aw.requiredCompletedCount} thử thách
                    </span>
                    {aw.bonusPoints > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-bounty-border bg-bounty-surface px-2 py-1 font-semibold tabular-nums text-bounty-foreground">
                        <Award className="h-3.5 w-3.5 text-bounty" />+
                        {aw.bonusPoints} điểm thưởng
                      </span>
                    )}
                  </div>

                  {aw.rewardName && (
                    <div className="flex items-center gap-2.5 rounded-md border border-border bg-card p-2 text-xs">
                      {aw.rewardImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={aw.rewardImageUrl}
                          alt={aw.rewardName}
                          className="h-9 w-9 shrink-0 rounded border border-border object-cover"
                        />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border bg-bounty-surface text-bounty">
                          <Gift className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">
                          Phần quà Shop đi kèm
                        </p>
                        <p className="truncate font-semibold text-foreground">
                          {aw.rewardName}
                        </p>
                      </div>
                      {grant && grant.rewardStatus !== "none" && (
                        <Badge
                          variant={
                            grant.rewardStatus === "fulfilled"
                              ? "success"
                              : "bounty"
                          }
                          className="shrink-0"
                        >
                          {grant.rewardStatus === "fulfilled"
                            ? "Đã trao"
                            : "Chờ trao"}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-border pt-2.5 text-[11px] tabular-nums text-muted-foreground">
                  <span>{aw.grantedCount} học sinh đã đạt mốc này</span>
                  {grant && (
                    <span className="font-medium text-success">
                      Đạt ngày {formatDateVNLocal(grant.awardedAt)}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
