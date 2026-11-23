import { NextResponse } from "next/server";
import {
  getCurrentUserProfile,
  listUserPointHistoryPaginated,
} from "@/lib/forum-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");

  const data = await listUserPointHistoryPaginated(user.id, page, pageSize);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-cache" },
  });
}
