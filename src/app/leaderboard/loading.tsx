import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function GenericPageLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card className="space-y-2 p-6">
        <Skeleton className="h-7 w-2/5" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
      <Card className="space-y-3 p-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </Card>
    </div>
  );
}
