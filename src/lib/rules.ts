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
  "challenge",
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
  threadType?: ThreadType;
  threadStatus: "open" | "solved" | "closed";
  acceptedReplyId: string | null;
  replyAuthorId: string;
  replyAuthorBanned: boolean;
}

/**
 * Kiểm tra điều kiện chọn lời giải đúng và cộng điểm tự động:
 * 1. Chỉ áp dụng cho bài dạng Hỏi bài (`question`).
 * 2. Chỉ chủ bài đăng (hoặc Admin) mới được chọn.
 * 3. Chặn tuyệt đối việc tự chọn câu trả lời của chính người đăng đề để cày điểm.
 * 4. Mỗi chủ đề chỉ trao thưởng cho 1 lời giải đúng duy nhất.
 */
export function validateAcceptAnswer(input: AcceptAnswerInput): RuleResult {
  if (input.threadType && input.threadType !== "question") {
    return {
      ok: false,
      error: "Chỉ bài Hỏi bài mới hỗ trợ chọn lời giải đúng trực tiếp.",
      statusCode: 400,
    };
  }

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

/**
 * Ngăn chặn lỗ hổng Open Redirect (ví dụ `//evil.com`, `/\evil.com`, `https://evil.com`).
 * Chỉ cho phép đường dẫn nội bộ tương đối bắt đầu bằng đúng một dấu `/`.
 */
export function sanitizeRedirectPath(raw: string | null | undefined): string {
  if (!raw) return "/";
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    /[\r\n]/.test(trimmed)
  ) {
    return "/";
  }
  return trimmed;
}

/**
 * Kiểm tra bài Thử thách Tuần đang trong chế độ ẩn bài nộp (Blind Submission) hay chưa:
 * Chỉ ẩn khi `threadType === "challenge"`, trạng thái đang `open` và chưa quá hạn `challengeEndsAt`.
 */
export function isChallengeBlindActive(
  threadType: ThreadType,
  status: "open" | "solved" | "closed",
  challengeEndsAt: string | null,
  nowMs: number = Date.now()
): boolean {
  if (threadType !== "challenge" || status !== "open" || !challengeEndsAt) {
    return false;
  }
  const endMs = new Date(challengeEndsAt).getTime();
  if (!Number.isFinite(endMs)) return false;
  return nowMs < endMs;
}

/**
 * Khi chế độ Blind Submission đang bật, học sinh thường chỉ thấy bài nộp của chính mình
 * hoặc thông báo/hướng dẫn từ Admin / tác giả đề bài.
 */
export function canViewReplyInChallenge(input: {
  isBlindActive: boolean;
  viewerId: string | null;
  viewerRole: "student" | "admin" | null;
  threadAuthorId: string;
  replyAuthorId: string;
  replyAuthorRole: "student" | "admin";
}): boolean {
  if (!input.isBlindActive) return true;
  if (input.viewerRole === "admin") return true;
  if (input.viewerId && input.viewerId === input.threadAuthorId) return true;
  if (input.viewerId && input.viewerId === input.replyAuthorId) return true;
  if (
    input.replyAuthorRole === "admin" ||
    input.replyAuthorId === input.threadAuthorId
  ) {
    return true;
  }
  return false;
}

/**
 * Lọc danh sách bình luận được phép hiển thị trong Chế độ Thi Ẩn Bài (Blind Submission):
 * - Áp dụng `canViewReplyInChallenge` cho từng bình luận.
 * - Khi `isBlindActive` bật, mọi bình luận con (`parentReplyId`) có cha đang bị ẩn
 *   (ví dụ Admin góp ý riêng vào bài nộp ẩn của Học sinh A) cũng bị ẩn với người xem khác
 *   để tránh lộ nội dung hoặc bị đẩy thành bình luận gốc công khai.
 */
export function filterVisibleChallengeReplies<
  T extends {
    id: string;
    parentReplyId: string | null;
    author: { id: string; role: "student" | "admin" };
  },
