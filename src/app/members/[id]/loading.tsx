import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function MemberProfileLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-8 w-36" />
      <Card className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Skeleton className="h-16 w-16 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2.5">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5">
          <Skeleton className="mx-auto h-10 w-20" />
          <Skeleton className="mx-auto h-10 w-20" />
          <Skeleton className="mx-auto h-10 w-20" />
        </div>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-6 w-44" />
        <Card className="space-y-3 p-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </Card>
      </div>
    </div>
  );
}
