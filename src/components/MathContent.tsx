"use client";

import { memo, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import {
  CheckCircle2,
  ChevronRight,
  EyeOff,
  Lightbulb,
  ZoomIn,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  parseMathContentSegments,
  type MathCalloutKind,
  type MathContentSegment,
} from "@/lib/math-blocks";
import { cn } from "@/lib/utils";

const MathDiagram = dynamic(
  () => import("@/components/MathDiagram").then((m) => m.MathDiagram),
  {
    loading: () => <Skeleton className="my-3 h-48 w-full rounded-lg" />,
  }
);

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];
const EMPTY_IMAGE_URLS: string[] = [];

interface MathContentProps {
  content: string;
  imageUrls?: string[];
}

function formatMentionsForMarkdown(raw: string): string {
  // Chuyển cú pháp @[Tên Thành Viên] sang dạng nổi bật `@Tên Thành Viên` (giữ nguyên bên trong block code/math)
  return raw.replace(/@\[([^\]\n]{2,50})\]/g, "**@$1**");
}

function areImageUrlsEqual(a?: string[], b?: string[]): boolean {
  const left = a ?? EMPTY_IMAGE_URLS;
  const right = b ?? EMPTY_IMAGE_URLS;
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) return false;
  }
  return true;
}

const CALLOUT_STYLES: Record<
  MathCalloutKind,
  { wrapper: string; iconClass: string; icon: typeof Lightbulb; label: string }
> = {
  hint: {
    wrapper: "border-bounty-border bg-bounty-surface/40",
    iconClass: "text-bounty",
    icon: Lightbulb,
    label: "Gợi ý",
  },
  solution: {
    wrapper: "border-success-border bg-success-surface/40",
    iconClass: "text-success",
    icon: CheckCircle2,
    label: "Lời giải",
  },
  spoiler: {
    wrapper: "border-border bg-muted/45",
    iconClass: "text-muted-foreground",
    icon: EyeOff,
    label: "Ẩn",
  },
};

function RenderSegments({ segments }: { segments: MathContentSegment[] }) {
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === "markdown") {
          return (
            <div key={`md-${idx}`} className="math-prose overflow-x-auto break-words">
              <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
              >
                {formatMentionsForMarkdown(seg.content)}
              </ReactMarkdown>
            </div>
          );
        }

        if (seg.type === "diagram") {
          return (
            <MathDiagram
              key={`diag-${idx}`}
              kind={seg.kind}
              source={seg.source}
            />
          );
        }

        const style = CALLOUT_STYLES[seg.kind];
        const Icon = style.icon;
        const innerSegments = parseMathContentSegments(seg.content);

        return (
          <details
            key={`call-${idx}`}
            className={cn(
              "group my-3 overflow-hidden rounded-lg border",
              style.wrapper
            )}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-foreground select-none hover:bg-background/30 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0", style.iconClass)} />
                <span>{seg.title}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <span className="group-open:hidden">Bấm để mở</span>
                <span className="hidden group-open:inline">Thu gọn</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
              </span>
            </summary>
            <div className="border-t border-border/60 bg-card/80 px-4 py-3">
              {innerSegments.length > 0 ? (
                <RenderSegments segments={innerSegments} />
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  (Chưa có nội dung)
                </p>
              )}
            </div>
          </details>
        );
      })}
    </>
  );
}

function MathContentInner({
  content,
  imageUrls = EMPTY_IMAGE_URLS,
}: MathContentProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const segments = useMemo(() => parseMathContentSegments(content), [content]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <RenderSegments segments={segments} />
      </div>

      {imageUrls.length > 0 && (
        <div
          className={
            imageUrls.length === 1
              ? "grid grid-cols-1 gap-3 pt-1 sm:grid-cols-[minmax(0,480px)]"
              : "grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2"
          }
        >
          {imageUrls.map((url, idx) => (
            <button
              key={`${url}-${idx}`}
              type="button"
              onClick={() => setLightboxUrl(url)}
              className="group relative aspect-[16/10] max-h-[300px] w-full overflow-hidden rounded-xl border border-border bg-card p-2 text-left transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Hình minh họa Toán ${idx + 1}`}
                loading="lazy"
                className="block h-full w-full rounded-lg bg-white object-contain"
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-foreground/85 px-2 py-1 text-[11px] font-semibold text-background backdrop-blur-sm transition group-hover:bg-primary group-hover:text-primary-foreground">
                <ZoomIn className="size-3" aria-hidden="true" />
                Phóng to
              </span>
            </button>
          ))}
        </div>
      )}

      <Dialog
        open={Boolean(lightboxUrl)}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent className="max-w-5xl border-border bg-card p-2 sm:p-3">
          <DialogTitle className="sr-only">Xem ảnh phóng to</DialogTitle>
          {lightboxUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={lightboxUrl}
              alt="Ảnh phóng to"
              className="mx-auto block max-h-[86vh] max-w-full rounded-lg bg-white object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export const MathContent = memo(
  MathContentInner,
  (prev, next) =>
    prev.content === next.content &&
    areImageUrlsEqual(prev.imageUrls, next.imageUrls)
);
