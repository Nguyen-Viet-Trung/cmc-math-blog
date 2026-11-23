import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-md" />
        <div className="flex gap-5 border-b border-border pb-2.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-28" />
        </div>
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 px-5 py-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 lg:border-l lg:border-border lg:pl-6">
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-9 w-full" />
          ))}
        </div>
        <div className="space-y-3 border-t border-border pt-6">
          <Skeleton className="h-4 w-20" />
          {[1, 2, 3].map((k) => (
            <Skeleton key={k} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
