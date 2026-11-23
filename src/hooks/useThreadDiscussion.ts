"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  acceptReplyAction,
  createReplyAction,
  toggleUpvoteReplyAction,
} from "@/app/actions/forum";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  ReplyItem,
  ThreadDiscussionSnapshot,
  UserProfile,
} from "@/lib/types";

export type RealtimeConnectionState = "connecting" | "live" | "offline";

interface BroadcastPayload {
  kind: "new_reply" | "answer_accepted" | "upvote_changed" | "moderated";
  senderId?: string;
  senderName?: string;
  at: number;
}

export function useThreadDiscussion({
  threadId,
  initialSnapshot,
  viewer,
}: {
  threadId: string;
  initialSnapshot: ThreadDiscussionSnapshot;
  viewer: UserProfile | null;
}) {
  const queryClient = useQueryClient();
  const queryKey = ["thread-discussion", threadId] as const;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const invalidateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [realtimeState, setRealtimeState] =
    useState<RealtimeConnectionState>("connecting");
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [liveToast, setLiveToast] = useState<string | null>(null);

  const scheduleInvalidate = useCallback(() => {
    if (invalidateTimerRef.current) {
      clearTimeout(invalidateTimerRef.current);
    }
    invalidateTimerRef.current = setTimeout(() => {
      void queryClient.invalidateQueries({
        queryKey: ["thread-discussion", threadId],
      });
    }, 220);
  }, [queryClient, threadId]);

  const discussionQuery = useQuery<ThreadDiscussionSnapshot>({
    queryKey,
    initialData: initialSnapshot,
    queryFn: async () => {
      const res = await fetch(`/api/threads/${threadId}/replies`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Không thể đồng bộ danh sách thảo luận.");
      }
      return (await res.json()) as ThreadDiscussionSnapshot;
    },
    refetchOnWindowFocus: realtimeState !== "live",
    refetchOnReconnect: true,
    // Chỉ bật polling dự phòng 30s khi WebSocket chưa ở trạng thái live (VD mạng trường học chặn WS)
    refetchInterval: realtimeState === "live" ? false : 30_000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    const hasSupabaseEnv = Boolean(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
        (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    );

    if (!hasSupabaseEnv || threadId.startsWith("demo-")) {
      setRealtimeState("offline");
      return;
    }

    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch {
      setRealtimeState("offline");
      return;
    }

    const presenceKey =
      viewer?.id ?? `guest-${Math.random().toString(36).slice(2, 9)}`;

    const channel = supabase.channel(`thread:${threadId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: presenceKey },
      },
    });

    channel
      .on("broadcast", { event: "thread_updated" }, ({ payload }) => {
        const data = payload as BroadcastPayload | undefined;
        // Bỏ qua sự kiện do chính người dùng hiện tại phát ra từ Server Action (tránh self-toast & refetch thừa)
        if (data?.senderId && viewer?.id && data.senderId === viewer.id) {
          return;
        }
        if (data?.kind === "new_reply") {
          setLiveToast(
            data.senderName
              ? `${data.senderName} vừa gửi một lời giải mới!`
              : "Có lời giải mới vừa được đăng!"
          );
        } else if (data?.kind === "answer_accepted") {
          setLiveToast("Chủ bài đăng vừa chọn lời giải đúng và trao điểm thưởng!");
        }
        scheduleInvalidate();
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const total = Object.keys(state).length;
        setOnlineCount(Math.max(1, total));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeState("live");
          await channel
            .track({
              name: viewer?.displayName ?? "Khách",
              joinedAt: Date.now(),
            })
            .catch(() => {});
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setRealtimeState("offline");
        }
      });

    channelRef.current = channel;

    return () => {
      if (invalidateTimerRef.current) {
        clearTimeout(invalidateTimerRef.current);
      }
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [threadId, viewer?.id, viewer?.displayName, scheduleInvalidate]);

  // Tự ẩn thông báo nổi sau 4.5 giây
  useEffect(() => {
    if (!liveToast) return;
    const timer = setTimeout(() => setLiveToast(null), 4500);
    return () => clearTimeout(timer);
  }, [liveToast]);

  const broadcastUpdate = useCallback(
    async (kind: BroadcastPayload["kind"]) => {
      const ch = channelRef.current;
      if (!ch) return;
      try {
        await ch.send({
          type: "broadcast",
          event: "thread_updated",
          payload: {
            kind,
            senderId: viewer?.id,
            senderName: viewer?.displayName,
            at: Date.now(),
          } satisfies BroadcastPayload,
        });
      } catch {
        // Bỏ qua nếu WebSocket tạm gián đoạn; TanStack Query vẫn đồng bộ bình thường
      }
    },
    [viewer?.id, viewer?.displayName]
  );

  // 1. Mutation gửi lời giải mới (kèm Optimistic UI 0ms!)
  const postReplyMutation = useMutation({
    mutationFn: async (input: { content: string; imageUrls: string[] }) => {
      const res = await createReplyAction({
        threadId,
        content: input.content,
        imageUrls: input.imageUrls,
      });
      if (!res.ok) {
        throw new Error(res.error || "Không thể gửi lời giải.");
      }
      return res;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ThreadDiscussionSnapshot>(queryKey);

      if (previous && viewer) {
        const optimisticReply: ReplyItem = {
          id: `optimistic-${Date.now()}`,
          threadId,
          content:
            input.content.trim() ||
            "(Xem lời giải chi tiết trong hình ảnh đính kèm)",
          imageUrls: input.imageUrls,
          isAccepted: false,
          upvotesCount: 0,
          viewerHasUpvoted: false,
          createdAt: new Date().toISOString(),
          author: {
            id: viewer.id,
            displayName: viewer.displayName,
            avatarUrl: viewer.avatarUrl,
            gradeLevel: viewer.gradeLevel,
            role: viewer.role,
            solvedCount: viewer.solvedCount,
          },
        };

        queryClient.setQueryData<ThreadDiscussionSnapshot>(queryKey, {
          ...previous,
          replyCount: previous.replyCount + 1,
          replies: [...previous.replies, optimisticReply],
        });
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },
    // Server Action (createReplyAction) đã phát broadcast tới các client khác — không gửi trùng phía client
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // 2. Mutation bấm "Lời giải hay / Cảm ơn" (Optimistic UI 0ms!)
  const toggleUpvoteMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const res = await toggleUpvoteReplyAction(threadId, replyId);
      if (!res.ok) {
        throw new Error(res.error || "Không thể cập nhật lượt cảm ơn.");
      }
      return res;
    },
    onMutate: async (replyId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ThreadDiscussionSnapshot>(queryKey);

      if (previous) {
        queryClient.setQueryData<ThreadDiscussionSnapshot>(queryKey, {
          ...previous,
          replies: previous.replies.map((r) => {
            if (r.id !== replyId) return r;
            const nextUpvoted = !r.viewerHasUpvoted;
            return {
              ...r,
              viewerHasUpvoted: nextUpvoted,
              upvotesCount: Math.max(
                0,
                r.upvotesCount + (nextUpvoted ? 1 : -1)
              ),
            };
          }),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },
    onSuccess: async () => {
      await broadcastUpdate("upvote_changed");
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  // 3. Mutation chọn "Lời giải đúng" & cộng điểm tự động (Optimistic UI 0ms!)
  const acceptReplyMutation = useMutation({
    mutationFn: async (replyId: string) => {
      const res = await acceptReplyAction(threadId, replyId);
      if (!res.ok) {
        throw new Error(res.error || "Không thể xác nhận lời giải đúng.");
      }
      return res;
    },
    onMutate: async (replyId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ThreadDiscussionSnapshot>(queryKey);

      if (previous) {
        const updatedReplies = previous.replies
          .map((r) => (r.id === replyId ? { ...r, isAccepted: true } : r))
          .sort((a, b) => Number(b.isAccepted) - Number(a.isAccepted));

        queryClient.setQueryData<ThreadDiscussionSnapshot>(queryKey, {
          ...previous,
          status: "solved",
          acceptedReplyId: replyId,
          replies: updatedReplies,
        });
      }

      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(queryKey, ctx.previous);
      }
    },
    // Server Action (acceptReplyAction) đã phát broadcast tới các client khác — không gửi trùng phía client
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    discussion: discussionQuery.data,
    isFetching: discussionQuery.isFetching,
    realtimeState,
    onlineCount,
    liveToast,
    broadcastUpdate,
    invalidateDiscussion: () =>
      queryClient.invalidateQueries({ queryKey }),
    postReplyMutation,
    toggleUpvoteMutation,
    acceptReplyMutation,
  };
}