>(
  allReplies: readonly T[],
  ctx: {
    isBlindActive: boolean;
    viewerId: string | null;
    viewerRole: "student" | "admin" | null;
    threadAuthorId: string;
  }
): T[] {
  if (!ctx.isBlindActive) return [...allReplies];
  if (
    ctx.viewerRole === "admin" ||
    (ctx.viewerId && ctx.viewerId === ctx.threadAuthorId)
  ) {
    return [...allReplies];
  }

  const byId = new Map<string, T>();
  for (const r of allReplies) {
    byId.set(r.id, r);
  }

  const canSeeOwn = (r: T) =>
    canViewReplyInChallenge({
      isBlindActive: true,
      viewerId: ctx.viewerId,
      viewerRole: ctx.viewerRole,
      threadAuthorId: ctx.threadAuthorId,
      replyAuthorId: r.author.id,
      replyAuthorRole: r.author.role,
    });

  return allReplies.filter((r) => {
    if (!canSeeOwn(r)) return false;
    if (r.parentReplyId) {
      const parent = byId.get(r.parentReplyId);
      if (parent && !canSeeOwn(parent)) {
        return false;
      }
    }
    return true;
  });
}

/**
 * Kiểm tra hạn nộp của bài Thử thách Tuần (cho phép từ 10 phút tới tối đa 90 ngày tới).
 */
export function validateChallengeDeadline(
  rawIso: string | null | undefined,
  nowMs: number = Date.now()
): { ok: true; iso: string } | { ok: false; error: string } {
  if (!rawIso || !rawIso.trim()) {
    return { ok: false, error: "Vui lòng chọn thời hạn kết thúc thử thách." };
  }
  const parsed = new Date(rawIso);
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: "Thời hạn thử thách không hợp lệ." };
  }
  const minMs = nowMs + 10 * 60 * 1000;
  const maxMs = nowMs + 90 * 24 * 60 * 60 * 1000;
  if (parsed.getTime() < minMs) {
    return {
      ok: false,
      error: "Thời hạn thử thách cần cách hiện tại ít nhất 10 phút.",
    };
  }
  if (parsed.getTime() > maxMs) {
    return {
      ok: false,
      error: "Thời hạn thử thách tối đa là 90 ngày tính từ hiện tại.",
    };
  }
  return { ok: true, iso: parsed.toISOString() };
}

/**
 * Kiểm tra điều kiện Admin chấm & trao thưởng lời giải đúng cho bài Thử thách Tuần
 * (cho phép chọn nhiều học sinh giải đúng, mỗi học sinh nhận thưởng tối đa 1 lần / thử thách).
 */
export function validateChallengeAward(input: {
  callerRole: "student" | "admin";
  threadType: ThreadType;
  replyAuthorId: string;
  threadAuthorId: string;
  replyAuthorBanned: boolean;
  alreadyAccepted: boolean;
  alreadyRewardedUser: boolean;
  bountyPoints: number;
}): RuleResult {
  if (input.callerRole !== "admin") {
    return {
      ok: false,
      error: "Chỉ Quản trị viên mới có quyền chấm điểm bài Thử thách Tuần.",
      statusCode: 403,
    };
  }
  if (input.threadType !== "challenge") {
    return {
      ok: false,
      error: "Bài viết này không phải là bài Thử thách Tuần.",
      statusCode: 400,
    };
  }
  if (input.alreadyAccepted) {
    return {
      ok: false,
      error: "Bài nộp này đã được chấm đúng và trao thưởng trước đó.",
      statusCode: 409,
    };
  }
  if (input.alreadyRewardedUser) {
    return {
      ok: false,
      error: "Học sinh này đã nhận thưởng cho thử thách này rồi.",
      statusCode: 409,
    };
  }
  if (input.replyAuthorId === input.threadAuthorId) {
    return {
      ok: false,
      error: "Không thể tự trao thưởng cho tác giả đề thử thách.",
      statusCode: 400,
    };
  }
  if (input.replyAuthorBanned) {
    return {
      ok: false,
      error: "Tài khoản học sinh đang bị khóa nên không thể nhận điểm.",
      statusCode: 400,
    };
  }
  if (!Number.isInteger(input.bountyPoints) || input.bountyPoints <= 0) {
    return {
      ok: false,
      error: "Mức điểm thưởng thử thách phải lớn hơn 0.",
      statusCode: 400,
    };
  }
  return { ok: true };
}

export function slugifyCollectionTitle(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateCollectionInput(input: {
  title: string;
  slug?: string;
  description?: string;
}): { ok: true; title: string; slug: string; description: string } | { ok: false; error: string } {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 120) {
    return {
      ok: false,
      error: "Tên bộ sưu tập chuyên đề cần từ 3 đến 120 ký tự.",
    };
  }
  const rawSlug = input.slug?.trim() ? input.slug : title;
  const slug = slugifyCollectionTitle(rawSlug);
  if (slug.length < 2) {
    return {
      ok: false,
      error: "Đường dẫn (slug) của bộ sưu tập không hợp lệ.",
    };
  }
  const description = (input.description ?? "").trim().slice(0, 600);
  return { ok: true, title, slug, description };
}

