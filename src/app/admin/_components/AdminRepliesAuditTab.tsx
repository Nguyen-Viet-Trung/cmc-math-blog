"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Award } from "lucide-react";
import {
  deleteReplyByAdminAction,
  revokeAcceptedReplyAction,
} from "@/app/actions/admin";
import { AdminReplyAuditCard } from "@/app/admin/_components/AdminReplyAuditCard";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { paginateSlice } from "@/lib/pagination";
import type {
  AdminReplyAuditItem,
  BuffPairSummary,
  ReplySuspicionCode,
} from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

export function AdminRepliesAuditTab({
  replies,
  flagsByReplyId,
  suspiciousPairs,
  search,
  onSearchChange,
  onNotice,
}: {
  replies: AdminReplyAuditItem[];
  flagsByReplyId: Record<string, ReplySuspicionCode[]>;
  suspiciousPairs: BuffPairSummary[];
  search: string;
  onSearchChange: (next: string) => void;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const [replyFilter, setReplyFilter] = useState<
    "all" | "accepted" | "suspicious"
  >("all");
  const [selectedPair, setSelectedPair] = useState<{
    userAId: string;
    userBId: string;
    label: string;
  } | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [replyFilter, search, selectedPair]);

  const acceptedCount = useMemo(
    () => replies.filter((r) => r.isAccepted).length,
    [replies]
  );
  const suspiciousCount = Object.keys(flagsByReplyId).length;

  const filteredReplies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return replies.filter((r) => {
      if (replyFilter === "accepted" && !r.isAccepted) return false;
      if (replyFilter === "suspicious" && !flagsByReplyId[r.id]?.length) {
        return false;
      }
      if (selectedPair) {
        const match =
          (r.threadAuthorId === selectedPair.userAId &&
            r.replyAuthorId === selectedPair.userBId) ||
          (r.threadAuthorId === selectedPair.userBId &&
            r.replyAuthorId === selectedPair.userAId);
        if (!match) return false;
      }
      if (q) {
        const hay = [
          r.threadTitle,
          r.threadAuthorName,
          r.threadAuthorEmail,
          r.replyAuthorName,
          r.replyAuthorEmail,
          r.content,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [replies, replyFilter, search, selectedPair, flagsByReplyId]);

  async function handleRevoke(r: AdminReplyAuditItem) {
    if (
      !window.confirm(
        `Hủy trạng thái "Lời giải đúng" và thu hồi ${r.awardedPoints} điểm từ ${r.replyAuthorName}?`
      )
    ) {
      return;
    }
    setBusyId(r.id);
    const res = await revokeAcceptedReplyAction({
      replyId: r.id,
      reason: reasons[r.id],
    });
    setBusyId(null);
    if (!res.ok) {
      onNotice({
        type: "error",
        text: res.error || "Không thể thu hồi điểm lời giải này.",
      });
      return;
    }
    onNotice({
      type: "success",
      text: res.message || "Đã hủy lời giải đúng và thu hồi điểm!",
    });
    router.refresh();
  }

  async function handleDelete(r: AdminReplyAuditItem) {
    const msg = r.isAccepted
      ? `Bình luận này ĐÃ CỘNG +${r.awardedPoints} điểm cho ${r.replyAuthorName}. Xóa bình luận sẽ tự động thu hồi điểm và mở lại bài toán. Bạn chắc chắn muốn xóa?`
      : `Xóa vĩnh viễn bình luận của ${r.replyAuthorName} khỏi bài "${r.threadTitle}"?`;
    if (!window.confirm(msg)) return;

    setBusyId(r.id);
    const res = await deleteReplyByAdminAction({
      replyId: r.id,
      reason: reasons[r.id],
    });
    setBusyId(null);
    if (!res.ok) {
      onNotice({
        type: "error",
        text: res.error || "Không thể xóa bình luận.",
      });
      return;
    }
    onNotice({ type: "success", text: res.message || "Đã xóa bình luận." });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {suspiciousPairs.length > 0 && (
        <Card className="space-y-3 border-destructive/35 bg-destructive/5 p-4 sm:p-5">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Phát hiện {suspiciousPairs.length} cặp tài khoản có dấu hiệu
                trao điểm chéo / lặp cặp nhiều lần
              </h2>
              <p className="text-xs text-muted-foreground">
                Bấm &ldquo;Kiểm tra cặp này&rdquo; để lọc toàn bộ lời giải giữa
                2 học sinh và đối chiếu nội dung trước khi thu hồi điểm.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {suspiciousPairs.map((pair) => (
              <div
                key={pair.pairKey}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-card p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-foreground">
                    <span>{pair.userAName}</span>
                    <span className="text-muted-foreground">↔</span>
                    <span>{pair.userBName}</span>
                    <Badge
                      variant={pair.isMutual ? "destructive" : "bounty"}
                      className="text-[10px]"
                    >
                      {pair.isMutual ? "Buff chéo 2 chiều" : "Lặp cặp"}
                    </Badge>
                  </div>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {pair.userAName} duyệt {pair.userBName}:{" "}
                    <strong className="text-foreground">
                      {pair.aAcceptedBCount}
                    </strong>{" "}
                    · Ngược lại:{" "}
                    <strong className="text-foreground">
                      {pair.bAcceptedACount}
                    </strong>{" "}
                    · Tổng:{" "}
                    <strong className="text-bounty">
                      +{pair.totalPointsTransferred}đ
                    </strong>
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSelectedPair({
                      userAId: pair.userAId,
                      userBId: pair.userBId,
                      label: `${pair.userAName} ↔ ${pair.userBName}`,
                    });
                    setReplyFilter("accepted");
                  }}
                  className="h-7 text-xs"
                >
                  Kiểm tra cặp này
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="space-y-3 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo tên/email người trả lời, người hỏi, tiêu đề bài hoặc nội dung..."
            className="sm:max-w-md"
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={replyFilter === "all" ? "default" : "outline"}
              onClick={() => setReplyFilter("all")}
            >
              Tất cả ({replies.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={replyFilter === "accepted" ? "success" : "outline"}
              onClick={() => setReplyFilter("accepted")}
            >
              <Award className="h-3.5 w-3.5" />
              Đã cộng điểm ({acceptedCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={replyFilter === "suspicious" ? "destructive" : "outline"}
              onClick={() => setReplyFilter("suspicious")}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Nghi vấn ({suspiciousCount})
            </Button>
          </div>
        </div>

        {(selectedPair || search.trim()) && (
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2.5 text-xs">
            <span className="text-muted-foreground">Đang lọc:</span>
            {selectedPair && (
              <Badge variant="destructive">Cặp: {selectedPair.label}</Badge>
            )}
            {search.trim() && (
              <Badge variant="secondary">
                Từ khóa: &ldquo;{search.trim()}&rdquo;
              </Badge>
            )}
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => {
                setSelectedPair(null);
                onSearchChange("");
                setReplyFilter("all");
              }}
              className="h-auto p-0 text-xs"
            >
              Xóa bộ lọc
            </Button>
          </div>
        )}
      </Card>

      {filteredReplies.length === 0 ? (
        <Card className="border-dashed p-10 text-center text-sm text-muted-foreground">
          {replies.length === 0
            ? "Chưa có bình luận / lời giải nào trên diễn đàn."
            : "Không có bình luận nào khớp với bộ lọc hiện tại."}
        </Card>
      ) : (
        (() => {
          const paged = paginateSlice(filteredReplies, page, 10);
          return (
            <div className="space-y-3">
              {paged.items.map((r) => (
                <AdminReplyAuditCard
                  key={r.id}
                  reply={r}
                  flags={flagsByReplyId[r.id] ?? []}
                  reason={reasons[r.id] ?? ""}
                  isBusy={busyId === r.id}
                  onReasonChange={(val) =>
                    setReasons({ ...reasons, [r.id]: val })
                  }
                  onRevoke={() => void handleRevoke(r)}
                  onDelete={() => void handleDelete(r)}
                />
              ))}
              <PaginationBar
                page={paged.page}
                totalPages={paged.totalPages}
                totalCount={paged.totalCount}
                itemLabel="bình luận"
                onPageChange={setPage}
              />
            </div>
          );
        })()
      )}
    </div>
  );
}
