"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, EyeOff, Loader2, ShieldOff } from "lucide-react";
import { toggleUserBlockAction } from "@/app/actions/safety";
import { FollowButton } from "@/components/FollowButton";
import { ReportContentDialog } from "@/components/ReportContentDialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import type { UserBlockMode } from "@/lib/types";

export function MemberSafetyControls({
  memberId,
  memberDisplayName,
  initialFollowing,
  initialFollowersCount,
  initialFollowingCount,
  initialBlockMode,
  canInteract,
}: {
  memberId: string;
  memberDisplayName: string;
  initialFollowing: boolean;
  initialFollowersCount: number;
  initialFollowingCount: number;
  initialBlockMode: UserBlockMode | null;
  canInteract: boolean;
}) {
  const router = useRouter();
  const [followersCount, setFollowersCount] = useState(initialFollowersCount);
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [blockMode, setBlockMode] = useState<UserBlockMode | null>(
    initialBlockMode
  );
  const [blockBusy, setBlockBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const showFollow = FEATURE_FLAGS.followSystem;
  const showSafety = FEATURE_FLAGS.communitySafety;

  if (!showFollow && !showSafety) {
    return null;
  }

  async function handleToggleBlock(mode: UserBlockMode | null) {
    if (blockBusy) return;
    setBlockBusy(true);
    setNotice(null);
    try {
      const res = await toggleUserBlockAction({
        targetUserId: memberId,
        mode,
      });
      if (!res.ok) {
        setNotice({
          type: "error",
          text: res.error || "Không thể cập nhật thiết lập ẩn/chặn.",
        });
        return;
      }
      const nextMode = res.mode ?? null;
      setBlockMode(nextMode);
      if (nextMode === "block" && isFollowing) {
        setIsFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      }
      setNotice({
        type: "success",
        text:
          nextMode === "block"
            ? `Đã chặn ${memberDisplayName}. Bài viết và bình luận của người này sẽ được ẩn khỏi bảng tin của bạn.`
            : nextMode === "mute"
              ? `Đã ẩn nội dung từ ${memberDisplayName} khỏi bảng tin của bạn.`
              : `Đã gỡ trạng thái ẩn/chặn với ${memberDisplayName}.`,
      });
      router.refresh();
    } catch {
      setNotice({
        type: "error",
        text: "Lỗi kết nối máy chủ khi cập nhật ẩn/chặn.",
      });
    } finally {
      setBlockBusy(false);
    }
  }

  return (
    <div className="space-y-2.5 pt-1">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {showFollow ? (
          <p className="text-xs tabular-nums text-muted-foreground">
            <strong className="font-semibold text-foreground">
              {followersCount}
            </strong>{" "}
            người theo dõi
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            Đang theo dõi{" "}
            <strong className="font-semibold text-foreground">
              {initialFollowingCount}
            </strong>
          </p>
        ) : (
          <span />
        )}

        {canInteract && (
          <div className="flex flex-wrap items-center gap-1.5">
            {showFollow && (
              <FollowButton
                key={`follow-${isFollowing}-${blockMode ?? "none"}`}
                targetUserId={memberId}
                targetDisplayName={memberDisplayName}
                initialFollowing={isFollowing}
                disabled={blockMode !== null && !isFollowing}
                onChange={(next) => {
                  setIsFollowing(next.following);
                  if (typeof next.followersCount === "number") {
                    setFollowersCount(next.followersCount);
                  }
                  setNotice(null);
                }}
                onError={(msg) => setNotice({ type: "error", text: msg })}
              />
            )}

            {showSafety && (
              <>
                {blockMode ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={blockBusy}
                    aria-label={
                      blockMode === "block"
                        ? `Bỏ chặn ${memberDisplayName}`
                        : `Bỏ ẩn ${memberDisplayName}`
                    }
                    onClick={() => void handleToggleBlock(null)}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {blockBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ShieldOff className="h-3.5 w-3.5" />
                    )}
                    {blockMode === "block" ? "Bỏ chặn" : "Bỏ ẩn"}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={blockBusy}
                      aria-label={`Ẩn nội dung của ${memberDisplayName}`}
                      onClick={() => void handleToggleBlock("mute")}
                      title="Ẩn bài viết và bình luận của thành viên này khỏi bảng tin của bạn"
                      className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {blockBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <EyeOff className="h-3.5 w-3.5" />
                      )}
                      Ẩn
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={blockBusy}
                      aria-label={`Chặn ${memberDisplayName}`}
                      onClick={() => void handleToggleBlock("block")}
                      title="Chặn và gỡ theo dõi với thành viên này"
                      className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Chặn
                    </Button>
                  </>
                )}

                <ReportContentDialog
                  targetType="user"
                  targetId={memberId}
                  targetTitle={memberDisplayName}
                  compact={false}
                />
              </>
            )}
          </div>
        )}
      </div>

      {notice && (
        <Alert
          variant={notice.type === "success" ? "success" : "destructive"}
          className="py-2 text-xs"
        >
          {notice.text}
        </Alert>
      )}
    </div>
  );
}
