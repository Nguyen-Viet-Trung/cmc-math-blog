import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <Card className="space-y-2 p-6">
        <Skeleton className="h-7 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
      <div className="flex flex-wrap gap-2.5">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-36 rounded-lg" />
        ))}
      </div>
      <Card className="p-6">
        <Skeleton className="h-72 w-full rounded-lg" />
      </Card>
    </div>
  );
}
