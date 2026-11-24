"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Award,
  Calendar,
  ExternalLink,
  Flame,
  Gift,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getCampaignPhase,
  getCampaignPhaseLabel,
} from "@/lib/campaign-rules";
import type { AdminCampaignItem } from "@/lib/campaign-service";
import { formatDateVNLocal } from "@/lib/format";
import type { CampaignAwardItem } from "@/lib/types";

interface AdminCampaignCardProps {
  camp: AdminCampaignItem;
  busyId: string | null;
  onEditCampaign: (camp: AdminCampaignItem) => void;
  onDeleteCampaign: (camp: AdminCampaignItem) => void;
  onAttachThread: (campaignId: string) => void;
  onDetachThread: (campaignId: string, threadId: string) => void;
  onAddAward: (camp: AdminCampaignItem) => void;
  onEditAward: (camp: AdminCampaignItem, award: CampaignAwardItem) => void;
  onDeleteAward: (award: CampaignAwardItem) => void;
  onOpenGrants: (campaignId: string) => void;
}

export const AdminCampaignCard = memo(function AdminCampaignCard({
  camp,
  busyId,
  onEditCampaign,
  onDeleteCampaign,
  onAttachThread,
  onDetachThread,
  onAddAward,
  onEditAward,
  onDeleteAward,
  onOpenGrants,
}: AdminCampaignCardProps) {
  const phase = getCampaignPhase(camp.startsAt, camp.endsAt);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="heading-3">{camp.title}</h3>
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
            {!camp.isPublished && <Badge variant="subtle">Đang ẩn</Badge>}
            {camp.pendingGiftsCount > 0 && (
              <Badge variant="bounty">
                {camp.pendingGiftsCount} quà chờ trao
              </Badge>
            )}
          </div>
          <p className="inline-flex flex-wrap items-center gap-1.5 text-xs tabular-nums text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>
              {formatDateVNLocal(camp.startsAt)} →{" "}
              {formatDateVNLocal(camp.endsAt)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{camp.threads.length} thử thách</span>
            <span aria-hidden="true">·</span>
            <span>{camp.awards.length} Award</span>
            <span aria-hidden="true">·</span>
            <span>{camp.totalGrantsCount} lượt trao</span>
          </p>
          {camp.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {camp.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAddAward(camp)}
          >
            <Award className="h-3.5 w-3.5" />
            Thêm Award
          </Button>

          <ActionMenu
            triggerLabel={`Thao tác giải đấu ${camp.title}`}
            items={[
              {
                id: "attach",
                label: "Gắn bài thử thách",
                icon: <Flame className="h-3.5 w-3.5" />,
                onSelect: () => onAttachThread(camp.id),
              },
              {
                id: "grants",
                label: `Học sinh đạt giải (${camp.totalGrantsCount})`,
                icon: <Users className="h-3.5 w-3.5" />,
                onSelect: () => onOpenGrants(camp.id),
              },
              {
                id: "edit",
                label: "Chỉnh sửa giải đấu",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onSelect: () => onEditCampaign(camp),
              },
              {
                id: "view",
                label: "Xem trang học sinh",
                icon: <ExternalLink className="h-3.5 w-3.5" />,
                onSelect: () => {
                  window.open(
                    `/campaigns/${camp.slug}`,
                    "_blank",
                    "noopener,noreferrer"
                  );
                },
              },
              {
                id: "delete",
                label: "Xóa giải đấu",
                icon: <Trash2 className="h-3.5 w-3.5" />,
                variant: "destructive",
                separatorBefore: true,
                onSelect: () => onDeleteCampaign(camp),
              },
            ]}
          />
        </div>
      </div>

      {/* Awards & Badges Grid */}
      <div className="space-y-2 border-t border-border pt-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Các mốc Award &amp; Huy hiệu ({camp.awards.length})
          </span>
          <button
            type="button"
            onClick={() => onOpenGrants(camp.id)}
            className="text-primary hover:underline"
          >
            Quản lý trao giải &amp; quà →
          </button>
        </div>

        {camp.awards.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            Chưa thiết lập Award nào. Bấm &ldquo;Thêm Award&rdquo; để tạo mốc
            thưởng và Huy hiệu.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {camp.awards.map((aw) => (
              <div
                key={aw.id}
                className="flex items-start justify-between gap-2 rounded-lg border border-border bg-muted/25 p-3 text-xs"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <CampaignBadgePill
                      name={aw.badgeName}
                      icon={aw.badgeIcon}
                      color={aw.badgeColor}
                    />
                    <span className="font-semibold tabular-nums text-bounty">
                      +{aw.bonusPoints}đ
                    </span>
                  </div>
                  <p className="font-semibold text-foreground">{aw.title}</p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    Yêu cầu ≥ {aw.requiredCompletedCount} thử thách ·{" "}
                    {aw.grantedCount} học sinh đã đạt
                  </p>
                  {aw.rewardName && (
                    <p className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                      <Gift className="h-3 w-3 text-bounty" />
                      Quà Shop: {aw.rewardName}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Chỉnh sửa Award ${aw.title}`}
                    title="Chỉnh sửa Award"
                    onClick={() => onEditAward(camp, aw)}
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Xóa Award ${aw.title}`}
                    title="Xóa Award"
                    onClick={() => onDeleteAward(aw)}
                    className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Linked Challenge Threads */}
      <div className="space-y-2 border-t border-border pt-3.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Bài Thử thách thuộc giải đấu ({camp.threads.length})
          </span>
          <button
            type="button"
            onClick={() => onAttachThread(camp.id)}
            className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
          >
            <Plus className="h-3 w-3" />
            Gắn bài thử thách
          </button>
        </div>

        {camp.threads.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            Chưa gắn bài thử thách nào. Hãy gắn ít nhất 1 bài để học sinh làm
            bài và tự động nhận Award.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {camp.threads.map((t, idx) => (
              <li
                key={t.threadId}
                className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                    #{idx + 1}
                  </span>
                  <Link
                    href={`/threads/${t.threadId}`}
                    target="_blank"
                    prefetch={false}
                    className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {t.title}
                  </Link>
                  <span className="shrink-0 tabular-nums text-[11px] text-bounty">
                    +{t.bountyPoints}đ
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busyId === `rm:${camp.id}:${t.threadId}`}
                  onClick={() => onDetachThread(camp.id, t.threadId)}
                  aria-label={`Gỡ bài ${t.title} khỏi giải đấu`}
                  title="Gỡ bài khỏi giải đấu"
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
});
