"use client";

import { FeedbackForm } from "@/app/feedback/_components/FeedbackForm";
import { FeedbackList } from "@/app/feedback/_components/FeedbackList";
import { Badge } from "@/components/ui/badge";
import type { FeedbackItem, UserProfile } from "@/lib/types";

export function FeedbackClient({
  user,
  initialItems,
}: {
  user: UserProfile | null;
  initialItems: FeedbackItem[];
}) {
  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="heading-1">Góp ý, Báo lỗi &amp; Đề xuất</h1>
          <Badge variant="outline">Beta</Badge>
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Báo cáo lỗi hiển thị, công thức hoặc đề xuất tính năng mới để ban quản
          trị hoàn thiện nền tảng học Toán của câu lạc bộ.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <FeedbackForm user={user} />
        <FeedbackList initialItems={initialItems} />
      </div>
    </div>
  );
}
