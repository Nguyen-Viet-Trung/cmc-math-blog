import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function BadgesCollectionLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="space-y-1.5 p-3.5">
            <Skeleton className="mx-auto h-6 w-12" />
            <Skeleton className="mx-auto h-3 w-24" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="space-y-3 p-4">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-44" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-8 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}
