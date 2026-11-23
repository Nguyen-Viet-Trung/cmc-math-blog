import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewThreadLoading() {
  return (
    <div className="mx-auto max-w-[840px] space-y-5">
      <Skeleton className="h-6 w-44" />
      <Card className="space-y-5 p-6 sm:p-8">
        <Skeleton className="h-8 w-3/5" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-lg" />
      </Card>
    </div>
  );
}
