"use client";

import {
  MAX_BACKEND_IMAGE_BYTES,
  MAX_FRONTEND_RAW_IMAGE_BYTES,
} from "./env";

export type CompressionPreset = "avatar" | "reward" | "thread";

interface PresetConfig {
  maxDimension: number;
  qualities: number[];
}

const PRESETS: Record<CompressionPreset, PresetConfig> = {
  avatar: {
    maxDimension: 420,
    qualities: [0.84, 0.72, 0.6],
  },
  reward: {
    maxDimension: 960,
    qualities: [0.84, 0.72, 0.6],
  },
  thread: {
    // 1600px giữ chữ viết tay, chỉ số dưới & dấu căn trong lời giải Toán cực kỳ sắc nét
    maxDimension: 1600,
    qualities: [0.82, 0.7, 0.58, 0.46],
  },
};

export interface CompressedImageResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  savedPercent: number;
  width: number;
  height: number;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Không thể đọc được file ảnh này. Vui lòng thử ảnh JPG/PNG/WebP khác."));
    };
    img.src = objectUrl;
  });
}

function canvasToWebPBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Trình duyệt không thể nén ảnh sang định dạng WebP."));
          return;
        }
        resolve(blob);
      },
      "image/webp",
      quality
    );
  });
}

/**
 * Nén ảnh ngay trên trình duyệt học sinh (Client-side WebP):
 * - Cho phép chọn ảnh chụp điện thoại gốc tới 10MB
 * - Thu phóng tỷ lệ chuẩn và chuyển đổi sang WebP < 1MB trước khi gửi lên Backend
 */
export async function compressImageToWebP(
  rawFile: File,
  preset: CompressionPreset = "thread"
): Promise<CompressedImageResult> {
  if (!rawFile.type.startsWith("image/")) {
    throw new Error("Vui lòng chỉ chọn tập tin hình ảnh (JPG, PNG, WebP...).");
  }

  if (rawFile.size > MAX_FRONTEND_RAW_IMAGE_BYTES) {
    throw new Error(
      `Ảnh gốc nặng ${formatBytes(rawFile.size)} (tối đa cho phép chọn ảnh gốc 10MB).`
    );
  }

  const config = PRESETS[preset];
  const img = await loadImageElement(rawFile);

  let targetWidth = img.naturalWidth || img.width || 800;
  let targetHeight = img.naturalHeight || img.height || 600;

  const longestSide = Math.max(targetWidth, targetHeight);
  if (longestSide > config.maxDimension) {
    const scale = config.maxDimension / longestSide;
    targetWidth = Math.max(1, Math.round(targetWidth * scale));
    targetHeight = Math.max(1, Math.round(targetHeight * scale));
  }

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Trình duyệt không hỗ trợ xử lý ảnh Canvas 2D.");
  }

  // Lót nền trắng sạch sẽ để ảnh PNG/SVG chụp công thức nền trong suốt luôn rõ nét
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  let finalBlob: Blob | null = null;
  const safeTargetCap = Math.floor(MAX_BACKEND_IMAGE_BYTES * 0.94); // ~962 KB

  for (const quality of config.qualities) {
    const candidate = await canvasToWebPBlob(canvas, quality);
    finalBlob = candidate;
    if (candidate.size <= safeTargetCap) {
      break;
    }
  }

  // Nếu ảnh quá nhiều chi tiết vẫn sát 1MB, thu nhỏ thêm 25% một lần nữa
  if (finalBlob && finalBlob.size > MAX_BACKEND_IMAGE_BYTES) {
    const fallbackCanvas = document.createElement("canvas");
    fallbackCanvas.width = Math.max(1, Math.round(targetWidth * 0.75));
    fallbackCanvas.height = Math.max(1, Math.round(targetHeight * 0.75));
    const fbCtx = fallbackCanvas.getContext("2d");
    if (fbCtx) {
      fbCtx.fillStyle = "#ffffff";
      fbCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
      fbCtx.drawImage(canvas, 0, 0, fallbackCanvas.width, fallbackCanvas.height);
      finalBlob = await canvasToWebPBlob(fallbackCanvas, 0.65);
      targetWidth = fallbackCanvas.width;
      targetHeight = fallbackCanvas.height;
    }
  }

  if (!finalBlob || finalBlob.size > MAX_BACKEND_IMAGE_BYTES) {
    throw new Error("Không thể nén ảnh xuống dưới mức 1MB. Vui lòng cắt gọn vùng đề bài cần chụp.");
  }

  const baseName = rawFile.name.replace(/\.[^.]+$/, "") || "math-image";
  const safeSlug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .slice(0, 40);

  const webpFile = new File([finalBlob], `${safeSlug || "image"}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });

  const savedPercent =
    rawFile.size > 0
      ? Math.max(0, Math.round(((rawFile.size - webpFile.size) / rawFile.size) * 100))
      : 0;

  return {
    file: webpFile,
    originalBytes: rawFile.size,
    compressedBytes: webpFile.size,
    savedPercent,
    width: targetWidth,
    height: targetHeight,
  };
}
