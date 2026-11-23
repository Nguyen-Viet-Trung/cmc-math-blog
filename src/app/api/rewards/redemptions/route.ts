import { NextResponse } from "next/server";
import {
  getCurrentUserProfile,
  listUserRedemptionsPaginated,
} from "@/lib/forum-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUserProfile();
  if (!user) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "8");

  const data = await listUserRedemptionsPaginated(user.id, page, pageSize);
  return NextResponse.json(data, {
    headers: { "Cache-Control": "private, no-cache" },
  });
}
