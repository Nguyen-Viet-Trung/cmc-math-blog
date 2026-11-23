import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function RewardsLoading() {
  return (
    <div className="space-y-7">
      <Card className="space-y-2 p-7">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-5 w-2/3" />
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <Skeleton className="h-44 w-full rounded-none" />
            <div className="space-y-2.5 p-5">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-9 w-full rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
