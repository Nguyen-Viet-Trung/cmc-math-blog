import type { HomeThreadStatusFilter, ThreadType } from "./types";

export function formatRelativeDate(
  iso: string,
  nowMs: number = Date.now()
): string {
  const diffMs = Math.max(0, nowMs - new Date(iso).getTime());
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function formatDurationShort(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  if (safe < 60) return `${safe} giây`;
  const mins = Math.floor(safe / 60);
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

export function formatDateVN(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Định dạng ngày theo múi giờ Việt Nam (UTC+7) cho các mốc thời gian có giờ/phút
 * như lịch Giải đấu (Campaign) để tránh bị lùi 1 ngày khi chuyển sang UTC.
 */
export function formatDateVNLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function formatDateTimeVN(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

export function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function getThreadTypeLabel(type: ThreadType): string {
  if (type === "news") return "News";
  if (type === "research") return "Research";
  if (type === "challenge") return "Thử thách";
  return "Hỏi bài";
}

export function formatRemainingTime(
  endsAtIso: string,
  nowMs: number = Date.now()
): string {
  const diffMs = new Date(endsAtIso).getTime() - nowMs;
  if (!Number.isFinite(diffMs) || diffMs <= 0) return "Đã hết hạn";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `Còn ${Math.max(1, mins)} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Còn ${hours} giờ`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours > 0 ? `Còn ${days} ngày ${remHours} giờ` : `Còn ${days} ngày`;
}

export function buildHomeFilterUrl(params: {
  cat?: string;
  status?: HomeThreadStatusFilter | string;
  type?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}): string {
  const sp = new URLSearchParams();
  if (params.type && params.type !== "all") sp.set("type", params.type);
  if (params.cat) sp.set("cat", params.cat);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.page && params.page > 1) sp.set("page", String(Math.floor(params.page)));
  if (params.pageSize && params.pageSize !== 20) {
    sp.set("pageSize", String(Math.floor(params.pageSize)));
  }
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}
