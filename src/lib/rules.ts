import { MAX_BACKEND_IMAGE_BYTES } from "./env";
import type {
  AdminReplyAuditItem,
  BuffPairSummary,
  ReplySuspicionCode,
  ThreadType,
} from "./types";

export const ALLOWED_THREAD_TYPES: readonly ThreadType[] = [
  "question",
  "news",
  "research",
] as const;

export function isValidThreadType(val: unknown): val is ThreadType {
  return (
    typeof val === "string" &&
    (ALLOWED_THREAD_TYPES as readonly string[]).includes(val)
  );
}

export function normalizeThreadType(val: unknown): ThreadType {
  return isValidThreadType(val) ? val : "question";
}

export interface AwardThreadAuthorInput {
  callerRole: "student" | "admin";
  points: number;
  authorBanned: boolean;
}

export function validateThreadAuthorReward(
  input: AwardThreadAuthorInput
): RuleResult {
  if (input.callerRole !== "admin") {
    return {
      ok: false,
      error: "Chỉ Quản trị viên (Admin) mới có quyền thưởng điểm cho tác giả bài viết.",
      statusCode: 403,
    };
  }
  if (!Number.isInteger(input.points) || input.points < 1 || input.points > 1000) {
    return {
      ok: false,
      error: "Số điểm thưởng cho tác giả phải là số nguyên từ 1 đến 1000.",
      statusCode: 400,
    };
  }
  if (input.authorBanned) {
    return {
      ok: false,
      error: "Tài khoản tác giả đang bị khóa nên không thể cộng điểm thưởng.",
      statusCode: 400,
    };
  }
  return { ok: true };
}

export type RuleResult =
  | { ok: true }
  | { ok: false; error: string; statusCode?: number };

export interface AcceptAnswerInput {
  callerId: string;
  callerRole: "student" | "admin";
  threadAuthorId: string;
  threadStatus: "open" | "solved" | "closed";
  acceptedReplyId: string | null;
  replyAuthorId: string;
  replyAuthorBanned: boolean;
}

/**
 * Kiểm tra điều kiện chọn lời giải đúng và cộng điểm tự động:
 * 1. Chỉ chủ bài đăng (hoặc Admin) mới được chọn.
 * 2. Chặn tuyệt đối việc tự chọn câu trả lời của chính người đăng đề để cày điểm.
 * 3. Mỗi chủ đề chỉ trao thưởng cho 1 lời giải đúng duy nhất.
 */
export function validateAcceptAnswer(input: AcceptAnswerInput): RuleResult {
  const isOwner = input.callerId === input.threadAuthorId;
  const isAdmin = input.callerRole === "admin";

  if (!isOwner && !isAdmin) {
    return {
      ok: false,
      error: "Chỉ học sinh đăng câu hỏi này (hoặc Admin) mới có quyền chọn lời giải đúng.",
      statusCode: 403,
    };
  }

  if (input.threadStatus === "closed") {
    return {
      ok: false,
      error: "Chủ đề này đã bị đóng nên không thể thay đổi lời giải.",
      statusCode: 400,
    };
  }

  if (input.threadStatus === "solved" || input.acceptedReplyId !== null) {
    return {
      ok: false,
      error: "Bài toán này đã có lời giải đúng được chọn và cộng điểm trước đó.",
      statusCode: 409,
    };
  }

  if (input.replyAuthorId === input.threadAuthorId) {
    return {
      ok: false,
      error: "Bạn không thể tự chọn lời giải của chính mình để cộng điểm!",
      statusCode: 400,
    };
  }

  if (input.replyAuthorBanned) {
    return {
      ok: false,
      error: "Tài khoản người trả lời đang bị khóa nên không thể nhận điểm.",
      statusCode: 400,
    };
  }

  return { ok: true };
}

export interface RedeemRewardInput {
  userBanned: boolean;
  userPoints: number;
  rewardActive: boolean;
  rewardCost: number;
  rewardStock: number;
}

