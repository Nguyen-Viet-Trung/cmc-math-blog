import { NextResponse } from "next/server";
import {
  getCurrentUserId,
  listUserRedemptionsPaginated,
} from "@/lib/forum-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "8");

  const data = await listUserRedemptionsPaginated(userId, page, pageSize);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-cache" },
  });
}
