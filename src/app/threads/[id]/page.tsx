import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile, getThreadDetail } from "@/lib/forum-service";
import { ThreadInteractive } from "./ThreadInteractive";

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getCurrentUserProfile();
  const thread = await getThreadDetail(id, viewer?.id);

  if (!thread) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/" prefetch={true}>
            <ArrowLeft className="h-4 w-4" />
            Quay lại diễn đàn
          </Link>
        </Button>
      </div>

      <ThreadInteractive thread={thread} viewer={viewer} />
    </div>
  );
}
