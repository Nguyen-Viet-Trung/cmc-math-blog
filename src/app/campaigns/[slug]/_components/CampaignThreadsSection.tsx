import Link from "next/link";
import {
  CheckCircle2,
  CircleDashed,
  Flame,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getThreadTypeLabel } from "@/lib/format";
import type { CampaignThreadItem } from "@/lib/types";

export function CampaignThreadsSection({
  items,
  completedThreadIds,
}: {
  items: CampaignThreadItem[];
  completedThreadIds: ReadonlySet<string>;
}) {
  return (
    <section className="space-y-3">
      <h2 className="heading-2 flex items-center gap-2">
        <Flame className="h-4 w-4 text-bounty" />
        Danh sách Thử thách ({items.length})
      </h2>

      {items.length === 0 ? (
        <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
          Chưa có bài thử thách nào được gắn vào giải đấu này.
        </Card>
      ) : (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {items.map((item, idx) => {
            const t = item.thread;
            const viewerSolved = completedThreadIds.has(t.id);
            return (
              <Link
                key={t.id}
                href={`/threads/${t.id}`}
                prefetch={false}
                className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/35"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50 font-mono text-xs font-semibold tabular-nums text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                        {t.title}
                      </h3>
                      {viewerSolved && (
                        <Badge variant="success" className="text-[10px]">
                          <CheckCircle2 className="h-3 w-3" />
                          Bạn đã hoàn thành
                        </Badge>
                      )}
                    </div>
                    {item.note && (
                      <p className="text-xs text-muted-foreground">
                        {item.note}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{t.category.name}</span>
                      <span aria-hidden="true">·</span>
                      <span>{getThreadTypeLabel(t.threadType)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium tabular-nums text-bounty">
                        +{t.bountyPoints}đ
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 text-xs tabular-nums text-muted-foreground">
                  {viewerSolved ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-muted-foreground/60" />
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.replyCount}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
