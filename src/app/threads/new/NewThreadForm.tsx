"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Check, Flame, Send } from "lucide-react";
import { createThreadAction } from "@/app/actions/forum";
import { DraftRestoreNotice } from "@/components/DraftRestoreNotice";
import { MathEditor } from "@/components/MathEditor";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { buildNewThreadDraftKey, useMathDraft } from "@/hooks/useMathDraft";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { Category, ThreadType } from "@/lib/types";
import { ChallengeFieldsPanel } from "./_components/ChallengeFieldsPanel";
import {
  getDefaultChallengeDeadlineInput,
  GRADE_TAGS,
  THREAD_TYPE_OPTIONS,
  type NewThreadDraftData,
} from "./_components/new-thread-config";
import { ThreadTypeSelector } from "./_components/ThreadTypeSelector";

export function NewThreadForm({
  categories,
  defaultPoints,
  isAdmin = false,
  userId = null,
}: {
  categories: Category[];
  defaultPoints: number;
  isAdmin?: boolean;
  userId?: string | null;
}) {
  const router = useRouter();
  const [threadType, setThreadType] = useState<ThreadType>("question");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 1);
  const [gradeTag, setGradeTag] = useState("Lớp 10");
  const [challengeDeadline, setChallengeDeadline] = useState(() =>
    getDefaultChallengeDeadlineInput()
  );
  const [challengeBounty, setChallengeBounty] = useState(
    String(Math.max(20, defaultPoints * 2))
  );
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultCategoryId = categories[0]?.id ?? 1;
  const visibleTypeOptions = useMemo(
    () =>
      isAdmin
        ? THREAD_TYPE_OPTIONS
        : THREAD_TYPE_OPTIONS.filter((o) => o.value !== "challenge"),
    [isAdmin]
  );

  const selectedMeta =
    visibleTypeOptions.find((o) => o.value === threadType) ??
    visibleTypeOptions[0];

  const draftValue = useMemo<NewThreadDraftData>(
    () => ({
      title,
      content,
      categoryId,
      gradeTag,
      threadType,
    }),
    [title, content, categoryId, gradeTag, threadType]
  );

  const handleRestoreDraft = useCallback(
    (data: NewThreadDraftData) => {
      if (typeof data.title === "string") setTitle(data.title);
      if (typeof data.content === "string") setContent(data.content);
      if (
        typeof data.categoryId === "number" &&
        categories.some((c) => c.id === data.categoryId)
      ) {
        setCategoryId(data.categoryId);
      }
      if (
        typeof data.gradeTag === "string" &&
        GRADE_TAGS.includes(data.gradeTag)
      ) {
        setGradeTag(data.gradeTag);
      }
      if (
        typeof data.threadType === "string" &&
        visibleTypeOptions.some((opt) => opt.value === data.threadType)
      ) {
        setThreadType(data.threadType);
      }
    },
    [categories, visibleTypeOptions]
  );

  const { restoredAt, hasSavedDraft, dismissRestoredNotice, clearDraft } =
    useMathDraft<NewThreadDraftData>({
      storageKey: userId ? buildNewThreadDraftKey(userId) : "",
      value: draftValue,
      enabled: isFeatureEnabled("draftAutoSave") && Boolean(userId),
      isEmpty: (v) => !v.title.trim() && !v.content.trim(),
      onRestore: handleRestoreDraft,
    });

  function handleDiscardDraft() {
    clearDraft();
    setTitle("");
    setContent("");
    setCategoryId(defaultCategoryId);
    setGradeTag("Lớp 10");
    setThreadType("question");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || isUploading) return;
    setSubmitting(true);
    setError(null);

    try {
      const challengeEndsAtIso =
        threadType === "challenge" && challengeDeadline
          ? new Date(challengeDeadline).toISOString()
          : null;

      const res = await createThreadAction({
        title,
        categoryId,
        gradeTag,
        threadType,
        challengeEndsAt: challengeEndsAtIso,
        bountyPoints:
          threadType === "challenge" ? Number(challengeBounty) : undefined,
        content,
        imageUrls,
      });

      if (!res.ok) {
        setError(res.error || "Không thể đăng bài viết.");
        setSubmitting(false);
        return;
      }

      clearDraft();
      router.push(`/threads/${res.threadId}`);
      router.refresh();
    } catch {
      setError("Không thể kết nối máy chủ khi đăng bài. Vui lòng thử lại.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5 sm:p-7">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="heading-1">
              {threadType === "challenge"
                ? "Tạo Thử thách Bài toán Tuần"
                : threadType === "news"
                  ? "Đăng bài News mới"
                  : threadType === "research"
                    ? "Đăng bài Research / Chuyên đề"
                    : "Đăng câu hỏi Bài toán mới"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {threadType === "challenge"
                ? "Bài nộp của học sinh sẽ được ẩn đến khi hết thời hạn để đảm bảo công bằng, sau đó Admin chấm thưởng nhiều lời giải đúng."
                : threadType === "question"
                  ? "Nêu rõ giả thiết, kết luận và hướng bạn đã thử để các bạn hỗ trợ nhanh nhất."
                  : "Bài viết News / Research chất lượng có thể được Admin thưởng điểm trực tiếp cho tác giả."}
            </p>
          </div>

          {threadType === "challenge" ? (
            <Badge variant="bounty" className="px-2.5 py-1 text-xs">
              <Flame className="h-3.5 w-3.5 text-bounty" />
              Thưởng +{challengeBounty || 0}đ / mỗi bài đúng
            </Badge>
          ) : threadType === "question" ? (
            <Badge variant="bounty" className="px-2.5 py-1 text-xs">
              <Award className="h-3.5 w-3.5 text-bounty" />
              Lời giải đúng nhận +{defaultPoints}đ
            </Badge>
          ) : (
            <Badge variant="subtle" className="px-2.5 py-1 text-xs">
              Admin thưởng điểm tác giả tùy chỉnh
            </Badge>
          )}
        </div>

        <Separator />

        {restoredAt !== null && (
          <DraftRestoreNotice
            restoredAt={restoredAt}
            onDiscard={handleDiscardDraft}
            onDismiss={dismissRestoredNotice}
          />
        )}

        <FieldGroup>
          <ThreadTypeSelector
            options={visibleTypeOptions}
            value={threadType}
            isAdmin={isAdmin}
            onChange={setThreadType}
          />

          <Field>
            <FieldLabel htmlFor="thread-title">Tiêu đề</FieldLabel>
            <Input
              id="thread-title"
              required
              minLength={8}
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selectedMeta.placeholder}
              className="h-10"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="thread-category">
                Chuyên mục Toán học
              </FieldLabel>
              <NativeSelect
                id="thread-category"
                value={categoryId}
                disabled={categories.length === 0}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="h-10"
              >
                {categories.length === 0 ? (
                  <option value={0}>Chưa có chuyên mục</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </NativeSelect>
            </Field>

            <Field>
              <FieldLabel htmlFor="thread-grade">Khối lớp / Cấp độ</FieldLabel>
              <NativeSelect
                id="thread-grade"
                value={gradeTag}
                onChange={(e) => setGradeTag(e.target.value)}
                className="h-10"
              >
                {GRADE_TAGS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          {threadType === "challenge" && (
            <ChallengeFieldsPanel
              challengeDeadline={challengeDeadline}
              challengeBounty={challengeBounty}
              onDeadlineChange={setChallengeDeadline}
              onBountyChange={setChallengeBounty}
            />
          )}

          <Field>
            <FieldLabel>
              {threadType === "question"
                ? "Nội dung đề bài (hỗ trợ LaTeX & dán ảnh trực tiếp Ctrl+V)"
                : "Nội dung bài viết (hỗ trợ Markdown, LaTeX & dán ảnh trực tiếp Ctrl+V)"}
            </FieldLabel>
            <MathEditor
              value={content}
              onChange={setContent}
              imageUrls={imageUrls}
              onChangeImages={setImageUrls}
              onUploadingChange={setIsUploading}
              rows={14}
            />
          </Field>
        </FieldGroup>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {hasSavedDraft && (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                Đã tự động lưu nháp trên trình duyệt
              </span>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || isUploading || categories.length === 0}
          >
            {submitting ? (
              <Spinner />
            ) : (
              <Send className="size-4" aria-hidden="true" />
            )}
            {isUploading
              ? "Đang tải ảnh lên..."
              : threadType === "challenge"
                ? "Phát hành Thử thách Tuần"
                : threadType === "news"
                  ? "Đăng bài News"
                  : threadType === "research"
                    ? "Đăng bài Research"
                    : "Đăng bài toán lên diễn đàn"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
