import { after } from "next/server";
import { HomeFeedFilters } from "@/app/_components/HomeFeedFilters";
import { HomeRightRail } from "@/app/_components/HomeRightRail";
import { HomeThreadList } from "@/app/_components/HomeThreadList";
import { OnboardingChecklistCard } from "@/components/OnboardingChecklistCard";
import { listActiveChallenges } from "@/lib/collection-service";
import {
  getCategories,
  getCurrentUserId,
  getLeaderboard,
  getSiteSettings,
  listActiveRewards,
  listThreadsPaginated,
} from "@/lib/forum-service";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { shouldTouchLastActiveAt } from "@/lib/onboarding";
import { normalizePagination } from "@/lib/pagination";
import { getViewerBlockedUserIds } from "@/lib/safety-service";
import {
  getUserOnboardingSnapshot,
  touchUserLastActiveAt,
} from "@/lib/social-service";
import type { HomeThreadStatusFilter, ThreadType } from "@/lib/types";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    cat?: string;
    status?: string;
    type?: string;
    q?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const settingsPromise = getSiteSettings();
  const categoriesPromise = getCategories();
  const leaderboardPromise = getLeaderboard(5);
  const rewardsPromise = listActiveRewards();
  const challengesPromise = listActiveChallenges(3);
  const viewerIdPromise = getCurrentUserId();

  const onboardingEnabled = isFeatureEnabled("onboarding");
  const safetyEnabled = isFeatureEnabled("communitySafety");

  const [params, viewerId] = await Promise.all([searchParams, viewerIdPromise]);

  const onboardingSnapshotPromise =
    viewerId && onboardingEnabled
      ? getUserOnboardingSnapshot(viewerId)
      : Promise.resolve(null);

  const activeCat = params.cat || "";
  const activeType: ThreadType | "all" =
    params.type === "question" ||
      params.type === "news" ||
      params.type === "research" ||
      params.type === "challenge"
      ? params.type
      : "all";
  const unansweredEnabled = isFeatureEnabled("unansweredFilter");
  const activeStatus: HomeThreadStatusFilter =
    params.status === "open" ||
    params.status === "solved" ||
    (unansweredEnabled && params.status === "unanswered")
      ? params.status
      : "all";
  const searchQuery = params.q?.trim() || "";
  const { page: currentPage, pageSize: currentPageSize } = normalizePagination(
    params.page,
    params.pageSize,
    20,
    50
  );
  const hasActiveFilter = Boolean(
    activeCat || activeStatus !== "all" || activeType !== "all" || searchQuery
  );

  const paginatedPromise = (
    viewerId && safetyEnabled
      ? getViewerBlockedUserIds(viewerId).then((set) => Array.from(set))
      : Promise.resolve<string[]>([])
  ).then((blockedAuthorIds) =>
    listThreadsPaginated({
      categorySlug: activeCat || undefined,
      status: activeStatus,
      threadType: activeType,
      query: searchQuery || undefined,
      page: currentPage,
      pageSize: currentPageSize,
      excludeAuthorIds: blockedAuthorIds,
    })
  );

  const [
    settings,
    categories,
    paginated,
    onboardingSnapshot,
    leaderboard,
    rewards,
    challenges,
  ] = await Promise.all([
    settingsPromise,
    categoriesPromise,
    paginatedPromise,
    onboardingSnapshotPromise,
    leaderboardPromise,
    rewardsPromise,
    challengesPromise,
  ]);

  if (
    viewerId &&
    onboardingSnapshot &&
    shouldTouchLastActiveAt(onboardingSnapshot.lastActiveAt)
  ) {
    after(async () => {
      await touchUserLastActiveAt(viewerId, onboardingSnapshot.lastActiveAt);
    });
  }

  const activeLeaders = leaderboard.filter(
    (u) => u.totalEarnedPoints > 0 || u.solvedCount > 0
  );

  return (
    <div className="space-y-5">
      {settings.announcement && (
        <div className="rounded-r-md border-l-2 border-primary bg-muted/45 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <span className="font-semibold text-foreground">Thông báo: </span>
          {settings.announcement}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0 space-y-4">
          {onboardingSnapshot?.progress.shouldShow && (
            <OnboardingChecklistCard
              initialProgress={onboardingSnapshot.progress}
              categories={categories}
            />
          )}
          <HomeFeedFilters
            activeType={activeType}
            activeCat={activeCat}
            activeStatus={activeStatus}
            searchQuery={searchQuery}
            pageSize={paginated.pageSize}
            threadCount={paginated.totalCount}
            categories={categories}
          />
          <HomeThreadList
            threads={paginated.items}
            hasActiveFilter={hasActiveFilter}
            pagination={{
              page: paginated.page,
              pageSize: paginated.pageSize,
              totalPages: paginated.totalPages,
              totalCount: paginated.totalCount,
              activeType,
              activeCat,
              activeStatus,
              searchQuery,
            }}
          />
        </section>

        <HomeRightRail
          activeLeaders={activeLeaders}
          rewards={rewards}
          challenges={challenges}
        />
      </div>
    </div>
  );
}
