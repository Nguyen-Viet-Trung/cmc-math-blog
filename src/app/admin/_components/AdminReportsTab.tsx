"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ExternalLink, Search, ShieldCheck } from "lucide-react";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateTimeVN } from "@/lib/format";
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_TARGET_TYPE_LABELS,
} from "@/lib/safety-rules";
import type { ContentReportItem, ReportStatus } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";
import { AdminReportDialog } from "./modals/AdminReportDialog";

const STATUS_BADGE_VARIANT: Record<ReportStatus, BadgeProps["variant"]> = {
  open: "destructive",
  resolved: "success",
  dismissed: "secondary",
};

export function AdminReportsTab({
  totalReportsCount,
  onNotice,
}: {
  totalReportsCount: number;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ReportStatus>("open");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [resolveTarget, setResolveTarget] = useState<ContentReportItem | null>(
    null
  );

  const debouncedSearch = useDebouncedValue(search, 250);
  const { data, isLoading, isFetching } =
    useAdminPaginatedList<ContentReportItem>({
      resource: "reports",
      page,
      pageSize,
      query: debouncedSearch,
      status: statusFilter,
      onPageClamp: setPage,
    });

  async function refreshReports() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "reports"],
    });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            aria-label="Tìm kiếm báo cáo vi phạm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo người báo cáo, nội dung hoặc ghi chú..."
            className="pl-8 text-xs sm:text-sm"
          />
        </div>

        <NativeSelect
          aria-label="Lọc trạng thái báo cáo"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "all" | ReportStatus);
            setPage(1);
          }}
          className="h-9 w-44 text-xs font-medium"
        >
          <option value="open">Chờ xử lý</option>
          <option value="all">Tất cả trạng thái</option>
          <option value="resolved">Đã xử lý</option>
          <option value="dismissed">Đã bỏ qua</option>
        </NativeSelect>
      </div>

      {isLoading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </Card>
      ) : data.items.length === 0 ? (
        <Card className="space-y-3 border-dashed p-10 text-center text-sm text-muted-foreground">
          <p>
            {totalReportsCount === 0
              ? "Chưa có báo cáo vi phạm nào từ thành viên."
              : statusFilter === "open" && !debouncedSearch.trim()
                ? "Hàng đợi sạch sẽ — không có báo cáo nào đang chờ xử lý."
                : "Không tìm thấy báo cáo nào khớp với bộ lọc hiện tại."}
          </p>
          {totalReportsCount > 0 &&
            (Boolean(debouncedSearch.trim()) || statusFilter !== "open") && (
              <div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setPage(1);
                  }}
                >
                  Đặt lại bộ lọc
                </Button>
              </div>
            )}
        </Card>
      ) : (
        <div className="space-y-3">
          {data.items.map((rep) => (
            <Card key={rep.id} className="space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="subtle" className="text-[10px]">
                      {REPORT_TARGET_TYPE_LABELS[rep.targetType]}
                    </Badge>
                    <Badge variant="bounty" className="text-[10px]">
                      {REPORT_REASON_LABELS[rep.reason]}
                    </Badge>
                    <Badge
                      variant={STATUS_BADGE_VARIANT[rep.status]}
                      className="text-[10px]"
                    >
                      {REPORT_STATUS_LABELS[rep.status]}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5">
                    <strong className="line-clamp-2 text-sm text-foreground">
                      {rep.targetLabel}
                    </strong>
                    {rep.targetHref && (
                      <Link
                        href={rep.targetHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        Mở xem
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Báo cáo bởi{" "}
                    <strong className="text-foreground">
                      {rep.reporterName}
                    </strong>{" "}
                    {rep.reporterEmail && `(${rep.reporterEmail})`}
                    {rep.targetAuthorName && (
                      <>
                        {" · "}Tác giả nội dung:{" "}
                        <strong className="text-foreground">
                          {rep.targetAuthorName}
                        </strong>
                      </>
                    )}
                    {" · "}
                    <span className="tabular-nums">
                      {formatDateTimeVN(rep.createdAt)}
                    </span>
                  </p>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={rep.status === "open" ? "default" : "outline"}
                  onClick={() => setResolveTarget(rep)}
                  className="h-7 shrink-0 px-2.5 text-xs"
                >
                  {rep.status === "open" ? (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {rep.status === "open" ? "Xử lý" : "Cập nhật"}
                </Button>
              </div>

              {rep.detail && (
                <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-xs leading-relaxed text-foreground">
                  <span className="font-semibold text-muted-foreground">
                    Mô tả người báo cáo:{" "}
                  </span>
                  {rep.detail}
                </div>
              )}

              {rep.status !== "open" && (
                <p className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                  <span className="font-semibold text-primary">
                    Kết luận ({rep.resolvedByName || "Admin"}
                    {rep.resolvedAt ? ` · ${formatDateTimeVN(rep.resolvedAt)}` : ""}
                    ):{" "}
                  </span>
                  {rep.resolutionNote || "(Không có ghi chú thêm)"}
                </p>
              )}
            </Card>
          ))}

          <PaginationBar
            page={data.page}
            totalPages={data.totalPages}
            totalCount={data.totalCount}
            itemLabel="báo cáo"
            isLoading={isFetching}
            onPageChange={setPage}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30, 50]}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </div>
      )}

      <AdminReportDialog
        report={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onSuccess={refreshReports}
        onNotice={onNotice}
      />
    </div>
  );
}
