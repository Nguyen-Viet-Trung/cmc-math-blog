import { Flame, FlaskConical, HelpCircle, Newspaper } from "lucide-react";
import type { ThreadType } from "@/lib/types";

export const GRADE_TAGS = [
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

export interface ThreadTypeOption {
  value: ThreadType;
  label: string;
  desc: string;
  placeholder: string;
  icon: typeof HelpCircle;
}

export const THREAD_TYPE_OPTIONS: ThreadTypeOption[] = [
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
  {
    value: "challenge",
    label: "Thử thách Tuần",
    desc: "Ẩn bài nộp cho đến hết hạn, Admin chấm nhiều lời giải đúng",
    placeholder:
      "Ví dụ: [Thử thách Tuần #12] Chứng minh bất đẳng thức hoán vị 3 biến",
    icon: Flame,
  },
];

export interface NewThreadDraftData {
  title: string;
  content: string;
  categoryId: number;
  gradeTag: string;
  threadType: ThreadType;
}

export function getDefaultChallengeDeadlineInput(): string {
  const d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
