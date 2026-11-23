import { NextResponse } from "next/server";
import { listPublicFeedbacksPaginatedCached } from "@/lib/feedback-service";
import type { FeedbackCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "8");
  const catParam = searchParams.get("category");
  const category: FeedbackCategory | "all" =
    catParam === "bug" ||
    catParam === "feature" ||
    catParam === "ui_ux" ||
    catParam === "other"
      ? catParam
      : "all";

  const data = await listPublicFeedbacksPaginatedCached({
    page,
    pageSize,
    category,
  });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, max-age=15" },
  });
}
