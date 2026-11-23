import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function FeedbackLoading() {
  return (
    <div className="space-y-6">
      <Card className="space-y-2 p-6">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-4 w-3/4" />
      </Card>
      <Card className="p-6">
        <Skeleton className="h-60 w-full rounded-lg" />
      </Card>
    </div>
  );
}
