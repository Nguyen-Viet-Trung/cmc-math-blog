"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, LogOut } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserProfile } from "@/lib/types";

type SignOutPhase = "confirm" | "loading" | "success" | "error";

interface SignOutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile | null;
  onPerformSignOut: () => Promise<void>;
  onCompleted: () => void;
}

export function SignOutDialog({
  open,
  onOpenChange,
  user,
  onPerformSignOut,
  onCompleted,
}: SignOutDialogProps) {
  const [phase, setPhase] = useState<SignOutPhase>("confirm");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{
    displayName: string;
    email: string;
    avatarUrl: string | null;
    role: "student" | "admin";
  } | null>(null);

  const latestUserRef = useRef(user);
  latestUserRef.current = user;
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Chỉ chụp thông tin tài khoản lúc dialog vừa mở để khi session bị xóa giữa lúc đăng xuất không reset phase
  useEffect(() => {
    if (!open) return;
    setPhase("confirm");
    setErrorMsg(null);
    const current = latestUserRef.current;
    if (current) {
      setSnapshot({
        displayName: current.displayName,
        email: current.email,
        avatarUrl: current.avatarUrl,
        role: current.role,
      });
    } else {
      setSnapshot(null);
    }
  }, [open]);

  const isBusy = phase === "loading" || phase === "success";

  async function handleConfirm() {
    if (isBusy) return;
    setPhase("loading");
    setErrorMsg(null);

    try {
      // Giữ nhịp chuyển tiếp tối thiểu 380ms để người dùng thấy rõ phản hồi đang đăng xuất
      await Promise.all([
        onPerformSignOut(),
        new Promise((resolve) => setTimeout(resolve, 380)),
      ]);
      if (!mountedRef.current) return;
      setPhase("success");
      await new Promise((resolve) => setTimeout(resolve, 680));
      if (!mountedRef.current) return;
      onOpenChange(false);
      onCompleted();
    } catch (err) {
      if (!mountedRef.current) return;
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Không thể đăng xuất lúc này. Vui lòng thử lại."
      );
      setPhase("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isBusy) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        hideClose={isBusy}
        className="max-w-sm overflow-hidden p-0"
        onEscapeKeyDown={(e) => {
          if (isBusy) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isBusy) e.preventDefault();
        }}
      >
        {phase === "loading" && (
          <div className="h-[2.5px] w-full overflow-hidden bg-primary/15">
            <div className="h-full w-1/2 animate-progress-indeterminate bg-primary" />
          </div>
        )}

        {phase === "success" && (
          <div className="h-[2.5px] w-full bg-success transition-all duration-300" />
        )}

        <div className="p-6">
          {(phase === "confirm" || phase === "error") && (
            <div className="space-y-4 animate-in fade-in-0 duration-150">
              <div className="flex items-start gap-3 pr-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-destructive/20 bg-destructive/10 text-destructive">
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-base">
                    Đăng xuất khỏi tài khoản?
                  </DialogTitle>
                  <DialogDescription className="text-xs leading-relaxed">
                    Phiên đăng nhập hiện tại trên trình duyệt này sẽ kết thúc.
                    Bạn có thể đăng nhập lại bất cứ lúc nào.
                  </DialogDescription>
                </div>
              </div>

              {snapshot && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage
                      src={snapshot.avatarUrl ?? undefined}
                      alt={snapshot.displayName}
                    />
                    <AvatarFallback className="text-xs">
                      {snapshot.displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-foreground">
                        {snapshot.displayName}
                      </p>
                      {snapshot.role === "admin" && (
                        <Badge
                          variant="subtle"
                          className="h-4 px-1.5 text-[10px]"
                        >
                          ADMIN
                        </Badge>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {snapshot.email}
                    </p>
                  </div>
                </div>
              )}

              {errorMsg && (
                <Alert variant="destructive" className="text-xs">
                  {errorMsg}
                </Alert>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Ở lại
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleConfirm()}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {phase === "error" ? "Thử đăng xuất lại" : "Đăng xuất"}
                </Button>
              </div>
            </div>
          )}

          {phase === "loading" && (
            <div className="flex flex-col items-center py-5 text-center animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="relative mb-3.5 flex h-12 w-12 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
              <DialogTitle className="text-base">
                Đang đăng xuất an toàn...
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed">
                Đang kết thúc phiên làm việc
                {snapshot ? ` của ${snapshot.displayName}` : ""}. Vui lòng chờ
                trong giây lát.
              </DialogDescription>
            </div>
          )}

          {phase === "success" && (
            <div className="flex flex-col items-center py-5 text-center animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full border border-success-border bg-success-surface text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <DialogTitle className="text-base text-foreground">
                Đã đăng xuất thành công
              </DialogTitle>
              <DialogDescription className="mt-1 text-xs leading-relaxed">
                Hẹn gặp lại bạn tại diễn đàn Toán học CMC!
              </DialogDescription>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
