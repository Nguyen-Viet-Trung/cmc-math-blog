"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { saveForumRulesAction } from "@/app/actions/admin";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEFAULT_FORUM_RULES_CONTENT,
  DEFAULT_FORUM_RULES_TITLE,
} from "@/lib/default-forum-rules";
import { formatDateTimeVN } from "@/lib/format";
import type { ForumDocument } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

export function AdminRulesTab({
  initialRules,
  onNotice,
}: {
  initialRules?: ForumDocument;
  onNotice: (n: AdminNotice) => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rulesQuery = useQuery<ForumDocument>({
    queryKey: ["admin-list", "rules"],
    initialData: initialRules,
    staleTime: 60_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/list?resource=rules", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Không thể tải nội dung Nội quy diễn đàn.");
      }
      const json = (await res.json()) as { rules: ForumDocument };
      return json.rules;
    },
  });

  const loadedDoc = rulesQuery.data;
  const [hydrated, setHydrated] = useState(Boolean(initialRules));
  const [title, setTitle] = useState(initialRules?.title ?? "");
  const [content, setContent] = useState(initialRules?.content ?? "");
  const [savedTitle, setSavedTitle] = useState(initialRules?.title ?? "");
  const [savedContent, setSavedContent] = useState(initialRules?.content ?? "");
  const [lastUpdatedAt, setLastUpdatedAt] = useState(
    initialRules?.updatedAt ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  useEffect(() => {
    if (!loadedDoc || hydrated) return;
    setTitle(loadedDoc.title);
    setContent(loadedDoc.content);
    setSavedTitle(loadedDoc.title);
    setSavedContent(loadedDoc.content);
    setLastUpdatedAt(loadedDoc.updatedAt);
    setHydrated(true);
  }, [loadedDoc, hydrated]);

  if (rulesQuery.isLoading && !loadedDoc) {
    return (
      <Card className="space-y-4 p-6">
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-[420px] w-full" />
      </Card>
    );
  }

  if (rulesQuery.isError && !loadedDoc) {
    return (
      <Card className="space-y-3 p-6 text-sm text-destructive">
        <p>Không thể tải Nội quy diễn đàn. Vui lòng thử lại.</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void rulesQuery.refetch()}
        >
          Thử tải lại
        </Button>
      </Card>
    );
  }

  const isDirty =
    title.trim() !== savedTitle.trim() ||
    content.trim() !== savedContent.trim();

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await saveForumRulesAction({ title, content });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể lưu Nội quy diễn đàn.",
        });
        return;
      }
      const nextUpdatedAt = res.updatedAt ?? new Date().toISOString();
      setSavedTitle(title.trim());
      setSavedContent(content.trim());
      setLastUpdatedAt(nextUpdatedAt);
      void queryClient.invalidateQueries({ queryKey: ["admin-list", "rules"] });
      onNotice({
        type: "success",
        text: "Đã lưu và xuất bản Nội quy diễn đàn mới tới trang học sinh!",
      });
      router.refresh();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi lưu Nội quy.",
      });
    } finally {
      setSaving(false);
    }
  }

  function handleRestoreDefault() {
    setTitle(DEFAULT_FORUM_RULES_TITLE);
    setContent(DEFAULT_FORUM_RULES_CONTENT);
    setConfirmResetOpen(false);
    onNotice({
      type: "success",
      text: "Đã nạp lại bộ Nội quy mẫu vào khung soạn thảo. Nhấn \"Lưu & Xuất bản Nội quy\" để áp dụng.",
    });
  }

  return (
    <>
      <Card className="p-5 sm:p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {lastUpdatedAt && (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <Clock className="h-3.5 w-3.5" />
                  Cập nhật lần cuối: {formatDateTimeVN(lastUpdatedAt)}
                </span>
              )}
              {loadedDoc?.updatedByName && (
                <span>· bởi {loadedDoc.updatedByName}</span>
              )}
              {isDirty && (
                <span className="rounded bg-bounty-surface px-1.5 py-0.5 text-[11px] font-medium text-bounty-foreground">
                  Có thay đổi chưa lưu
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button asChild type="button" size="sm" variant="outline">
                <Link href="/rules" target="_blank" prefetch={false}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  Xem trang học sinh
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmResetOpen(true)}
                disabled={saving}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nạp lại mẫu gốc
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-rules-title">Tiêu đề trang Nội quy</Label>
            <Input
              id="admin-rules-title"
              type="text"
              required
              minLength={3}
              maxLength={160}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Nội quy Diễn đàn Toán học"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-rules-content">
              Nội dung Nội quy (Rich Text / Markdown + LaTeX)
            </Label>
            <RichTextEditor
              id="admin-rules-content"
              value={content}
              onChange={setContent}
              rows={20}
            />
            <p className="text-[11px] text-muted-foreground">
              Các tiêu đề cấp <code>##</code> và <code>###</code> sẽ tự động tạo
              Mục lục nhanh bên phải trang Nội quy của học sinh.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu &amp; Xuất bản Nội quy
            </Button>
          </div>
        </form>
      </Card>

      <ConfirmDialog
        open={confirmResetOpen}
        onOpenChange={setConfirmResetOpen}
        title="Nạp lại nội dung Nội quy mặc định?"
        description="Thao tác này sẽ thay thế nội dung hiện đang có trong khung soạn thảo bằng bộ Nội quy gốc 7 điều của diễn đàn. Thay đổi chỉ có hiệu lực sau khi bạn bấm Lưu."
        confirmLabel="Nạp lại mẫu"
        onConfirm={handleRestoreDefault}
      />
    </>
  );
}
