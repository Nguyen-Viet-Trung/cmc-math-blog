"use client";

import { useState } from "react";
import { Award, CheckCircle2, Gift, Loader2, RotateCcw } from "lucide-react";
import {
  grantCampaignAwardManuallyAction,
  updateCampaignGrantRewardStatusAction,
} from "@/app/actions/campaigns";
import { CampaignBadgePill } from "@/components/CampaignBadgePill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { NativeSelect } from "@/components/ui/native-select";
import type { AdminCampaignItem } from "@/lib/campaign-service";
import { formatDateVNLocal } from "@/lib/format";
import type { AdminNotice } from "../AdminRewardsTab";

export function CampaignGrantsDialog({
  campaign,
  selectableStudents,
  onClose,
  onSaved,
  onNotice,
}: {
  campaign: AdminCampaignItem;
  selectableStudents: {
    id: string;
    displayName: string;
    email: string;
    gradeLevel: string;
  }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: AdminNotice) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [awardId, setAwardId] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleManualGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !awardId || busyId) return;
    setBusyId("manual");
    try {
      const res = await grantCampaignAwardManuallyAction({
        campaignId: campaign.id,
        awardId,
        userId: studentId,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể trao Award.",
        });
        return;
      }
      setStudentId("");
      onNotice({
        type: "success",
        text: res.message || "Đã trao Award & Huy hiệu thành công!",
      });
      await onSaved();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi trao Award.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleRewardFulfilled(
    grantId: string,
    nextStatus: "pending" | "fulfilled"
  ) {
    if (busyId) return;
    setBusyId(grantId);
    try {
      const res = await updateCampaignGrantRewardStatusAction({
        grantId,
        status: nextStatus,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể cập nhật trạng thái trao quà.",
        });
        return;
      }
      onNotice({
        type: "success",
        text:
          nextStatus === "fulfilled"
            ? "Đã đánh dấu trao quà tặng giải đấu!"
            : "Đã chuyển lại trạng thái chờ trao quà.",
      });
      await onSaved();
    } catch {
      onNotice({
        type: "error",
        text: "Lỗi mạng khi cập nhật trạng thái trao quà.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <div className="space-y-1 pr-6">
          <DialogTitle>Học sinh Đạt giải &amp; Trao quà</DialogTitle>
          <DialogDescription>
            Giải đấu: {campaign.title} ({campaign.totalGrantsCount} lượt trao
            Award)
          </DialogDescription>
        </div>

        <div className="space-y-5">
          {campaign.awards.length > 0 && (
            <form
              onSubmit={handleManualGrant}
              className="space-y-3 rounded-lg border border-border bg-muted/35 p-3.5"
            >
              <p className="text-xs font-semibold text-foreground">
                Trao Award &amp; Huy hiệu thủ công (tùy chọn)
              </p>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <NativeSelect
                  aria-label="Chọn học sinh"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="h-8 text-xs"
                >
                  <option value="">-- Chọn học sinh --</option>
                  {selectableStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.displayName} ({s.gradeLevel})
                    </option>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Chọn mốc Award"
                  value={awardId}
                  onChange={(e) => setAwardId(e.target.value)}
                  className="h-8 text-xs"
                >
                  <option value="">-- Chọn mốc Award --</option>
                  {campaign.awards.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} — [{a.badgeName}] (+{a.bonusPoints}đ)
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!studentId || !awardId || busyId !== null}
                >
                  {busyId === "manual" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Award className="h-3.5 w-3.5" />
                  )}
                  Trao Award &amp; Huy hiệu
                </Button>
              </div>
            </form>
          )}

          {campaign.grants.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              Chưa có học sinh nào đạt Award trong giải đấu này.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {campaign.grants.map((g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-foreground">
                        {g.userDisplayName}
                      </strong>
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
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {g.awardTitle} · Đạt ngày {formatDateVNLocal(g.awardedAt)}
                    </p>
                    {g.rewardName && (
                      <p className="inline-flex items-center gap-1 text-[11px] font-medium text-foreground">
                        <Gift className="h-3 w-3 text-bounty" />
                        Quà Shop: {g.rewardName}
                      </p>
                    )}
                  </div>

                  {g.rewardId && (
                    <div className="flex items-center gap-1.5">
                      {g.rewardStatus === "fulfilled" ? (
                        <>
                          <Badge variant="success">
                            <CheckCircle2 className="h-3 w-3" />
                            Đã trao quà
                          </Badge>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            disabled={busyId !== null}
                            onClick={() =>
                              void handleToggleRewardFulfilled(g.id, "pending")
                            }
                            aria-label="Hoàn tác trạng thái đã trao quà"
                            title="Đánh dấu lại là Chờ trao quà"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busyId !== null}
                          onClick={() =>
                            void handleToggleRewardFulfilled(g.id, "fulfilled")
                          }
                        >
                          {busyId === g.id && (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          )}
                          Xác nhận đã trao quà
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
