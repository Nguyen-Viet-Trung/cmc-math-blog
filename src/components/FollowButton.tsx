"use client";

import { useState } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { toggleFollowAction } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { FEATURE_FLAGS } from "@/lib/feature-flags";
import { cn } from "@/lib/utils";

export function FollowButton({
  targetUserId,
  targetDisplayName,
  initialFollowing,
  disabled = false,
  size = "sm",
  onChange,
  onError,
}: {
  targetUserId: string;
  targetDisplayName: string;
  initialFollowing: boolean;
  disabled?: boolean;
  size?: "sm" | "default";
  onChange?: (next: { following: boolean; followersCount?: number }) => void;
  onError?: (message: string) => void;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (!FEATURE_FLAGS.followSystem) {
    return null;
  }

  async function handleToggle() {
    if (busy || disabled) return;
    const prev = following;
    setFollowing(!prev);
    setBusy(true);
    try {
      const res = await toggleFollowAction(targetUserId);
      if (!res.ok) {
        setFollowing(prev);
        onError?.(res.error || "Không thể cập nhật trạng thái theo dõi.");
        return;
      }
      const nextFollowing = Boolean(res.following);
      setFollowing(nextFollowing);
      onChange?.({
        following: nextFollowing,
        followersCount: res.followersCount,
      });
    } catch {
      setFollowing(prev);
      onError?.("Lỗi kết nối máy chủ khi cập nhật theo dõi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size={size}
      variant={following ? "outline" : "default"}
      disabled={busy || disabled}
      aria-pressed={following}
      aria-label={
        following
          ? `Hủy theo dõi ${targetDisplayName}`
          : `Theo dõi ${targetDisplayName}`
      }
      onClick={() => void handleToggle()}
      className={cn(
        "h-8 gap-1.5 text-xs",
        following && "border-border text-foreground hover:bg-muted"
      )}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : following ? (
        <UserCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {following ? "Đang theo dõi" : "Theo dõi"}
    </Button>
  );
}
