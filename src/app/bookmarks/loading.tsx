import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BookmarksLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Card className="divide-y divide-border p-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 px-5 py-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </Card>
    </div>
  );
}
