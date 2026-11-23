"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface MathContentProps {
  content: string;
  imageUrls?: string[];
}

export function MathContent({ content, imageUrls = [] }: MathContentProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="math-prose overflow-x-auto break-words">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </ReactMarkdown>
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
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-2 text-left transition hover:border-primary hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Hình minh họa Toán ${idx + 1}`}
                loading="lazy"
                className="block max-h-[300px] w-full rounded-lg bg-white object-contain"
              />
              <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-slate-900/80 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition group-hover:bg-primary">
                <ZoomIn className="h-3 w-3" />
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
