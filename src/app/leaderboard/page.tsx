import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLeaderboard } from "@/lib/forum-service";
import { cn } from "@/lib/utils";

export default async function LeaderboardPage() {
  const leaders = await getLeaderboard(30);
  const rankedLeaders = leaders.filter(
    (u) => u.totalEarnedPoints > 0 || u.solvedCount > 0
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="border-b border-border pb-4">
        <h1 className="heading-1">Bảng Vàng Cao Thủ Giải Toán</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Xếp hạng dựa trên tổng điểm cống hiến và số lời giải đúng (không giảm
          thứ hạng khi đổi quà).
        </p>
      </header>

      {rankedLeaders.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm font-semibold text-foreground">
            Chưa có học sinh nào ghi điểm trên Bảng Vàng
          </p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Khi lời giải của bạn được chọn làm lời giải đúng, điểm tích lũy và
            thứ hạng sẽ tự động xuất hiện tại đây.
          </p>
          <div className="mt-4">
            <Button asChild size="sm">
              <Link href="/">Xem các bài toán đang chờ lời giải</Link>
            </Button>
          </div>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="w-16 px-4 py-3">Hạng</th>
                  <th className="px-4 py-3">Học sinh</th>
                  <th className="px-4 py-3">Khối lớp</th>
                  <th className="px-4 py-3 text-center">Lời giải đúng</th>
                  <th className="px-4 py-3 text-right">Tổng điểm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rankedLeaders.map((u, idx) => (
                  <tr
                    key={u.id}
                    className="transition-colors hover:bg-muted/35"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold tabular-nums">
                      <span
                        className={cn(
                          idx === 0
                            ? "text-bounty"
                            : idx === 1
                              ? "text-foreground"
                              : idx === 2
                                ? "text-bounty/80"
                                : "text-muted-foreground"
                        )}
                      >
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.avatarUrl}
                            alt={u.displayName}
                            className="h-7 w-7 rounded-full border border-border object-cover"
                          />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                            {u.displayName.slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">
                            {u.displayName}
                            {u.nickname && (
                              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                                ({u.nickname})
                              </span>
                            )}
                          </p>
                          {u.bio && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {u.bio}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.gradeLevel}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 text-xs font-medium tabular-nums text-success">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {u.solvedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground">
                      {u.totalEarnedPoints} điểm
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
