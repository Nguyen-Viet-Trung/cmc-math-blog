import type { Metadata } from "next";
import Link from "next/link";
import { Award, Medal, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  listPublicBadgeCollection,
  listViewerEarnedAwardIds,
} from "@/lib/campaign-service";
import { getCurrentUserId } from "@/lib/forum-service";
import { BadgeCatalogGrid } from "./_components/BadgeCatalogGrid";
import { TopBadgeCollectors } from "./_components/TopBadgeCollectors";

export const metadata: Metadata = {
  title: "Bộ sưu tập Huy hiệu & Giải thưởng",
  description:
    "Khám phá toàn bộ Huy hiệu, Award từ các giải đấu Toán học tại CMC và bảng vinh danh các thành viên sưu tầm nhiều huy hiệu nhất.",
};

export default async function BadgesCollectionPage() {
  const [collection, viewerId] = await Promise.all([
    listPublicBadgeCollection(),
    getCurrentUserId(),
  ]);
  const earnedIds = viewerId
    ? await listViewerEarnedAwardIds(viewerId)
    : [];
  const earnedSet = new Set(earnedIds);
  const nowMs = Date.now();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="heading-1 flex items-center gap-2">
            <Award className="h-6 w-6 text-bounty" />
            Bộ sưu tập Huy hiệu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Danh mục toàn bộ Huy hiệu &amp; Giải thưởng từ các Giải đấu Toán học
            tại CMC. Hoàn thành thử thách để mở khóa và trưng bày trên hồ sơ
            công khai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {viewerId && (
            <Button asChild variant="outline" size="sm" className="h-8 text-xs">
              <Link href={`/members/${viewerId}#badges`} prefetch={false}>
                <UserCheck className="h-3.5 w-3.5" />
                Tủ huy hiệu của tôi ({earnedSet.size})
              </Link>
            </Button>
          )}
          <Button asChild size="sm" className="h-8 text-xs">
            <Link href="/campaigns" prefetch={false}>
              <Medal className="h-3.5 w-3.5" />
              Tham gia Giải đấu
            </Link>
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-3.5 text-center tabular-nums">
          <p className="text-lg font-bold text-foreground sm:text-xl">
            {collection.badges.length}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Tổng Huy hiệu công bố
          </p>
        </Card>
        <Card className="p-3.5 text-center tabular-nums">
          <p className="text-lg font-bold text-bounty sm:text-xl">
            {collection.totalGrantsCount}
          </p>
          <p className="text-[11px] text-muted-foreground">Lượt trao giải</p>
        </Card>
        <Card className="p-3.5 text-center tabular-nums">
          <p className="text-lg font-bold text-success sm:text-xl">
            {collection.totalAwardeesCount}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Thành viên sở hữu
          </p>
        </Card>
        <Card className="p-3.5 text-center tabular-nums">
          <p className="text-lg font-bold text-primary sm:text-xl">
            {viewerId
              ? `${earnedSet.size} / ${collection.badges.length}`
              : "—"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {viewerId ? "Bạn đã mở khóa" : "Đăng nhập để theo dõi"}
          </p>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="heading-2">
          Danh mục Huy hiệu ({collection.badges.length})
        </h2>
        <BadgeCatalogGrid
          badges={collection.badges}
          earnedAwardIds={earnedSet}
          nowMs={nowMs}
        />
      </section>

      <TopBadgeCollectors collectors={collection.collectors} />
    </div>
  );
}
