import { Skeleton } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-2 border-b border-border pb-4">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="flex items-center justify-between border-b border-border pb-3">
        <Skeleton className="h-10 w-56 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>

      <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="flex items-start gap-3.5 px-5 py-4">
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-3.5 w-2/3" />
              <div className="flex gap-1.5 pt-0.5">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
