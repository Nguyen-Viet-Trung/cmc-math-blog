"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compressImageToWebP,
  formatBytes,
  type CompressionPreset,
} from "@/lib/image-compression";
import type { UploadFolder } from "@/lib/rules";

interface ImageUploaderProps {
  folder: UploadFolder;
  preset: CompressionPreset;
  onUploaded: (url: string, infoText: string) => void;
  buttonLabel?: string;
}

export function ImageUploader({
  folder,
  preset,
  onUploaded,
  buttonLabel = "Chọn ảnh (tự nén WebP)",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastInfo, setLastInfo] = useState<string | null>(null);

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile) return;

    setBusy(true);
    setError(null);

    try {
      const compressed = await compressImageToWebP(rawFile, preset);
      const formData = new FormData();
      formData.append("file", compressed.file);
      formData.append("folder", folder);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Tải ảnh lên thất bại.");
      }

      const info = `Đã nén WebP: ${formatBytes(compressed.originalBytes)} → ${formatBytes(compressed.compressedBytes)} (-${compressed.savedPercent}%)`;
      setLastInfo(info);
      onUploaded(json.url, info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải ảnh lên.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {busy ? "Đang nén WebP & tải lên..." : buttonLabel}
      </Button>

      {lastInfo && !error && (
        <p className="text-xs font-semibold text-success">{lastInfo}</p>
      )}
      {error && (
        <p className="text-xs font-semibold text-destructive">{error}</p>
      )}
    </div>
  );
}
