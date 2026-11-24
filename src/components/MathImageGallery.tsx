"use client";

import { memo, useState } from "react";
import dynamic from "next/dynamic";
import { ZoomIn } from "lucide-react";

const MathImageLightbox = dynamic(
  () => import("./MathImageLightbox").then((m) => m.MathImageLightbox),
  { ssr: false }
);

export const MathImageGallery = memo(function MathImageGallery({
  imageUrls,
}: {
  imageUrls: string[];
}) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (imageUrls.length === 0) return null;

  return (
    <>
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

      {lightboxUrl && (
        <MathImageLightbox
          url={lightboxUrl}
          onClose={() => setLightboxUrl(null)}
        />
      )}
    </>
  );
});
