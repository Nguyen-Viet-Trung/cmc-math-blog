import { HomeFeedFilters } from "@/app/_components/HomeFeedFilters";
import { HomeRightRail } from "@/app/_components/HomeRightRail";
import { HomeThreadList } from "@/app/_components/HomeThreadList";
import { listActiveChallenges } from "@/lib/collection-service";
import {
  getCategories,
  getLeaderboard,
  getSiteSettings,
  listActiveRewards,
  listThreadsPaginated,
} from "@/lib/forum-service";
import { normalizePagination } from "@/lib/pagination";
import type { ThreadType } from "@/lib/types";

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
  const params = await searchParams;
  const activeCat = params.cat || "";
  const activeType: ThreadType | "all" =
    params.type === "question" ||
      params.type === "news" ||
      params.type === "research" ||
      params.type === "challenge"
      ? params.type
      : "all";
  const activeStatus =
    params.status === "open" || params.status === "solved"
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

  const [settings, categories, paginated, leaderboard, rewards, challenges] =
    await Promise.all([
      getSiteSettings(),
      getCategories(),
      listThreadsPaginated({
        categorySlug: activeCat || undefined,
        status: activeStatus,
        threadType: activeType,
        query: searchQuery || undefined,
        page: currentPage,
        pageSize: currentPageSize,
      }),
      getLeaderboard(5),
      listActiveRewards(),
      listActiveChallenges(3),
    ]);

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
