import { NextResponse } from "next/server";
import {
  isActivityFeedTab,
  listActivityFeed,
  parseActivityLimitParam,
} from "@/lib/activity-service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCurrentUserId } from "@/lib/forum-service";
import { getViewerBlockedUserIds } from "@/lib/safety-service";

export const dynamic = "force-dynamic";

const PRIVATE_NO_CACHE_HEADERS = {
  "Cache-Control": "private, no-cache",
} as const;

export async function GET(request: Request) {
  if (!isFeatureEnabled("activityFeed")) {
    return NextResponse.json(
      { error: "Tính năng dòng hoạt động hiện đang tạm tắt." },
      { status: 404, headers: PRIVATE_NO_CACHE_HEADERS }
    );
  }

  const url = new URL(request.url);
  const rawTab = url.searchParams.get("tab") ?? "discover";
  const tab = isActivityFeedTab(rawTab) ? rawTab : "discover";
  const cursor = url.searchParams.get("cursor");
  const limit = parseActivityLimitParam(url.searchParams.get("limit"));

  const viewerId = await getCurrentUserId();

  if (tab === "following" && !viewerId) {
    return NextResponse.json(
      { error: "Bạn cần đăng nhập để xem dòng hoạt động Đang theo dõi." },
      { status: 401, headers: PRIVATE_NO_CACHE_HEADERS }
    );
  }

  try {
    const excludeActorIds =
      tab === "discover" && viewerId && isFeatureEnabled("communitySafety")
        ? Array.from(await getViewerBlockedUserIds(viewerId))
        : [];

    const page = await listActivityFeed({
      tab,
      viewerId,
      cursor,
      limit,
      excludeActorIds,
    });

    return NextResponse.json(
      {
        tab,
        items: page.items,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      {
        headers: PRIVATE_NO_CACHE_HEADERS,
      }
    );
  } catch (err) {
    console.error("[api/activity] Lỗi tải dòng hoạt động:", err);
    return NextResponse.json(
      {
        error: "Không thể tải dòng hoạt động lúc này.",
      },
      { status: 500, headers: PRIVATE_NO_CACHE_HEADERS }
    );
  }
}
