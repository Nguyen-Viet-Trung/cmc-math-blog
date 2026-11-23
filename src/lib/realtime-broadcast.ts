import { getSupabaseSecretKey, getSupabaseUrl } from "./env";

/**
 * Gửi tín hiệu Realtime Broadcast từ phía Server qua HTTP REST API của Supabase
 * (Chạy nền không chặn phản hồi — đảm bảo mọi trình duyệt đang mở bài toán đều nhận được tín hiệu cập nhật kể cả khi người gửi vừa đóng tab)
 */
export async function broadcastThreadEventFromServer(params: {
  threadId: string;
  kind: "new_reply" | "answer_accepted" | "upvote_changed" | "moderated";
  senderId?: string;
  senderName?: string;
}): Promise<void> {
  const url = getSupabaseUrl();
  const secretKey = getSupabaseSecretKey();
  if (!url || !secretKey) return;

  try {
    await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            topic: `thread:${params.threadId}`,
            event: "thread_updated",
            payload: {
              kind: params.kind,
              senderId: params.senderId,
              senderName: params.senderName,
              at: Date.now(),
            },
          },
        ],
      }),
    });
  } catch {
    // Bỏ qua lỗi mạng phụ trợ, không ảnh hưởng giao dịch chính đã lưu vào PostgreSQL
  }
}
