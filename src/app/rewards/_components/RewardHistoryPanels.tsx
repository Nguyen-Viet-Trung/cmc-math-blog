"use client";

import { Clock, History } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { PointTransactionItem, RedemptionItem } from "@/lib/types";

const STATUS_BADGE: Record<
  RedemptionItem["status"],
  { label: string; variant: BadgeProps["variant"] }
> = {
  pending: {
    label: "Đang chờ Admin duyệt",
    variant: "bounty",
  },
  approved: {
    label: "Đã duyệt — Chuẩn bị trao quà",
    variant: "subtle",
  },
  fulfilled: {
    label: "Đã trao quà thành công",
    variant: "success",
  },
  rejected: {
    label: "Từ chối (Đã hoàn lại điểm)",
    variant: "destructive",
  },
};

export function RewardHistoryPanels({
  redemptions,
  pointHistory,
}: {
  redemptions: RedemptionItem[];
  pointHistory: PointTransactionItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
      <Card className="space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Clock className="h-4 w-4 text-primary" />
          Đơn đổi quà của bạn ({redemptions.length})
        </h3>
        {redemptions.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Bạn chưa có đơn đổi quà nào.
          </p>
        ) : (
          <div className="max-h-80 space-y-2.5 overflow-y-auto pr-1">
            {redemptions.map((rd) => {
              const badge = STATUS_BADGE[rd.status];
              return (
                <div
                  key={rd.id}
                  className="space-y-1.5 rounded-xl border border-border bg-muted/40 p-3 text-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong className="text-foreground">{rd.rewardName}</strong>
                    <Badge variant={badge.variant} className="rounded-full">
                      {badge.label}
                    </Badge>
                  </div>
                  <p className="tabular-nums text-muted-foreground">
                    Điểm sử dụng:{" "}
                    <strong className="text-foreground">
                      -{rd.pointsSpent}đ
                    </strong>{" "}
                    • {new Date(rd.createdAt).toLocaleDateString("vi-VN")}
                  </p>
                  {rd.adminNote && (
                    <p className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-foreground">
                      <strong>Phản hồi từ Admin:</strong> {rd.adminNote}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-5">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <History className="h-4 w-4 text-success" />
          Lịch sử cộng / trừ điểm gần đây
        </h3>
        {pointHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Chưa có giao dịch điểm nào. Hãy giải bài toán đầu tiên nhé!
          </p>
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {pointHistory.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {tx.reason}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(tx.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-extrabold tabular-nums ${
                    tx.amount >= 0 ? "text-success" : "text-destructive"
                  }`}
                >
                  {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}đ
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
