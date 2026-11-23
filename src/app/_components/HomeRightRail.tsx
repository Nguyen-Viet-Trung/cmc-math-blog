import Link from "next/link";
import type { RewardItem, UserProfile } from "@/lib/types";

interface HomeRightRailProps {
  activeLeaders: UserProfile[];
  rewards: RewardItem[];
}

export function HomeRightRail({ activeLeaders, rewards }: HomeRightRailProps) {
  return (
    <aside className="space-y-7 lg:border-l lg:border-border lg:pl-6">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="section-label">Bảng vàng</h2>
          <Link
            href="/leaderboard"
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
