import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getThreadTypeLabel } from "@/lib/format";
import {
  getCurrentUserId,
  getCurrentUserProfile,
  getThreadDetail,
  getThreadSeoMeta,
} from "@/lib/forum-service";
import { ThreadInteractive } from "./ThreadInteractive";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const meta = await getThreadSeoMeta(id);
  if (!meta) {
    return { title: "Không tìm thấy bài viết" };
  }

  const typeLabel = getThreadTypeLabel(meta.threadType);
  const description = meta.excerpt
    ? `[${typeLabel} · ${meta.categoryName}] ${meta.excerpt}`
    : `${typeLabel} thuộc chuyên mục ${meta.categoryName} đăng bởi ${meta.authorName} trên CMC — CMA MATHS CLUB blog.`;

  return {
    title: meta.title,
    description,
    openGraph: {
      type: "article",
      title: `${meta.title} | CMC`,
      description,
      siteName: "CMC — CMA MATHS CLUB blog",
    },
    twitter: {
      card: "summary",
      title: `${meta.title} | CMC`,
      description,
    },
  };
}

export default async function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [{ id }, viewerId] = await Promise.all([params, getCurrentUserId()]);
  const [viewer, thread] = await Promise.all([
    viewerId ? getCurrentUserProfile() : Promise.resolve(null),
    getThreadDetail(id, viewerId),
  ]);

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
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Quay lại diễn đàn
          </Link>
        </Button>
      </div>

      <ThreadInteractive thread={thread} viewer={viewer} />
    </div>
  );
}
