import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function CampaignDetailLoading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Skeleton className="h-8 w-36" />
      <Card className="space-y-4 p-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-16 w-full" />
      </Card>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
        <Card className="space-y-3 p-5">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </Card>
        <Card className="space-y-3 p-5">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    </div>
  );
}
