import { NextResponse } from "next/server";
import {
  listAdminFeedbacksPaginated,
  listAdminRedemptionsPaginated,
  listAdminRewardsPaginated,
  listAdminStudentsPaginated,
  listAdminThreadsPaginated,
} from "@/lib/admin-list-service";
import {
  getCurrentUserProfile,
  listAllRepliesForAdmin,
} from "@/lib/forum-service";
import type { ThreadType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUserProfile();
  if (!user || user.role !== "admin") {
    return NextResponse.json(
      { error: "Chỉ Quản trị viên mới có quyền truy cập." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get("resource") || "";
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "10");
  const query = searchParams.get("q") || undefined;
  const status = searchParams.get("status") || undefined;
  const typeParam = searchParams.get("type");
  const threadType: ThreadType | "all" =
    typeParam === "question" ||
    typeParam === "news" ||
    typeParam === "research"
      ? typeParam
      : "all";

  const headers = { "Cache-Control": "private, no-cache" };

  switch (resource) {
    case "rewards":
      return NextResponse.json(
        await listAdminRewardsPaginated({ page, pageSize }),
        { headers }
      );
    case "redemptions":
      return NextResponse.json(
        await listAdminRedemptionsPaginated({ page, pageSize, status, query }),
        { headers }
      );
    case "students":
      return NextResponse.json(
        await listAdminStudentsPaginated({ page, pageSize, query }),
        { headers }
      );
    case "threads":
      return NextResponse.json(
        await listAdminThreadsPaginated({ page, pageSize, threadType, query }),
        { headers }
      );
    case "feedbacks":
      return NextResponse.json(
        await listAdminFeedbacksPaginated({ page, pageSize, status, query }),
        { headers }
      );
    case "replies":
      return NextResponse.json(
        { replies: await listAllRepliesForAdmin(200) },
        { headers }
      );
    default:
      return NextResponse.json(
        { error: "Tham số resource không hợp lệ." },
        { status: 400 }
      );
  }
}
