"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  Clock,
  Flame,
  FlaskConical,
  HelpCircle,
  Newspaper,
  Send,
} from "lucide-react";
import { createThreadAction } from "@/app/actions/forum";
import { MathEditor } from "@/components/MathEditor";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import type { Category, ThreadType } from "@/lib/types";
import { cn } from "@/lib/utils";

const GRADE_TAGS = [
  "Lớp 6",
  "Lớp 7",
  "Lớp 8",
  "Lớp 9",
  "Lớp 10",
  "Lớp 11",
  "Lớp 12",
  "Ôn thi Chuyên / HSG",
  "THPT Quốc Gia",
  "Toán Đại học",
  "Chung",
];

const THREAD_TYPE_OPTIONS: {
  value: ThreadType;
  label: string;
  desc: string;
  placeholder: string;
  icon: typeof HelpCircle;
}[] = [
    {
      value: "question",
      label: "Hỏi bài",
      desc: "Đặt câu hỏi Toán học & trao thưởng lời giải đúng",
      placeholder:
        "Ví dụ: Giải phương trình vô tỉ bằng phương pháp liên hợp (Đề HSG Lớp 10)",
      icon: HelpCircle,
    },
    {
      value: "news",
      label: "News",
      desc: "Tin tức, kỳ thi, thông báo & sự kiện Toán học",
      placeholder:
        "Ví dụ: Lịch thi và cấu trúc đề Olympic Toán học Sinh viên – Học sinh năm nay",
      icon: Newspaper,
    },
  {
    value: "research",
    label: "Research",
    desc: "Chuyên đề nghiên cứu, bài viết sâu & phép chứng minh",
    placeholder:
      "Ví dụ: Tổng quan phương pháp hàm sinh trong các bài toán đếm tổ hợp",
    icon: FlaskConical,
  },
  {
    value: "challenge",
    label: "Thử thách Tuần",
    desc: "Ẩn bài nộp cho đến hết hạn, Admin chấm nhiều lời giải đúng",
    placeholder:
      "Ví dụ: [Thử thách Tuần #12] Chứng minh bất đẳng thức hoán vị 3 biến",
    icon: Flame,
  },
];

function getDefaultChallengeDeadlineInput(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NewThreadForm({
  categories,
  defaultPoints,
  isAdmin = false,
}: {
  categories: Category[];
  defaultPoints: number;
  isAdmin?: boolean;
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

  const visibleTypeOptions = isAdmin
    ? THREAD_TYPE_OPTIONS
    : THREAD_TYPE_OPTIONS.filter((o) => o.value !== "challenge");

  const selectedMeta =
    visibleTypeOptions.find((o) => o.value === threadType) ??
    visibleTypeOptions[0];

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

          {/* Chọn loại bài viết */}
          <FieldGroup>
            <Field>
              <FieldLabel>Loại bài viết</FieldLabel>
              <div
                role="group"
                aria-label="Chọn loại bài viết"
                className={cn(
                  "grid grid-cols-1 gap-2",
                  isAdmin ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
                )}
              >
                {visibleTypeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = threadType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setThreadType(opt.value)}
                      className={cn(
                        "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                        active
                          ? "border-primary bg-primary/5 text-foreground"
                          : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      )}
                    >
                      <Icon
                        aria-hidden="true"
                        className={cn(
                          "mt-0.5 size-4 shrink-0",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      />
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-foreground">
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                          {opt.desc}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </Field>

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
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-bounty-border bg-bounty-surface/40 p-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel
                    htmlFor="challenge-deadline"
                    className="inline-flex items-center gap-1.5 text-xs"
                  >
                    <Clock className="size-3.5 text-bounty" aria-hidden="true" />
                    Hạn kết thúc nộp bài ẩn
                  </FieldLabel>
                  <Input
                    id="challenge-deadline"
                    type="datetime-local"
                    required
                    value={challengeDeadline}
                    onChange={(e) => setChallengeDeadline(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <FieldDescription>
                    Trước thời điểm này, học sinh chỉ thấy bài nộp của chính mình.
                  </FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="challenge-bounty" className="text-xs">
                    Điểm thưởng mỗi lời giải đúng (1–1000)
                  </FieldLabel>
                  <Input
                    id="challenge-bounty"
                    type="number"
                    required
                    min={1}
                    max={1000}
                    value={challengeBounty}
                    onChange={(e) => setChallengeBounty(e.target.value)}
                    className="h-9 font-semibold tabular-nums text-bounty"
                  />
                  <FieldDescription>
                    Admin có thể chọn nhiều học sinh giải đúng cùng nhận mức điểm này.
                  </FieldDescription>
                </Field>
              </div>
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

          <div className="flex justify-end">
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