export function validateRewardRedemption(input: RedeemRewardInput): RuleResult {
  if (input.userBanned) {
    return {
      ok: false,
      error: "Tài khoản của bạn đang tạm khóa, không thể thực hiện đổi quà.",
      statusCode: 403,
    };
  }

  if (!input.rewardActive) {
    return {
      ok: false,
      error: "Phần quà này hiện đã ngừng áp dụng.",
      statusCode: 400,
    };
  }

  if (input.rewardStock <= 0) {
    return {
      ok: false,
      error: "Phần quà này tạm thời đã hết số lượng trong kho.",
      statusCode: 409,
    };
  }

  if (input.rewardCost <= 0) {
    return {
      ok: false,
      error: "Mốc điểm của quà tặng không hợp lệ.",
      statusCode: 400,
    };
  }

  if (input.userPoints < input.rewardCost) {
    const missing = input.rewardCost - input.userPoints;
    return {
      ok: false,
      error: `Bạn cần thêm ${missing} điểm nữa mới đủ mốc đổi món quà này.`,
      statusCode: 400,
    };
  }

  return { ok: true };
}

export type UploadFolder = "avatars" | "threads" | "rewards";

export interface UploadValidationInput {
  sizeBytes: number;
  mimeType: string;
  headerBytes: Uint8Array;
  folder: string;
  userRole: "student" | "admin";
}

