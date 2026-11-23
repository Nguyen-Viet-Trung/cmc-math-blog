"use client";

import { useState } from "react";
import Link from "next/link";
import { Award, Gift } from "lucide-react";
import { RedeemRewardDialog } from "@/app/rewards/_components/RedeemRewardDialog";
import { RewardHistoryPanels } from "@/app/rewards/_components/RewardHistoryPanels";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PaginatedResult } from "@/lib/pagination";
import type {
  PointTransactionItem,
  RedemptionItem,
  RewardItem,
  UserProfile,
} from "@/lib/types";

export function RewardsClient({
  user,
  rewards,
  initialRedemptions,
  initialPointHistory,
}: {
  user: UserProfile | null;
  rewards: RewardItem[];
  initialRedemptions: PaginatedResult<RedemptionItem>;
  initialPointHistory: PaginatedResult<PointTransactionItem>;
}) {
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
        <div className="space-y-1">
          <h1 className="heading-1">Cửa hàng Đổi quà</h1>
          <p className="text-sm text-muted-foreground">
            Tích lũy điểm thưởng từ các lời giải đúng để đổi học cụ và sách Toán
            từ câu lạc bộ.
          </p>
        </div>

        {user ? (
          <div className="flex items-center gap-5 rounded-lg border border-border bg-card px-4 py-2.5 text-xs tabular-nums">
            <div>
              <p className="text-[11px] text-muted-foreground">Điểm khả dụng</p>
              <p className="text-lg font-bold text-bounty">
                {user.pointsBalance}đ
              </p>
            </div>
            <div className="space-y-0.5 border-l border-border pl-4 text-muted-foreground">
              <p>
                Tích lũy:{" "}
                <strong className="text-foreground">
                  {user.totalEarnedPoints}đ
                </strong>
              </p>
              <p>
                Giải đúng:{" "}
                <strong className="text-foreground">
                  {user.solvedCount} bài
                </strong>
              </p>
            </div>
          </div>
        ) : (
          <Button asChild size="sm">
            <Link href="/login?next=/rewards">Đăng nhập để đổi quà</Link>
          </Button>
        )}
      </header>

      {feedback && (
        <Alert
          variant={feedback.type === "success" ? "success" : "destructive"}
          className="font-semibold"
        >
          {feedback.text}
        </Alert>
      )}

      {/* Danh sách các mốc quà tặng */}
      <section className="space-y-3">
        <h2 className="heading-2">Danh sách Quà tặng hiện có</h2>

        {rewards.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
            Hiện Admin đang cập nhật danh mục quà tặng mới.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {rewards.map((r) => {
              const userPts = user?.pointsBalance ?? 0;
              const progress = Math.min(
                100,
                Math.round((userPts / Math.max(1, r.pointsCost)) * 100)
              );
              const canRedeem = Boolean(
                user && userPts >= r.pointsCost && r.stock > 0
              );

              return (
                <Card
                  key={r.id}
                  className="flex flex-col justify-between overflow-hidden transition hover:shadow-md"
                >
                  <div>
                    <div className="flex h-44 w-full items-center justify-center overflow-hidden border-b border-border bg-muted/60">
                      {r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Gift className="h-12 w-12 text-bounty" />
                      )}
                    </div>

                    <div className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="bounty" className="rounded-full">
                          <Award className="h-3.5 w-3.5 text-bounty" />
                          Mốc {r.pointsCost} điểm
                        </Badge>
                        <span
                          className={`text-xs font-semibold tabular-nums ${
                            r.stock > 0 ? "text-success" : "text-destructive"
                          }`}
                        >
                          {r.stock > 0
                            ? `Còn ${r.stock} suất`
                            : "Tạm hết quà"}
                        </span>
                      </div>

                      <h3 className="heading-3">{r.name}</h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {r.description}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4 pt-0">
                    {user && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-medium tabular-nums text-muted-foreground">
                          <span>Tiến độ của bạn</span>
                          <span>
                            {Math.min(userPts, r.pointsCost)}/{r.pointsCost}{" "}
                            điểm ({progress}%)
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-success transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {!user ? (
                      <Button
                        asChild
                        variant="outline"
                        className="w-full"
                        size="sm"
                      >
                        <Link href="/login?next=/rewards">
                          Đăng nhập để đổi quà
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={!canRedeem}
                        onClick={() => {
                          setSelectedReward(r);
                          setFeedback(null);
                        }}
                        className="w-full"
                        size="sm"
                      >
                        {r.stock <= 0
                          ? "Đã hết quà trong kho"
                          : userPts < r.pointsCost
                            ? `Còn thiếu ${r.pointsCost - userPts} điểm`
                            : "Đổi món quà này ngay"}
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <RedeemRewardDialog
        reward={selectedReward}
        onClose={() => setSelectedReward(null)}
        onFeedback={setFeedback}
      />

      {user && (
        <RewardHistoryPanels
          initialRedemptions={initialRedemptions}
          initialPointHistory={initialPointHistory}
        />
      )}
    </div>
  );
}
