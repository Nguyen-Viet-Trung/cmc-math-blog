"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bug,
  ImagePlus,
  Lightbulb,
  Loader2,
  MessageSquarePlus,
  Palette,
  Send,
  Trash2,
} from "lucide-react";
import { submitFeedbackAction } from "@/app/actions/feedback";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { compressImageToWebP, formatBytes } from "@/lib/image-compression";
import type { FeedbackCategory, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_BUTTONS: {
  key: FeedbackCategory;
  label: string;
  icon: typeof Bug;
  iconClass: string;
  activeClass: string;
}[] = [
  {
    key: "bug",
    label: "Báo lỗi (Bug)",
    icon: Bug,
    iconClass: "text-destructive",
    activeClass: "border-destructive bg-destructive/10 font-bold text-destructive",
  },
  {
    key: "feature",
    label: "Yêu cầu tính năng",
    icon: Lightbulb,
    iconClass: "text-primary",
    activeClass: "border-primary bg-primary/10 font-bold text-primary",
  },
  {
    key: "ui_ux",
    label: "Góp ý giao diện",
    icon: Palette,
    iconClass: "text-bounty",
    activeClass: "border-bounty bg-bounty-surface font-bold text-bounty-foreground",
  },
  {
    key: "other",
    label: "Khác",
    icon: MessageSquarePlus,
    iconClass: "",
    activeClass: "border-foreground/50 bg-secondary font-bold text-foreground",
  },
];

export function FeedbackForm({ user }: { user: UserProfile | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<FeedbackCategory>("bug");
  const [title, setTitle] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadInfo, setUploadInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  async function handleUploadFiles(files: File[]) {
    if (!user || files.length === 0) return;
    if (imageUrls.length + files.length > 4) {
      setNotice({
        type: "error",
        text: "Đính kèm tối đa 4 ảnh chụp màn hình cho mỗi góp ý.",
      });
      return;
    }

    setUploading(true);
    setNotice(null);
    try {
      const added: string[] = [];
      let lastText = "";
      for (const raw of files) {
        const compressed = await compressImageToWebP(raw, "thread");
        const fd = new FormData();
        fd.append("file", compressed.file);
        fd.append("folder", "threads");

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Tải ảnh thất bại.");
        added.push(json.url);
        lastText = `Đã nén ảnh chụp màn hình: ${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.compressedBytes)} (-${compressed.savedPercent}%)`;
      }
      setImageUrls([...imageUrls, ...added]);
      setUploadInfo(lastText);
    } catch (err) {
      setNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Không thể tải ảnh lên.",
      });
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || uploading) return;
    setSubmitting(true);
    setNotice(null);

    try {
      const res = await submitFeedbackAction({
        category,
        title,
        description,
        pageUrl,
        imageUrls,
        contactName,
        contactEmail,
      });

      if (!res.ok) {
        setNotice({
          type: "error",
          text: res.error || "Không thể gửi phản hồi.",
        });
        return;
      }

      setTitle("");
      setDescription("");
      setPageUrl("");
      setImageUrls([]);
      setUploadInfo(null);
      setNotice({
        type: "success",
        text: "Cảm ơn bạn rất nhiều! Báo cáo / đề xuất của bạn đã được ghi nhận để Admin kiểm tra và cập nhật cho các phiên bản tiếp theo.",
      });
      await queryClient.invalidateQueries({ queryKey: ["public-feedbacks"] });
      router.refresh();
    } catch {
      setNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi gửi phản hồi. Vui lòng thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="h-fit p-5 sm:p-6 lg:col-span-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <MessageSquarePlus className="h-5 w-5 text-primary" />
          Gửi phản hồi mới
        </h2>

        <div className="space-y-1.5">
          <Label>Bạn muốn gửi nội dung gì?</Label>
          <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
            {CATEGORY_BUTTONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setCategory(opt.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3 py-2.5 transition",
                    category === opt.key
                      ? opt.activeClass
                      : "border-border text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", opt.iconClass)} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {!user && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="fb-contact-name" className="text-[11px]">
                Tên của bạn (tùy chọn)
              </Label>
              <Input
                id="fb-contact-name"
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Nguyễn Minh Khôi"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fb-contact-email" className="text-[11px]">
                Email liên hệ (nếu cần hỗ trợ)
              </Label>
              <Input
                id="fb-contact-email"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="hocsinh@gmail.com"
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="fb-title">Tiêu đề tóm tắt</Label>
          <Input
            id="fb-title"
            type="text"
            required
            minLength={5}
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              category === "bug"
                ? "Ví dụ: Công thức phân số dài bị tràn lề trên điện thoại"
                : "Ví dụ: Đề xuất thêm nút lưu bài toán hay vào mục Yêu thích"
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fb-url">
            Đường dẫn trang liên quan (không bắt buộc)
          </Label>
          <Input
            id="fb-url"
            type="text"
            value={pageUrl}
            onChange={(e) => setPageUrl(e.target.value)}
            placeholder="Ví dụ: /threads/... hoặc /rewards"
            className="text-xs"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fb-desc">
            Mô tả chi tiết (các bước gặp lỗi hoặc ý tưởng mong muốn)
          </Label>
          <Textarea
            id="fb-desc"
            required
            rows={5}
            minLength={10}
            maxLength={3000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onPaste={(e) => {
              if (!user) return;
              const files = Array.from(e.clipboardData?.items ?? [])
                .filter((i) => i.type.startsWith("image/"))
                .map((i) => i.getAsFile())
                .filter((f): f is File => f !== null);
              if (files.length > 0) {
                e.preventDefault();
                void handleUploadFiles(files);
              }
            }}
            placeholder={
              user
                ? "Mô tả chi tiết... Bạn có thể bấm Ctrl+V để dán trực tiếp ảnh chụp màn hình lỗi vào đây!"
                : "Mô tả chi tiết tình huống gặp lỗi hoặc tính năng bạn mong muốn..."
            }
          />
        </div>

        {user && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-input bg-muted/50 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <ImagePlus className="h-3.5 w-3.5 text-primary" />
                )}
                <span>
                  {uploading
                    ? "Đang nén WebP..."
                    : `Đính kèm ảnh chụp màn hình (${imageUrls.length}/4)`}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploading || imageUrls.length >= 4}
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void handleUploadFiles(selected);
                  }}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-muted-foreground">
                Hỗ trợ dán Ctrl+V
              </span>
            </div>

            {uploadInfo && (
              <p className="text-[11px] font-medium text-success">
                {uploadInfo}
              </p>
            )}

            {imageUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url, idx) => (
                  <div
                    key={`${url}-${idx}`}
                    className="relative h-16 w-20 overflow-hidden rounded-lg border border-border"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={`Screenshot ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImageUrls(imageUrls.filter((_, i) => i !== idx))
                      }
                      aria-label={`Gỡ ảnh chụp màn hình ${idx + 1}`}
                      title="Gỡ ảnh này"
                      className="absolute right-0.5 top-0.5 rounded bg-destructive p-0.5 text-destructive-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {notice && (
          <Alert
            variant={notice.type === "success" ? "success" : "destructive"}
            className="text-xs font-semibold leading-relaxed"
          >
            {notice.text}
          </Alert>
        )}

        <Button
          type="submit"
          disabled={submitting || uploading}
          className="w-full"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {uploading ? "Đang tải ảnh lên..." : "Gửi báo cáo / Đề xuất"}
        </Button>
      </form>
    </Card>
  );
}
