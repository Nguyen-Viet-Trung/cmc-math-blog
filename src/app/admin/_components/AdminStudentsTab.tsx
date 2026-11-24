"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Calendar,
  Coins,
  KeyRound,
  Lock,
  MessageSquare,
  Search,
  Unlock,
} from "lucide-react";
import { toggleStudentBanAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaginationBar } from "@/components/PaginationBar";
import { ActionMenu, type ActionMenuItem } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateVN } from "@/lib/format";
import type { UserProfile } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";
import {
  AdminStudentModals,
  type StudentModalState,
} from "./modals/AdminStudentModals";

export function AdminStudentsTab({
  totalStudentsCount,
  onNotice,
  onInspectStudentReplies,
}: {
  totalStudentsCount: number;
  onNotice: (n: AdminNotice) => void;
  onInspectStudentReplies: (email: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [activeModal, setActiveModal] = useState<StudentModalState>(null);
  const [banTarget, setBanTarget] = useState<UserProfile | null>(null);
  const [banBusy, setBanBusy] = useState(false);

  const debouncedSearch = useDebouncedValue(studentSearch, 250);
  const { data, isLoading, isFetching } = useAdminPaginatedList<UserProfile>({
    resource: "students",
    page,
    pageSize,
    query: debouncedSearch,
    onPageClamp: setPage,
  });

  async function refreshStudents() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "students"],
    });
    router.refresh();
  }

  async function handleConfirmToggleBan() {
    if (!banTarget || banBusy) return;
    setBanBusy(true);
    try {
      const res = await toggleStudentBanAction({
        studentId: banTarget.id,
        isBanned: !banTarget.isBanned,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Lỗi cập nhật." });
        return;
      }
      onNotice({
        type: "success",
        text: banTarget.isBanned
          ? `Đã mở khóa tài khoản ${banTarget.displayName}.`
          : `Đã khóa tài khoản ${banTarget.displayName}.`,
      });
      setBanTarget(null);
      await refreshStudents();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi cập nhật trạng thái tài khoản.",
      });
    } finally {
      setBanBusy(false);
    }
  }

  function buildStudentMenu(s: UserProfile): ActionMenuItem[] {
    const items: ActionMenuItem[] = [
      {
        id: "replies",
        label: "Xem bình luận",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        onSelect: () => onInspectStudentReplies(s.email),
      },
      {
        id: "joined",
        label: "Đổi ngày gia nhập",
        icon: <Calendar className="h-3.5 w-3.5" />,
        onSelect: () => setActiveModal({ kind: "joinedDate", student: s }),
      },
    ];

    if (s.role !== "admin") {
      items.push(
        {
          id: "reset-pwd",
          label: "Đặt lại mật khẩu",
          icon: <KeyRound className="h-3.5 w-3.5" />,
          onSelect: () => setActiveModal({ kind: "resetPassword", student: s }),
        },
        {
          id: "toggle-ban",
          label: s.isBanned ? "Mở khóa tài khoản" : "Khóa tài khoản",
          icon: s.isBanned ? (
            <Unlock className="h-3.5 w-3.5" />
          ) : (
            <Lock className="h-3.5 w-3.5" />
          ),
          variant: s.isBanned ? "default" : "destructive",
          separatorBefore: true,
          disabled: banBusy,
          onSelect: () => setBanTarget(s),
        }
      );
    }

    return items;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={studentSearch}
            onChange={(e) => {
              setStudentSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên, biệt danh hoặc email..."
            className="pl-8 text-xs sm:text-sm"
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          {data.totalCount} tài khoản
        </span>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Học sinh</th>
                <th className="whitespace-nowrap px-4 py-3">Khối lớp</th>
                <th className="whitespace-nowrap px-4 py-3">Gia nhập</th>
                <th className="whitespace-nowrap px-3 py-3 text-center">
                  Đã giải
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right">
                  Khả dụng / Tổng đạt
                </th>
                <th className="w-[128px] whitespace-nowrap px-4 py-3 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="space-y-2 px-4 py-6">
                    <Skeleton className="h-9 w-full" />
                    <Skeleton className="h-9 w-full" />
                  </td>
                </tr>
              ) : data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-muted-foreground"
                  >
                    {totalStudentsCount === 0
                      ? "Chưa có học sinh nào đăng ký tài khoản."
                      : "Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm."}
                  </td>
                </tr>
              ) : (
                data.items.map((s) => (
                  <tr
                    key={s.id}
                    className="transition-colors hover:bg-muted/30"
                  >
                    <td className="max-w-[260px] px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                        <span className="truncate">{s.displayName}</span>
                        {s.nickname && (
                          <span className="truncate text-xs font-normal text-muted-foreground">
                            ({s.nickname})
                          </span>
                        )}
                        {s.role === "admin" && (
                          <Badge variant="subtle" className="text-[10px]">
                            ADMIN
                          </Badge>
                        )}
                        {s.isBanned && (
                          <Badge variant="destructive" className="text-[10px]">
                            ĐÃ KHÓA
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.email}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {s.gradeLevel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">
                      {formatDateVN(s.joinedAt)}
                    </td>
                    <td className="px-3 py-3 text-center font-medium tabular-nums">
                      {s.solvedCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                      <p className="font-semibold text-bounty">
                        {s.pointsBalance}đ
                      </p>
                      <p
                        className="text-[11px] text-muted-foreground"
                        title="Tổng điểm tích lũy xếp hạng Bảng vàng"
                      >
                        Tổng: {s.totalEarnedPoints}đ
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setActiveModal({ kind: "points", student: s })
                          }
                          className="h-7 px-2.5 text-xs"
                        >
                          <Coins className="h-3 w-3 text-bounty" />
                          ± Điểm
                        </Button>
                        <ActionMenu
                          items={buildStudentMenu(s)}
                          triggerLabel={`Thao tác cho ${s.displayName}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <PaginationBar
        page={data.page}
        totalPages={data.totalPages}
        totalCount={data.totalCount}
        itemLabel="học sinh"
        isLoading={isFetching}
        onPageChange={setPage}
        pageSize={pageSize}
        pageSizeOptions={[10, 15, 30, 50]}
        onPageSizeChange={(next) => {
          setPageSize(next);
          setPage(1);
        }}
      />

      <AdminStudentModals
        modal={activeModal}
        onClose={() => setActiveModal(null)}
        onSuccess={refreshStudents}
        onNotice={onNotice}
      />

      <ConfirmDialog
        open={Boolean(banTarget)}
        onOpenChange={(open) => {
          if (!open) setBanTarget(null);
        }}
        title={
          banTarget?.isBanned
            ? `Mở khóa tài khoản ${banTarget.displayName}?`
            : `Khóa tài khoản ${banTarget?.displayName ?? ""}?`
        }
        description={
          banTarget?.isBanned
            ? "Học sinh này sẽ được khôi phục quyền đăng bài, gửi lời giải và đổi quà trên diễn đàn."
            : "Tài khoản bị khóa sẽ không thể đăng bài, bình luận, bấm cảm ơn hay đổi quà cho tới khi Admin mở lại."
        }
        confirmLabel={banTarget?.isBanned ? "Mở khóa" : "Khóa tài khoản"}
        confirmVariant={banTarget?.isBanned ? "success" : "destructive"}
        isLoading={banBusy}
        onConfirm={handleConfirmToggleBan}
      />
    </div>
  );
}
