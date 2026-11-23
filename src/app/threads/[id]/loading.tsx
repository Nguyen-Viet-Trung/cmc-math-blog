import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ThreadLoading() {
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Skeleton className="h-6 w-36" />
      <Card className="space-y-4 p-5 sm:p-8">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-6 w-44" />
        </div>
        <Skeleton className="h-9 w-5/6" />
        <Skeleton className="h-5 w-2/5" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </Card>

      {[1, 2].map((i) => (
        <Card key={i} className="space-y-3 p-6">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </Card>
      ))}
    </div>
  );
}
