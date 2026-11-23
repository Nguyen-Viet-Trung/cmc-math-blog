"use client";

import { useRef, useState } from "react";
import { Edit3, Eye, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { compressImageToWebP, formatBytes } from "@/lib/image-compression";
import { MathContent } from "./MathContent";

const LATEX_SNIPPETS = [
  { label: "Phân số", insert: "$\\frac{a}{b}$" },
  { label: "Căn √x", insert: "$\\sqrt{x}$" },
  { label: "Căn bậc n", insert: "$\\sqrt[n]{x}$" },
  { label: "Số mũ", insert: "$x^{2}$" },
  {
    label: "Hệ PT",
    insert: "\n$$\\begin{cases} x + y = 2 \\\\ xy = 1 \\end{cases}$$\n",
  },
  { label: "Tổng Σ", insert: "$\\sum_{i=1}^{n} a_i$" },
  { label: "Tích phân ∫", insert: "$\\int_{a}^{b} f(x)\\,dx$" },
  { label: "Giới hạn lim", insert: "$\\lim_{x \\to +\\infty} f(x)$" },
  { label: "Bất đẳng thức", insert: "$a \\le b \\ge c \\neq 0$" },
  { label: "Hình học △", insert: "$\\triangle ABC, \\widehat{ABC} = 90^\\circ$" },
];

interface MathEditorProps {
  value: string;
  onChange: (next: string) => void;
  imageUrls: string[];
  onChangeImages: (nextUrls: string[]) => void;
  placeholder?: string;
  rows?: number;
}

export function MathEditor({
  value,
  onChange,
  imageUrls,
  onChangeImages,
  placeholder = "Nhập nội dung... Gõ công thức Toán trong cặp dấu $...$ (ví dụ $\\frac{a}{b}$) hoặc $$...$$ cho công thức riêng dòng. Bấm Ctrl+V để dán trực tiếp ảnh chụp đề/bài giải!",
  rows = 7,
}: MathEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  function insertSnippet(snippet: string) {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + snippet);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const next = value.slice(0, start) + snippet + value.slice(end);
    onChange(next);
    setTab("write");
    requestAnimationFrame(() => {
      el.focus();
      const cursor = start + snippet.length;
      el.setSelectionRange(cursor, cursor);
    });
  }

  async function processAndUploadFiles(files: File[]) {
    if (files.length === 0) return;
    if (imageUrls.length + files.length > 6) {
      setUploadError("Mỗi bài đính kèm tối đa 6 ảnh.");
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      const addedUrls: string[] = [];
      let latestSummary = "";

      for (const raw of files) {
        const compressed = await compressImageToWebP(raw, "thread");
        const fd = new FormData();
        fd.append("file", compressed.file);
        fd.append("folder", "threads");

        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Không thể tải ảnh lên.");
        }

        addedUrls.push(json.url);
        latestSummary = `Đã tự động nén WebP: ${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.compressedBytes)} (tiết kiệm ${compressed.savedPercent}%)`;
      }

      onChangeImages([...imageUrls, ...addedUrls]);
      setUploadNotice(latestSummary);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Lỗi khi nén và tải ảnh lên."
      );
    } finally {
      setUploading(false);
    }
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData?.items ?? []);
    const imageFiles = items
      .filter((item) => item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((f): f is File => f !== null);

    if (imageFiles.length > 0) {
      e.preventDefault();
      await processAndUploadFiles(imageFiles);
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Thanh tab Soạn thảo / Xem trước + Phím tắt LaTeX */}
      <div className="border-b border-border bg-muted/60 px-3 py-2">
        <Tabs
          value={tab}
          onValueChange={(next) => setTab(next as "write" | "preview")}
        >
          <TabsList className="bg-background/70">
            <TabsTrigger value="write">
              <Edit3 className="h-3.5 w-3.5" />
              Soạn thảo LaTeX
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-3.5 w-3.5" />
              Xem trước Toán
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "write" && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-dashed border-border pt-2">
            {LATEX_SNIPPETS.map((s) => (
              <button
                key={s.label}
                type="button"
                title={`Chèn: ${s.insert}`}
                onClick={() => insertSnippet(s.insert)}
                className="rounded-md border border-input bg-card px-2.5 py-1 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === "write" ? (
        <textarea
          ref={textareaRef}
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="block w-full resize-y border-0 bg-card p-4 font-mono text-[0.875rem] leading-[1.65] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      ) : (
        <div className="min-h-[165px] bg-card p-5">
          {value.trim() || imageUrls.length > 0 ? (
            <MathContent content={value} imageUrls={imageUrls} />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              Chưa có nội dung công thức để xem trước...
            </p>
          )}
        </div>
      )}

      {/* Thanh đính kèm ảnh nén WebP */}
      <div className="border-t border-border bg-muted/40 px-3.5 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              e.target.value = "";
              void processAndUploadFiles(selected);
            }}
            className="hidden"
          />

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || imageUrls.length >= 6}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            {uploading
              ? "Đang nén WebP & tải lên..."
              : `Đính kèm ảnh đề / lời giải (${imageUrls.length}/6)`}
          </Button>

          <span className="hidden text-xs text-muted-foreground sm:inline">
            Ảnh chụp điện thoại tới 10MB tự nén sang WebP &lt; 1MB (hỗ trợ{" "}
            <strong className="text-foreground">Ctrl+V</strong> dán ảnh chụp màn
            hình)
          </span>
        </div>

        {uploadNotice && !uploadError && (
          <p className="mt-1.5 text-xs font-semibold text-success">
            {uploadNotice}
          </p>
        )}

        {uploadError && (
          <p className="mt-1.5 text-xs font-semibold text-destructive">
            {uploadError}
          </p>
        )}

        {imageUrls.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2.5">
            {imageUrls.map((url, idx) => (
              <div
                key={`${url}-${idx}`}
                className="relative h-[74px] w-[92px] overflow-hidden rounded-lg border border-border bg-card"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Ảnh đính kèm ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    onChangeImages(imageUrls.filter((_, i) => i !== idx))
                  }
                  className="absolute right-1 top-1 rounded-md bg-destructive p-1 text-destructive-foreground shadow hover:bg-destructive/90"
                  title="Gỡ ảnh này"
                  aria-label="Gỡ ảnh này"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
