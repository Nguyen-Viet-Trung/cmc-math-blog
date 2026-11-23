import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  MessageSquare,
  Newspaper,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { UrlPageSizeSelect } from "@/components/UrlPageSizeSelect";
import { formatDateVN, formatRelativeDate, getThreadTypeLabel } from "@/lib/format";
import { getMemberSeoMeta, getPublicMemberProfile } from "@/lib/forum-service";
import { normalizePagination } from "@/lib/pagination";

function buildMemberUrl(memberId: string, page: number, pageSize: number): string {
  const sp = new URLSearchParams();
  if (page > 1) sp.set("page", String(page));
  if (pageSize !== 10) sp.set("pageSize", String(pageSize));
  const qs = sp.toString();
  return qs ? `/members/${memberId}?${qs}` : `/members/${memberId}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const member = await getMemberSeoMeta(id);
  if (!member) {
    return { title: "Không tìm thấy thành viên" };
  }
  const label = member.nickname
    ? `${member.displayName} (${member.nickname})`
    : member.displayName;
  return {
    title: label,
    description: `Hồ sơ thành viên ${label} tại CMC — ${member.solvedCount} lời giải đúng, ${member.totalEarnedPoints} điểm cống hiến.`,
  };
}

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; pageSize?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { page, pageSize } = normalizePagination(sp.page, sp.pageSize, 10, 50);
  const member = await getPublicMemberProfile(id, page, pageSize);
  if (!member) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 text-muted-foreground"
        >
          <Link href="/leaderboard">
            <ArrowLeft className="h-4 w-4" />
            Quay lại Bảng vàng
          </Link>
        </Button>
      </div>

      <Card className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar className="h-16 w-16 shrink-0 border border-border">
            <AvatarImage
              src={member.avatarUrl ?? undefined}
              alt={member.displayName}
            />
            <AvatarFallback className="text-lg font-bold">
              {member.displayName.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="heading-1">{member.displayName}</h1>
              {member.role === "admin" && (
                <Badge variant="subtle">Quản trị viên</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {member.nickname && (
                <span className="inline-flex items-center gap-1 font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-bounty" />
                  {member.nickname}
                </span>
              )}
              <span>{member.gradeLevel}</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Calendar className="h-3.5 w-3.5" />
                Gia nhập CLB: {formatDateVN(member.joinedAt)}
              </span>
            </div>

            {member.bio && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {member.bio}
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-border pt-5 text-center tabular-nums">
          <div>
            <p className="text-lg font-bold text-foreground sm:text-xl">
              {member.totalEarnedPoints}đ
            </p>
            <p className="text-[11px] text-muted-foreground">
              Điểm cống hiến
            </p>
          </div>
          <div className="border-x border-border">
            <p className="text-lg font-bold text-success sm:text-xl">
              {member.solvedCount}
            </p>
            <p className="text-[11px] text-muted-foreground">Lời giải đúng</p>
          </div>
          <div>
            <p className="text-lg font-bold text-foreground sm:text-xl">
              {member.threadsCount} · {member.repliesCount}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Bài đăng · Bình luận
            </p>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="heading-2">
          Bài viết đã đóng góp ({member.threadsCount})
        </h2>

        {member.recentThreads.length === 0 ? (
          <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
            Thành viên này chưa đăng bài viết nào.
          </Card>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {member.recentThreads.map((t) => (
              <Link
                key={t.id}
                href={`/threads/${t.id}`}
                prefetch={false}
                className="group flex items-start justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/35"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.threadType === "news" && (
                      <Badge variant="subtle" className="text-[10px]">
                        <Newspaper className="h-3 w-3" />
                        News
                      </Badge>
                    )}
                    {t.threadType === "research" && (
                      <Badge variant="subtle" className="text-[10px]">
                        <FlaskConical className="h-3 w-3" />
                        Research
                      </Badge>
                    )}
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                      {t.title}
                    </h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                    <span>{t.category.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>{getThreadTypeLabel(t.threadType)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeDate(t.createdAt)}</span>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1 text-xs tabular-nums text-muted-foreground">
                  {t.status === "solved" && (
                    <span className="inline-flex items-center gap-1 font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Đã giải
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t.replyCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {member.threadsCount > 0 && (
          <nav
            aria-label="Phân trang bài viết thành viên"
            className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs"
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="tabular-nums text-muted-foreground">
                Trang {member.threadsPage} / {member.threadsTotalPages} (
                {member.threadsCount} bài)
              </span>
              <UrlPageSizeSelect
                basePath={`/members/${member.id}`}
                pageSize={pageSize}
                defaultPageSize={10}
                options={[5, 10, 20, 30]}
                itemLabel="bài viết"
              />
            </div>
            {member.threadsTotalPages > 1 && (
              <div className="flex items-center gap-2">
                {member.threadsPage > 1 ? (
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link
                      href={buildMemberUrl(
                        member.id,
                        member.threadsPage - 1,
                        pageSize
                      )}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      Trang trước
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 text-xs">
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Trang trước
                  </Button>
                )}

                {member.threadsPage < member.threadsTotalPages ? (
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                    <Link
                      href={buildMemberUrl(
                        member.id,
                        member.threadsPage + 1,
                        pageSize
                      )}
                    >
                      Trang sau
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled className="h-8 text-xs">
                    Trang sau
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </nav>
        )}
      </section>
    </div>
  );
}
