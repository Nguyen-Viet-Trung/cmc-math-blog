import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CollectionDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Skeleton className="h-7 w-36" />
      <div className="space-y-2 border-b border-border pb-5">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Card className="divide-y divide-border p-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 px-5 py-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </Card>
    </div>
  );
}