function matchesImageMagicBytes(mimeType: string, bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  if (mimeType === "image/webp") {
    // RIFF....WEBP
    return (
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  return false;
}

export function validateUploadPayload(input: UploadValidationInput): RuleResult {
  if (!["avatars", "threads", "rewards"].includes(input.folder)) {
    return {
      ok: false,
      error: "Thư mục lưu trữ không hợp lệ.",
      statusCode: 400,
    };
  }

  if (input.folder === "rewards" && input.userRole !== "admin") {
    return {
      ok: false,
      error: "Chỉ Admin mới được phép tải lên hình ảnh quà tặng.",
      statusCode: 403,
    };
  }

  if (input.sizeBytes <= 0) {
    return {
      ok: false,
      error: "File tải lên bị rỗng.",
      statusCode: 400,
    };
  }

  if (input.sizeBytes > MAX_BACKEND_IMAGE_BYTES) {
    return {
      ok: false,
      error: "Ảnh sau khi nén vẫn vượt quá giới hạn 1MB của hệ thống. Vui lòng chọn ảnh gọn hơn.",
      statusCode: 413,
    };
  }

  const allowedTypes = ["image/webp", "image/png", "image/jpeg"];
  if (!allowedTypes.includes(input.mimeType)) {
    return {
      ok: false,
      error: "Định dạng ảnh không được hỗ trợ (chỉ chấp nhận WebP, PNG, JPEG).",
      statusCode: 415,
    };
  }

  if (!matchesImageMagicBytes(input.mimeType, input.headerBytes)) {
    return {
      ok: false,
      error: "Nội dung file không khớp với định dạng hình ảnh hợp lệ.",
      statusCode: 400,
    };
  }

  return { ok: true };
}

export interface ReplySuspicionAnalysis {
  flagsByReplyId: Record<string, ReplySuspicionCode[]>;
  suspiciousPairs: BuffPairSummary[];
}

/**
 * Phân tích toàn bộ lịch sử bình luận/lời giải để phát hiện sớm dấu hiệu học sinh "buff điểm" cho nhau:
 * - `mutual_pair`: Hai tài khoản A và B tick duyệt lời giải cộng điểm qua lại cho nhau (buff chéo).
 * - `repeated_pair`: Cùng 1 chủ bài đăng tick cộng điểm cho cùng 1 người trả lời >= 2 lần.
 * - `short_accepted`: Bình luận được chọn làm lời giải đúng nhưng quá ngắn (< 30 ký tự) và không đính kèm ảnh.
 * - `ultra_fast_reply`: Bình luận được chọn làm lời giải đúng nhưng đăng chỉ trong <= 60 giây sau khi tạo đề.
 */
export function analyzeAdminReplyAudits(
  replies: AdminReplyAuditItem[]
): ReplySuspicionAnalysis {
  const directedCounts = new Map<string, number>();
  const pairMap = new Map<string, BuffPairSummary>();

  for (const r of replies) {
    if (!r.isAccepted) continue;
    if (r.threadAuthorId === r.replyAuthorId) continue;

    const dirKey = `${r.threadAuthorId}->${r.replyAuthorId}`;
    directedCounts.set(dirKey, (directedCounts.get(dirKey) ?? 0) + 1);

    const isALess = r.threadAuthorId < r.replyAuthorId;
    const userAId = isALess ? r.threadAuthorId : r.replyAuthorId;
    const userBId = isALess ? r.replyAuthorId : r.threadAuthorId;
    const pairKey = `${userAId}::${userBId}`;

    let pair = pairMap.get(pairKey);
    if (!pair) {
      pair = {
        pairKey,
        userAId,
        userAName: isALess ? r.threadAuthorName : r.replyAuthorName,
        userAEmail: isALess ? r.threadAuthorEmail : r.replyAuthorEmail,
        userBId,
        userBName: isALess ? r.replyAuthorName : r.threadAuthorName,
        userBEmail: isALess ? r.replyAuthorEmail : r.threadAuthorEmail,
        aAcceptedBCount: 0,
        bAcceptedACount: 0,
        totalAcceptedCount: 0,
        totalPointsTransferred: 0,
        isMutual: false,
      };
      pairMap.set(pairKey, pair);
    }

    if (r.threadAuthorId === userAId) {
      pair.aAcceptedBCount += 1;
    } else {
      pair.bAcceptedACount += 1;
    }
    pair.totalAcceptedCount += 1;
    pair.totalPointsTransferred += Math.max(
      0,
      r.awardedPoints || r.threadBountyPoints
    );
    pair.isMutual = pair.aAcceptedBCount > 0 && pair.bAcceptedACount > 0;
  }

  const flagsByReplyId: Record<string, ReplySuspicionCode[]> = {};

  for (const r of replies) {
    if (!r.isAccepted) continue;

    const flags: ReplySuspicionCode[] = [];
    const forwardCount =
      directedCounts.get(`${r.threadAuthorId}->${r.replyAuthorId}`) ?? 0;
    const reverseCount =
      directedCounts.get(`${r.replyAuthorId}->${r.threadAuthorId}`) ?? 0;

    if (forwardCount > 0 && reverseCount > 0) {
      flags.push("mutual_pair");
    }
    if (forwardCount >= 2) {
      flags.push("repeated_pair");
    }
    if (r.content.trim().length < 30 && r.imageUrls.length === 0) {
      flags.push("short_accepted");
    }
    if (r.secondsAfterThread >= 0 && r.secondsAfterThread <= 60) {
      flags.push("ultra_fast_reply");
    }

    if (flags.length > 0) {
      flagsByReplyId[r.id] = flags;
    }
  }

  const suspiciousPairs = Array.from(pairMap.values())
    .filter((p) => p.isMutual || p.totalAcceptedCount >= 2)
    .sort((a, b) => {
      if (a.isMutual !== b.isMutual) return a.isMutual ? -1 : 1;
      return b.totalPointsTransferred - a.totalPointsTransferred;
    });

  return { flagsByReplyId, suspiciousPairs };
}

export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function validateNickname(raw: string): RuleResult {
  const normalized = normalizeNickname(raw);
  if (normalized.length > 40) {
    return {
      ok: false,
      error: "Biệt danh không được vượt quá 40 ký tự.",
      statusCode: 400,
    };
  }
  return { ok: true };
}

/**
 * Kiểm tra và chuẩn hóa chuỗi ngày gia nhập CLB (định dạng `YYYY-MM-DD` hoặc ISO hợp lệ)
 * do Admin tùy chỉnh. Giới hạn trong khoảng từ năm 2000 đến cuối ngày mai (tránh lỗi timezone).
 */
export function parseClubJoinedDate(
  raw: string
): { ok: true; isoDate: string } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, error: "Vui lòng chọn ngày gia nhập câu lạc bộ." };
  }

  let parsed: Date;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split("-").map(Number);
    parsed = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    if (
      parsed.getUTCFullYear() !== y ||
      parsed.getUTCMonth() !== m - 1 ||
      parsed.getUTCDate() !== d
    ) {
      return { ok: false, error: "Ngày gia nhập không tồn tại trên lịch." };
    }
  } else {
    parsed = new Date(trimmed);
  }

  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Định dạng ngày gia nhập không hợp lệ." };
  }

  const minMs = Date.UTC(2000, 0, 1);
  const maxMs = Date.now() + 24 * 60 * 60 * 1000;
  if (parsed.getTime() < minMs || parsed.getTime() > maxMs) {
    return {
      ok: false,
      error: "Ngày gia nhập cần nằm trong khoảng từ năm 2000 đến hiện tại.",
    };
  }

  return { ok: true, isoDate: parsed.toISOString() };
}

