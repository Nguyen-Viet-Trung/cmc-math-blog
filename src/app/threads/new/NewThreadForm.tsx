"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  FlaskConical,
  HelpCircle,
  Loader2,
  Newspaper,
  Send,
} from "lucide-react";
import { createThreadAction } from "@/app/actions/forum";
import { MathEditor } from "@/components/MathEditor";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
];

export function NewThreadForm({
  categories,
  defaultPoints,
}: {
  categories: Category[];
  defaultPoints: number;
}) {
  const router = useRouter();
  const [threadType, setThreadType] = useState<ThreadType>("question");
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 1);
  const [gradeTag, setGradeTag] = useState("Lớp 10");
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedMeta =
    THREAD_TYPE_OPTIONS.find((o) => o.value === threadType) ??
    THREAD_TYPE_OPTIONS[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await createThreadAction({
      title,
      categoryId,
      gradeTag,
      threadType,
      content,
      imageUrls,
    });

    setSubmitting(false);
    if (!res.ok) {
      setError(res.error || "Không thể đăng bài viết.");
      return;
    }

    router.push(`/threads/${res.threadId}`);
    router.refresh();
  }

  return (
    <Card className="p-5 sm:p-7">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="heading-1">
              {threadType === "news"
                ? "Đăng bài News mới"
                : threadType === "research"
                  ? "Đăng bài Research / Chuyên đề"
                  : "Đăng câu hỏi Bài toán mới"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {threadType === "question"
                ? "Nêu rõ giả thiết, kết luận và hướng bạn đã thử để các bạn hỗ trợ nhanh nhất."
                : "Bài viết News / Research chất lượng có thể được Admin thưởng điểm trực tiếp cho tác giả."}
            </p>
          </div>

          {threadType === "question" ? (
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

        {/* Chọn loại bài viết: Hỏi bài / News / Research */}
        <div className="space-y-2">
          <Label>Loại bài viết</Label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {THREAD_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const active = threadType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setThreadType(opt.value)}
                  className={cn(
                    "flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
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
        </div>

        <div className="space-y-2">
          <Label htmlFor="thread-title">Tiêu đề</Label>
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
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="thread-category">Chuyên mục Toán học</Label>
            <select
              id="thread-category"
              value={categoryId}
              disabled={categories.length === 0}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="thread-grade">Khối lớp / Cấp độ</Label>
            <select
              id="thread-grade"
              value={gradeTag}
              onChange={(e) => setGradeTag(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {GRADE_TAGS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>
            {threadType === "question"
              ? "Nội dung đề bài (hỗ trợ LaTeX & dán ảnh trực tiếp Ctrl+V)"
              : "Nội dung bài viết (hỗ trợ Markdown, LaTeX & dán ảnh trực tiếp Ctrl+V)"}
          </Label>
          <MathEditor
            value={content}
            onChange={setContent}
            imageUrls={imageUrls}
            onChangeImages={setImageUrls}
          />
        </div>

        {error && <Alert variant="destructive">{error}</Alert>}

        <div className="flex justify-end">
          <Button
            type="submit"
            size="lg"
            disabled={submitting || categories.length === 0}
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {threadType === "news"
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
