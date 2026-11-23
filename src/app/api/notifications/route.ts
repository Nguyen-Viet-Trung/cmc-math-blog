import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/forum-service";
import {
  listUserNotifications,
  markNotificationsRead,
} from "@/lib/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json(
      { items: [], unreadCount: 0 },
      { headers: { "Cache-Control": "private, no-cache" } }
    );
  }

  const data = await listUserNotifications(userId, 20);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-cache" },
  });
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let notificationId: string | undefined;
  try {
    const body = (await request.json()) as { id?: unknown };
    if (body?.id !== undefined && body?.id !== null && body?.id !== "") {
      if (typeof body.id !== "string" || !UUID_REGEX.test(body.id.trim())) {
        return NextResponse.json(
          { error: "Mã thông báo không hợp lệ." },
          { status: 400 }
        );
      }
      notificationId = body.id.trim();
    }
  } catch {
    // Empty body means mark all as read
  }

  try {
    await markNotificationsRead(userId, notificationId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Không thể cập nhật trạng thái thông báo." },
      { status: 500 }
    );
  }
}
