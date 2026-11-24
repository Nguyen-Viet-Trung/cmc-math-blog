import { notFound } from "next/navigation";
import { ActivityFeedClient } from "./_components/ActivityFeedClient";
import {
  DEFAULT_ACTIVITY_PAGE_SIZE,
  isActivityFeedTab,
  listActivityFeed,
} from "@/lib/activity-service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { getCategories, getCurrentUserId } from "@/lib/forum-service";
import { getViewerBlockedUserIds } from "@/lib/safety-service";
import { getViewerFollowingCount } from "@/lib/social-service";
import type { ActivityFeedTab } from "@/lib/types";

export const metadata = {
  title: "Hoạt động cộng đồng | CMC",
  description:
    "Theo dõi các bài toán mới, lời giải được chọn đúng, huy hiệu và giải đấu nổi bật của CMA MATHS CLUB.",
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!isFeatureEnabled("activityFeed")) {
    notFound();
  }

  const categoriesPromise = getCategories();
  const [params, viewerId] = await Promise.all([
    searchParams,
    getCurrentUserId(),
  ]);

  const initialTab: ActivityFeedTab = isActivityFeedTab(params.tab)
    ? params.tab
    : "discover";

  const followingCountPromise = viewerId
    ? getViewerFollowingCount(viewerId)
    : Promise.resolve(0);

  const feedPromise =
    initialTab === "discover" && viewerId && isFeatureEnabled("communitySafety")
      ? getViewerBlockedUserIds(viewerId).then((set) =>
          listActivityFeed({
            tab: initialTab,
            viewerId,
            limit: DEFAULT_ACTIVITY_PAGE_SIZE,
            excludeActorIds: Array.from(set),
          })
        )
      : listActivityFeed({
          tab: initialTab,
          viewerId,
          limit: DEFAULT_ACTIVITY_PAGE_SIZE,
        });

  const [categories, followingCount, initialPage] = await Promise.all([
    categoriesPromise,
    followingCountPromise,
    feedPromise,
  ]);

  const categoryNameBySlug: Record<string, string> = {};
  for (const c of categories) {
    categoryNameBySlug[c.slug] = c.name;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="border-b border-border pb-4">
        <h1 className="heading-1">Hoạt động cộng đồng</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cập nhật câu hỏi mới, lời giải đúng, huy hiệu đạt được và giải đấu vừa
          mở tại CMC.
        </p>
      </header>

      <ActivityFeedClient
        initialTab={initialTab}
        initialPage={initialPage}
        isAuthenticated={Boolean(viewerId)}
        followingCount={followingCount}
        categoryNameBySlug={categoryNameBySlug}
      />
    </div>
  );
}
