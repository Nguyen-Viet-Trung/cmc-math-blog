export const DRAFT_STORAGE_PREFIX = "cmc-draft:";
export const NEW_THREAD_DRAFT_KEY = `${DRAFT_STORAGE_PREFIX}thread-new`;
export const DRAFT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
export const DRAFT_DEBOUNCE_MS = 800;
export const MAX_VALID_DATE_MS = 8_640_000_000_000_000; // JS Date max timestamp
export const DRAFT_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000; // 5 phút lệch đồng hồ tối đa

export interface StoredDraftEnvelope<T> {
  version: 1;
  updatedAt: number;
  data: T;
}

export function buildNewThreadDraftKey(userId?: string | null): string {
  const safeUserId = userId?.trim();
  if (safeUserId) {
    return `${DRAFT_STORAGE_PREFIX}u:${safeUserId}:thread-new`;
  }
  return NEW_THREAD_DRAFT_KEY;
}

export function buildReplyDraftKey(
  threadId: string,
  userId?: string | null
): string {
  const safeThreadId = threadId.trim();
  const safeUserId = userId?.trim();
  if (safeUserId) {
    return `${DRAFT_STORAGE_PREFIX}u:${safeUserId}:reply:${safeThreadId}`;
  }
  return `${DRAFT_STORAGE_PREFIX}reply:${safeThreadId}`;
}

export function isDraftExpired(
  updatedAt: number,
  nowMs: number = Date.now(),
  maxAgeMs: number = DRAFT_MAX_AGE_MS
): boolean {
  if (
    !Number.isFinite(updatedAt) ||
    updatedAt <= 0 ||
    updatedAt > MAX_VALID_DATE_MS
  ) {
    return true;
  }
  if (!Number.isFinite(nowMs) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    return true;
  }
  if (updatedAt - nowMs > DRAFT_MAX_FUTURE_SKEW_MS) {
    return true;
  }
  return nowMs - updatedAt > maxAgeMs;
}

export function serializeDraft<T>(
  data: T,
  nowMs: number = Date.now()
): string {
  const envelope: StoredDraftEnvelope<T> = {
    version: 1,
    updatedAt: nowMs,
    data,
  };
  return JSON.stringify(envelope);
}

export function parseStoredDraft<T>(
  raw: string | null | undefined,
  nowMs: number = Date.now(),
  maxAgeMs: number = DRAFT_MAX_AGE_MS
): StoredDraftEnvelope<T> | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredDraftEnvelope<T>> | null;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      parsed.version !== 1 ||
      typeof parsed.updatedAt !== "number" ||
      parsed.data === undefined ||
      parsed.data === null
    ) {
      return null;
    }
    if (isDraftExpired(parsed.updatedAt, nowMs, maxAgeMs)) {
      return null;
    }
    return {
      version: 1,
      updatedAt: parsed.updatedAt,
      data: parsed.data as T,
    };
  } catch {
    return null;
  }
}

export function pruneExpiredDraftsInStorage(
  storage: Pick<Storage, "length" | "key" | "getItem" | "removeItem">,
  nowMs: number = Date.now(),
  maxAgeMs: number = DRAFT_MAX_AGE_MS
): number {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (!k || !k.startsWith(DRAFT_STORAGE_PREFIX)) continue;
    const raw = storage.getItem(k);
    if (!parseStoredDraft(raw, nowMs, maxAgeMs)) {
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) {
    storage.removeItem(k);
  }
  return keysToRemove.length;
}

export function clearAllDraftsInStorage(
  storage: Pick<Storage, "length" | "key" | "removeItem">
): number {
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k && k.startsWith(DRAFT_STORAGE_PREFIX)) {
      keysToRemove.push(k);
    }
  }
  for (const k of keysToRemove) {
    storage.removeItem(k);
  }
  return keysToRemove.length;
}