/**
 * Trích xuất danh sách tên được nhắc tới dạng `@[Nguyễn Minh Khôi]` hoặc `@ten` (tối đa 5 người/bình luận).
 */
export function extractMentionedNames(content: string): string[] {
  const found = new Set<string>();
  // Ưu tiên cú pháp rõ ràng @[Tên Đầy Đủ] do nút Trả lời/Nhắc tên tạo ra
  const bracketRe = /@\[([^\]\n]{2,50})\]/g;
  let match: RegExpExecArray | null;
  while ((match = bracketRe.exec(content)) !== null) {
    const cleaned = match[1].trim();
    if (cleaned) found.add(cleaned);
    if (found.size >= 5) return Array.from(found);
  }
  // Cú pháp ngắn @token không chứa khoảng trắng (tránh nhầm email a@b.com)
  const tokenRe = /(?:^|[\s(])@([\p{L}0-9_.-]{2,32})/gu;
  while ((match = tokenRe.exec(content)) !== null) {
    const cleaned = match[1].replace(/[.,!?;:]+$/, "").trim();
    if (cleaned.length >= 2) found.add(cleaned);
    if (found.size >= 5) break;
  }
  return Array.from(found);
}

export type PointAdjustmentScope = "both" | "balance_only" | "earned_only";

export const POINT_ADJUSTMENT_SCOPE_LABELS: Record<
  PointAdjustmentScope,
  string
> = {
  both: "Cả Điểm khả dụng & Tổng điểm đạt được",
  balance_only: "Chỉ Điểm khả dụng (đổi quà)",
  earned_only: "Chỉ Tổng điểm đạt được (Bảng vàng)",
};

export function normalizePointAdjustmentScope(
  raw?: string | null
): PointAdjustmentScope {
  if (raw === "balance_only" || raw === "earned_only" || raw === "both") {
    return raw;
  }
  return "both";
}

/**
 * Tính toán an toàn điểm khả dụng (`points_balance`) và tổng điểm đạt được (`total_earned_points`)
 * khi Admin điều chỉnh điểm thủ công theo phạm vi (`both` | `balance_only` | `earned_only`).
 * - Đảm bảo cả 2 chỉ số không bao giờ âm.
 * - Khi trừ mà cả hai chỉ số thuộc phạm vi điều chỉnh đều đã bằng 0 thì trả về lỗi rõ ràng.
 */
export function computeAdminPointAdjustment(input: {
  currentBalance: number;
  currentEarned: number;
  deltaPoints: number;
  scope?: PointAdjustmentScope;
}):
  | {
      ok: true;
      scope: PointAdjustmentScope;
      nextBalance: number;
      nextEarned: number;
      balanceDelta: number;
      earnedDelta: number;
      ledgerAmount: number;
    }
  | { ok: false; error: string } {
  const delta = Math.trunc(Number(input.deltaPoints));
  if (!Number.isFinite(delta) || delta === 0) {
    return { ok: false, error: "Số điểm điều chỉnh phải khác 0." };
  }
  if (Math.abs(delta) > 100_000) {
    return { ok: false, error: "Số điểm điều chỉnh tối đa ±100.000 mỗi lần." };
  }

  const scope = normalizePointAdjustmentScope(input.scope);
  const currentBalance = Math.max(0, Math.trunc(input.currentBalance));
  const currentEarned = Math.max(0, Math.trunc(input.currentEarned));

  const nextBalance =
    scope === "earned_only" ? currentBalance : Math.max(0, currentBalance + delta);
  const nextEarned =
    scope === "balance_only" ? currentEarned : Math.max(0, currentEarned + delta);

  const balanceDelta = nextBalance - currentBalance;
  const earnedDelta = nextEarned - currentEarned;

  if (balanceDelta === 0 && earnedDelta === 0 && delta < 0) {
    const label =
      scope === "balance_only"
        ? "Điểm khả dụng"
        : scope === "earned_only"
          ? "Tổng điểm đạt được"
          : "Điểm khả dụng và tổng điểm đạt được";
    return { ok: false, error: `${label} hiện tại của học sinh đã bằng 0.` };
  }

  const ledgerAmount =
    scope === "earned_only"
      ? earnedDelta
      : balanceDelta !== 0
        ? balanceDelta
        : earnedDelta;

  return {
    ok: true,
    scope,
    nextBalance,
    nextEarned,
    balanceDelta,
    earnedDelta,
    ledgerAmount,
  };
}
