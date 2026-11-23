import type { ThreadType } from "./types";

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
  return new Date(iso).toLocaleDateString("vi-VN");
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

export function toDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function getThreadTypeLabel(type: ThreadType): string {
  if (type === "news") return "News";
  if (type === "research") return "Research";
  return "Hỏi bài";
}

export function buildHomeFilterUrl(params: {
  cat?: string;
  status?: string;
  type?: string;
  q?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.type && params.type !== "all") sp.set("type", params.type);
  if (params.cat) sp.set("cat", params.cat);
  if (params.status && params.status !== "all") sp.set("status", params.status);
  if (params.q?.trim()) sp.set("q", params.q.trim());
  const qs = sp.toString();
  return qs ? `/?${qs}` : "/";
}
