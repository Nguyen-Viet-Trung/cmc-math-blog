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

export async function PATCH(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  let notificationId: string | undefined;
  try {
    const body = (await request.json()) as { id?: string };
    if (typeof body?.id === "string" && body.id.trim()) {
      notificationId = body.id.trim();
    }
  } catch {
    // Empty body means mark all as read
  }

  await markNotificationsRead(userId, notificationId);
  return NextResponse.json({ ok: true });
}