export type RedemptionStatus = "pending" | "approved" | "fulfilled" | "rejected";

/**
 * Kiểm tra tính hợp lệ khi Admin chuyển trạng thái đơn đổi quà.
 * Chặn tuyệt đối việc sửa hoặc hoàn điểm lại cho đơn đã `fulfilled` (đã trao quà) hoặc đã `rejected`.
 */
export function validateRedemptionTransition(
  currentStatus: RedemptionStatus,
  nextStatus: "approved" | "fulfilled" | "rejected"
): RuleResult {
  if (currentStatus === "rejected") {
    return {
      ok: false,
      error: "Đơn đổi quà này đã bị từ chối và hoàn điểm trước đó.",
      statusCode: 409,
    };
  }
  if (currentStatus === "fulfilled") {
    return {
      ok: false,
      error: "Đơn đổi quà này đã được đánh dấu hoàn thành (đã trao quà), không thể thay đổi thêm.",
      statusCode: 409,
    };
  }
  if (currentStatus === nextStatus) {
    return {
      ok: false,
      error: "Đơn đổi quà hiện đã ở trạng thái này rồi.",
      statusCode: 400,
    };
  }
  return { ok: true };
}

export function validateThreadAuthorMutation(input: {
  callerId: string;
  callerRole: "student" | "admin";
  threadAuthorId: string;
  threadStatus: "open" | "solved" | "closed";
  acceptedReplyId: string | null;
  action: "edit" | "delete";
}): RuleResult {
  const isOwner = input.callerId === input.threadAuthorId;
  const isAdmin = input.callerRole === "admin";
  if (!isOwner && !isAdmin) {
    return {
      ok: false,
      error: "Chỉ tác giả bài viết hoặc Admin mới có quyền thực hiện thao tác này.",
      statusCode: 403,
    };
  }
  if (!isAdmin && input.threadStatus === "closed") {
    return {
      ok: false,
      error: "Chủ đề này đã bị đóng nên không thể chỉnh sửa hoặc xóa.",
      statusCode: 400,
    };
  }
  if (
    input.action === "delete" &&
    !isAdmin &&
    (input.threadStatus === "solved" || input.acceptedReplyId !== null)
  ) {
    return {
      ok: false,
      error:
        "Không thể tự xóa bài toán đã có lời giải đúng được cộng điểm. Vui lòng liên hệ Admin nếu cần hỗ trợ.",
      statusCode: 409,
    };
  }
  return { ok: true };
}

export function validateReplyAuthorMutation(input: {
  callerId: string;
  callerRole: "student" | "admin";
  replyAuthorId: string;
  isAccepted: boolean;
  threadStatus: "open" | "solved" | "closed";
}): RuleResult {
  const isOwner = input.callerId === input.replyAuthorId;
  const isAdmin = input.callerRole === "admin";
  if (!isOwner && !isAdmin) {
    return {
      ok: false,
      error: "Chỉ người viết bình luận hoặc Admin mới có quyền chỉnh sửa/xóa.",
      statusCode: 403,
    };
  }
  if (!isAdmin && input.isAccepted) {
    return {
      ok: false,
      error:
        "Lời giải này đã được chọn cộng điểm nên không thể tự sửa hoặc xóa.",
      statusCode: 409,
    };
  }
  if (!isAdmin && input.threadStatus === "closed") {
    return {
      ok: false,
      error: "Chủ đề đã đóng, không thể chỉnh sửa hoặc xóa bình luận.",
      statusCode: 400,
    };
  }
  return { ok: true };
}
