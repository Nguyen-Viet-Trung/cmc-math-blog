import Link from "next/link";
import { Clock, Flame } from "lucide-react";
import { formatRemainingTime } from "@/lib/format";
import { isChallengeBlindActive } from "@/lib/rules";
import type {
  PublicLeaderboardEntry,
  RewardItem,
  ThreadSummary,
} from "@/lib/types";

interface HomeRightRailProps {
  activeLeaders: PublicLeaderboardEntry[];
  rewards: RewardItem[];
  challenges?: ThreadSummary[];
}

export function HomeRightRail({
  activeLeaders,
  rewards,
  challenges = [],
}: HomeRightRailProps) {
  return (
    <aside className="space-y-7 lg:border-l lg:border-border lg:pl-6">
      {challenges.length > 0 && (
        <div className="border-b border-border pb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="section-label inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-bounty" />
              Thử thách Tuần
            </h2>
            <Link
              href="/?type=challenge"
              prefetch={false}
              className="text-xs font-medium text-primary hover:underline"
            >
              Tất cả
            </Link>
          </div>
          <ul className="divide-y divide-border/70">
            {challenges.map((ch) => {
              const blind = isChallengeBlindActive(
                ch.threadType,
                ch.status,
                ch.challengeEndsAt
              );
              return (
                <li key={ch.id}>
                  <Link
                    href={`/threads/${ch.id}`}
                    prefetch={false}
                    className="group block py-2.5 text-xs transition-colors"
                  >
                    <p className="line-clamp-2 font-medium leading-snug text-foreground group-hover:text-primary">
                      {ch.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] tabular-nums">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {ch.challengeEndsAt
                          ? blind
                            ? formatRemainingTime(ch.challengeEndsAt)
                            : "Đã công bố"
                          : "Đang mở"}
                      </span>
                      <span className="font-semibold text-bounty">
                        +{ch.bountyPoints}đ
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-label">Bảng vàng</h2>
          <Link
            href="/leaderboard"
            prefetch={false}
            className="text-xs font-medium text-primary hover:underline"
          >
            Xem tất cả
          </Link>
        </div>

        {activeLeaders.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Chưa có học sinh nào ghi điểm. Giải bài hoặc đóng góp bài News /
            Research để xuất hiện tại đây.
          </p>
        ) : (
          <ol className="divide-y divide-border/70">
            {activeLeaders.map((u, i) => (
              <li
                key={u.id}
                className="flex items-baseline justify-between gap-3 py-2 text-xs"
              >
                <div className="flex min-w-0 items-baseline gap-2.5">
                  <span className="w-4 shrink-0 font-mono text-[11px] font-semibold tabular-nums text-muted-foreground">
                    {i + 1}.
                  </span>
                  <div className="min-w-0">
                    <Link
                      href={`/members/${u.id}`}
                      prefetch={false}
                      className="block truncate font-medium text-foreground hover:text-primary"
                    >
                      {u.displayName}
                    </Link>
                    <p className="text-[11px] text-muted-foreground">
                      {u.solvedCount} bài giải đúng
                    </p>
                  </div>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-foreground">
                  {u.totalEarnedPoints}đ
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="border-t border-border pt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-label">Đổi quà</h2>
          <Link
            href="/rewards"
            prefetch={false}
            className="text-xs font-medium text-primary hover:underline"
          >
            Cửa hàng
          </Link>
        </div>

        {rewards.length === 0 ? (
          <p className="text-xs leading-relaxed text-muted-foreground">
            Hiện chưa có phần quà nào được mở đổi.
          </p>
        ) : (
          <ul className="divide-y divide-border/70">
            {rewards.slice(0, 4).map((r) => (
              <li key={r.id}>
                <Link
                  href="/rewards"
                  prefetch={false}
                  className="group flex items-start justify-between gap-3 py-2.5 text-xs transition-colors"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 font-medium leading-snug text-foreground group-hover:text-primary">
                      {r.name}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Còn {r.stock} suất
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-bounty">
                    {r.pointsCost}đ
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
