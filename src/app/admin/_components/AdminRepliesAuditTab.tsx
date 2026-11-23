"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Award } from "lucide-react";
import {
  deleteReplyByAdminAction,
  revokeAcceptedReplyAction,
} from "@/app/actions/admin";
import { AdminReplyAuditCard } from "@/app/admin/_components/AdminReplyAuditCard";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/useAdminPaginatedList";
import { paginateSlice } from "@/lib/pagination";
import { analyzeAdminReplyAudits } from "@/lib/rules";
import type { AdminReplyAuditItem } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

const EMPTY_REPLIES: AdminReplyAuditItem[] = [];

export function AdminRepliesAuditTab({
  search,
  onSearchChange,
  onSuspiciousCountChange,
  onNotice,
}: {
  search: string;
  onSearchChange: (next: string) => void;
  onSuspiciousCountChange?: (count: number) => void;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [replyFilter, setReplyFilter] = useState<
    "all" | "accepted" | "suspicious"
  >("all");
  const [selectedPair, setSelectedPair] = useState<{
    userAId: string;
    userBId: string;
    label: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    kind: "revoke" | "delete";
    reply: AdminReplyAuditItem;
    reason: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(search, 200);

  const repliesQuery = useQuery<{ replies: AdminReplyAuditItem[] }>({
    queryKey: ["admin-list", "replies"],
    queryFn: async () => {
      const res = await fetch("/api/admin/list?resource=replies", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Không thể tải danh sách bình luận kiểm duyệt.");
      }
      return (await res.json()) as { replies: AdminReplyAuditItem[] };
    },
    staleTime: 15_000,
  });

  const replies = repliesQuery.data?.replies ?? EMPTY_REPLIES;

  const { flagsByReplyId, suspiciousPairs } = useMemo(
    () => analyzeAdminReplyAudits(replies),
    [replies]
  );

  const suspiciousCount = Object.keys(flagsByReplyId).length;

  useEffect(() => {
    if (repliesQuery.data && onSuspiciousCountChange) {
      onSuspiciousCountChange(suspiciousCount);
    }
  }, [repliesQuery.data, suspiciousCount, onSuspiciousCountChange]);

  useEffect(() => {
    setPage(1);
  }, [replyFilter, debouncedSearch, selectedPair]);

  const acceptedCount = useMemo(
    () => replies.filter((r) => r.isAccepted).length,
    [replies]
  );

  const filteredReplies = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
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
  }, [replies, replyFilter, debouncedSearch, selectedPair, flagsByReplyId]);

  const paged = useMemo(
    () => paginateSlice(filteredReplies, page, 10),
    [filteredReplies, page]
  );

  useEffect(() => {
    if (paged.page < page) {
      setPage(paged.page);
    }
  }, [paged.page, page]);

  async function executeConfirmAction() {
    if (!confirmAction) return;
    const { kind, reply: r, reason } = confirmAction;
    setBusyId(r.id);
    try {
      if (kind === "revoke") {
        const res = await revokeAcceptedReplyAction({
          replyId: r.id,
          reason,
        });
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
      } else {
        const res = await deleteReplyByAdminAction({
          replyId: r.id,
          reason,
        });
        if (!res.ok) {
          onNotice({
            type: "error",
            text: res.error || "Không thể xóa bình luận.",
          });
          return;
        }
        onNotice({ type: "success", text: res.message || "Đã xóa bình luận." });
      }
      setConfirmAction(null);
      await queryClient.invalidateQueries({
        queryKey: ["admin-list", "replies"],
      });
      router.refresh();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi thực hiện kiểm duyệt.",
      });
    } finally {
      setBusyId(null);
    }
  }

  if (repliesQuery.isLoading) {
    return (
      <Card className="space-y-3 p-5">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </Card>
    );
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
        <div className="space-y-3">
          {paged.items.map((r) => (
            <AdminReplyAuditCard
              key={r.id}
              reply={r}
              flags={flagsByReplyId[r.id] ?? []}
              isBusy={busyId === r.id}
              onRevoke={(reason) =>
                setConfirmAction({ kind: "revoke", reply: r, reason })
              }
              onDelete={(reason) =>
                setConfirmAction({ kind: "delete", reply: r, reason })
              }
            />
          ))}
          <PaginationBar
            page={paged.page}
            totalPages={paged.totalPages}
            totalCount={paged.totalCount}
            itemLabel="bình luận"
            isLoading={repliesQuery.isFetching}
            onPageChange={setPage}
          />
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction?.kind === "revoke"
            ? "Hủy duyệt & thu hồi điểm?"
            : "Xóa bình luận vi phạm?"
        }
        description={
          confirmAction
            ? confirmAction.kind === "revoke"
              ? `Hủy trạng thái "Lời giải đúng" và thu hồi ${confirmAction.reply.awardedPoints} điểm từ ${confirmAction.reply.replyAuthorName}?`
              : confirmAction.reply.isAccepted
                ? `Bình luận này ĐÃ CỘNG +${confirmAction.reply.awardedPoints} điểm cho ${confirmAction.reply.replyAuthorName}. Xóa bình luận sẽ tự động thu hồi điểm và mở lại bài toán.`
                : `Xóa vĩnh viễn bình luận của ${confirmAction.reply.replyAuthorName} khỏi bài "${confirmAction.reply.threadTitle}"?`
            : ""
        }
        confirmLabel={
          confirmAction?.kind === "revoke"
            ? "Hủy duyệt & Thu hồi điểm"
            : "Xóa bình luận"
        }
        confirmVariant={
          confirmAction?.kind === "revoke" ? "bounty" : "destructive"
        }
        isLoading={Boolean(confirmAction && busyId === confirmAction.reply.id)}
        onConfirm={executeConfirmAction}
      />
    </div>
  );
}
