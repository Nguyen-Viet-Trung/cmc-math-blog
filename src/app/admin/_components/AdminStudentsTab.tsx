"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, KeyRound } from "lucide-react";
import {
  adjustStudentPointsAction,
  resetStudentPasswordAction,
  toggleStudentBanAction,
  updateStudentJoinedAtAction,
} from "@/app/actions/admin";
import { PaginationBar } from "@/components/PaginationBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAdminPaginatedList,
  useDebouncedValue,
} from "@/hooks/useAdminPaginatedList";
import { formatDateVN, toDateInputValue } from "@/lib/format";
import type { PaginatedResult } from "@/lib/pagination";
import type { UserProfile } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

export function AdminStudentsTab({
  initialStudents,
  onNotice,
  onInspectStudentReplies,
}: {
  initialStudents: PaginatedResult<UserProfile>;
  onNotice: (n: AdminNotice) => void;
  onInspectStudentReplies: (email: string) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [studentSearch, setStudentSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pointTargetId, setPointTargetId] = useState<string | null>(null);
  const [pointDelta, setPointDelta] = useState("10");
  const [pointReason, setPointReason] = useState("");

  const [joinDateTarget, setJoinDateTarget] = useState<UserProfile | null>(
    null
  );
  const [joinDateValue, setJoinDateValue] = useState("");
  const [savingJoinDate, setSavingJoinDate] = useState(false);

  const [resetPwdTarget, setResetPwdTarget] = useState<UserProfile | null>(
    null
  );
  const [tempPassword, setTempPassword] = useState("");
  const [resettingPwd, setResettingPwd] = useState(false);

  const debouncedSearch = useDebouncedValue(studentSearch, 250);
  const { data, isFetching } = useAdminPaginatedList({
    resource: "students",
    page,
    pageSize: initialStudents.pageSize,
    query: debouncedSearch,
    initialData: initialStudents,
  });

  function closeAllPanels() {
    setPointTargetId(null);
    setJoinDateTarget(null);
    setResetPwdTarget(null);
  }

  async function refreshStudents() {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "students"],
    });
    router.refresh();
  }

  async function handleAdjustPoints(e: React.FormEvent) {
    e.preventDefault();
    if (!pointTargetId) return;
    const res = await adjustStudentPointsAction({
      studentId: pointTargetId,
      deltaPoints: Number(pointDelta),
      reason: pointReason,
    });
    if (!res.ok) {
      onNotice({ type: "error", text: res.error || "Lỗi điều chỉnh điểm." });
      return;
    }
    setPointTargetId(null);
    setPointReason("");
    onNotice({
      type: "success",
      text: "Đã cập nhật số điểm học sinh và ghi sổ cái đối soát!",
    });
    await refreshStudents();
  }

  async function handleSaveJoinedDate(e: React.FormEvent) {
    e.preventDefault();
    if (!joinDateTarget) return;
    setSavingJoinDate(true);
    const res = await updateStudentJoinedAtAction({
      studentId: joinDateTarget.id,
      joinedDate: joinDateValue,
    });
    setSavingJoinDate(false);
    if (!res.ok) {
      onNotice({
        type: "error",
        text: res.error || "Không thể cập nhật ngày gia nhập CLB.",
      });
      return;
    }
    onNotice({
      type: "success",
      text: `Đã cập nhật ngày gia nhập CLB cho ${joinDateTarget.displayName}!`,
    });
    setJoinDateTarget(null);
    await refreshStudents();
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!resetPwdTarget) return;
    setResettingPwd(true);
    const res = await resetStudentPasswordAction({
      studentId: resetPwdTarget.id,
      newPassword: tempPassword,
    });
    setResettingPwd(false);
    if (!res.ok) {
      onNotice({
        type: "error",
        text: res.error || "Không thể đặt lại mật khẩu.",
      });
      return;
    }
    onNotice({
      type: "success",
      text: `Đã đặt lại mật khẩu mới cho ${resetPwdTarget.displayName} (${resetPwdTarget.email}). Hãy gửi mật khẩu tạm này cho học sinh và nhắc đổi lại ở trang Hồ sơ.`,
    });
    setTempPassword("");
    setResetPwdTarget(null);
  }

  async function handleToggleBan(student: UserProfile) {
    const res = await toggleStudentBanAction({
      studentId: student.id,
      isBanned: !student.isBanned,
    });
    if (!res.ok) {
      onNotice({ type: "error", text: res.error || "Lỗi cập nhật." });
      return;
    }
    await refreshStudents();
  }

  return (
    <div className="space-y-4">
      <Input
        type="text"
        value={studentSearch}
        onChange={(e) => {
          setStudentSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Tìm học sinh theo tên, biệt danh hoặc email..."
        className="max-w-md"
      />

      {pointTargetId && (
        <Card className="border-primary/40 bg-accent/50 p-4">
          <form
            onSubmit={handleAdjustPoints}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <Label htmlFor="admin-point-delta">
                Số điểm cộng (+) hoặc trừ (-)
              </Label>
              <Input
                id="admin-point-delta"
                type="number"
                required
                value={pointDelta}
                onChange={(e) => setPointDelta(e.target.value)}
                className="w-32 font-semibold tabular-nums"
              />
            </div>
            <div className="min-w-[220px] flex-1 space-y-1">
              <Label htmlFor="admin-point-reason">
                Lý do điều chỉnh (lưu vào lịch sử điểm của học sinh)
              </Label>
              <Input
                id="admin-point-reason"
                type="text"
                required
                value={pointReason}
                onChange={(e) => setPointReason(e.target.value)}
                placeholder="Ví dụ: Thưởng lời giải sáng tạo bài Hình học tuần 3"
              />
            </div>
            <Button type="submit" size="sm">
              Xác nhận cập nhật điểm
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPointTargetId(null)}
            >
              Đóng
            </Button>
          </form>
        </Card>
      )}

      {joinDateTarget && (
        <Card className="border-primary/40 bg-accent/50 p-4">
          <form
            onSubmit={handleSaveJoinedDate}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="space-y-1">
              <Label htmlFor="admin-joined-date">
                Ngày gia nhập CLB của{" "}
                <strong className="text-foreground">
                  {joinDateTarget.displayName}
                </strong>
              </Label>
              <Input
                id="admin-joined-date"
                type="date"
                required
                value={joinDateValue}
                onChange={(e) => setJoinDateValue(e.target.value)}
                className="w-48 bg-card tabular-nums"
              />
            </div>
            <Button type="submit" size="sm" disabled={savingJoinDate}>
              <Calendar className="h-3.5 w-3.5" />
              {savingJoinDate ? "Đang lưu..." : "Lưu ngày gia nhập"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setJoinDateTarget(null)}
            >
              Đóng
            </Button>
          </form>
        </Card>
      )}

      {resetPwdTarget && (
        <Card className="border-primary/40 bg-accent/50 p-4">
          <form
            onSubmit={handleResetPassword}
            className="flex flex-wrap items-end gap-3"
          >
            <div className="min-w-[240px] flex-1 space-y-1">
              <Label htmlFor="admin-reset-pwd">
                Cấp mật khẩu mới cho{" "}
                <strong className="text-foreground">
                  {resetPwdTarget.displayName}
                </strong>{" "}
                ({resetPwdTarget.email})
              </Label>
              <Input
                id="admin-reset-pwd"
                type="text"
                required
                minLength={6}
                maxLength={72}
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="Nhập mật khẩu tạm (tối thiểu 6 ký tự, ví dụ: cmc2026)"
                className="bg-card font-mono text-xs"
              />
            </div>
            <Button type="submit" size="sm" disabled={resettingPwd}>
              <KeyRound className="h-3.5 w-3.5" />
              {resettingPwd ? "Đang cấp lại..." : "Xác nhận cấp mật khẩu"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setResetPwdTarget(null);
                setTempPassword("");
              }}
            >
              Đóng
            </Button>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Học sinh</th>
                <th className="px-4 py-3">Lớp</th>
                <th className="whitespace-nowrap px-4 py-3">Gia nhập CLB</th>
                <th className="px-4 py-3 text-center">Đã giải</th>
                <th className="px-4 py-3 text-right">Điểm đổi quà</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-muted-foreground"
                  >
                    {studentSearch.trim()
                      ? "Không tìm thấy học sinh nào khớp với từ khóa tìm kiếm."
                      : "Chưa có học sinh nào đăng ký tài khoản."}
                  </td>
                </tr>
              ) : (
                data.items.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-1.5 font-semibold text-foreground">
                        <span>{s.displayName}</span>
                        {s.nickname && (
                          <span className="text-xs font-normal text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">{s.email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.gradeLevel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">
                      {formatDateVN(s.joinedAt)}
                    </td>
                    <td className="px-4 py-3 text-center font-medium tabular-nums">
                      {s.solvedCount}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-bounty">
                      {s.pointsBalance}đ
                    </td>
                    <td className="space-x-1.5 whitespace-nowrap px-4 py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          closeAllPanels();
                          setJoinDateTarget(s);
                          setJoinDateValue(toDateInputValue(s.joinedAt));
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Calendar className="h-3 w-3" />
                        Ngày gia nhập
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => onInspectStudentReplies(s.email)}
                        className="h-7 px-2 text-xs"
                      >
                        Bình luận
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          closeAllPanels();
                          setPointTargetId(s.id);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        ± Điểm
                      </Button>
                      {s.role !== "admin" && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              closeAllPanels();
                              setResetPwdTarget(s);
                              setTempPassword("");
                            }}
                            className="h-7 px-2 text-xs"
                          >
                            <KeyRound className="h-3 w-3" />
                            Đặt lại MK
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void handleToggleBan(s)}
                            className="h-7 px-2 text-xs hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                          >
                            {s.isBanned ? "Mở khóa" : "Khóa"}
                          </Button>
                        </>
                      )}
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
      />
    </div>
  );
}
