import Link from "next/link";
import { ArrowRight, Calendar, Flame, Trophy, Users } from "lucide-react";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getCampaignPhase,
  getCampaignPhaseLabel,
} from "@/lib/campaign-rules";
import { getCoverAccentClass } from "@/lib/cover-accent";
import { formatDateVNLocal } from "@/lib/format";
import type { CampaignSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CampaignCard({ camp }: { camp: CampaignSummary }) {
  const phase = getCampaignPhase(camp.startsAt, camp.endsAt);
  const accent = getCoverAccentClass(camp.coverColor);

  return (
    <Link
      href={`/campaigns/${camp.slug}`}
      prefetch={false}
      className="group block"
    >
      <Card className="flex h-full flex-col overflow-hidden transition-colors hover:border-primary/45 hover:bg-muted/20">
        <div className={cn("h-1 w-full", accent)} />
        <div className="flex flex-1 flex-col justify-between gap-4 p-5">
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h2 className="heading-3 line-clamp-2 group-hover:text-primary">
                {camp.title}
              </h2>
              <Badge
                variant={
                  phase === "active"
                    ? "success"
                    : phase === "upcoming"
                      ? "bounty"
                      : "subtle"
                }
                className="shrink-0"
              >
                {getCampaignPhaseLabel(phase)}
              </Badge>
            </div>

            <p className="inline-flex items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span>
                {formatDateVNLocal(camp.startsAt)} →{" "}
                {formatDateVNLocal(camp.endsAt)}
              </span>
            </p>

            {camp.description && (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {camp.description}
              </p>
            )}

            {camp.badgesPreview.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {camp.badgesPreview.slice(0, 3).map((bp) => (
                  <CampaignBadgePill
                    key={bp.awardId}
                    name={bp.badgeName}
                    icon={bp.badgeIcon}
                    color={bp.badgeColor}
                  />
                ))}
                {camp.badgesPreview.length > 3 && (
                  <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    +{camp.badgesPreview.length - 3} huy hiệu
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
            <div className="flex flex-wrap items-center gap-3 tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-bounty" />
                {camp.threadCount} thử thách
              </span>
              <span className="inline-flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                {camp.awardCount} mốc thưởng
              </span>
              {camp.awardeesCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {camp.awardeesCount} đạt giải
                </span>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-medium text-primary">
              Chi tiết
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
