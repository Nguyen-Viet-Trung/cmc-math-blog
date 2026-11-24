"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildNewThreadDraftKey,
  buildReplyDraftKey,
  clearAllDraftsInStorage,
  DRAFT_DEBOUNCE_MS,
  DRAFT_MAX_AGE_MS,
  isDraftExpired,
  NEW_THREAD_DRAFT_KEY,
  parseStoredDraft,
  pruneExpiredDraftsInStorage,
  serializeDraft,
} from "@/lib/math-draft";

export {
  buildNewThreadDraftKey,
  buildReplyDraftKey,
  clearAllDraftsInStorage,
  DRAFT_DEBOUNCE_MS,
  DRAFT_MAX_AGE_MS,
  isDraftExpired,
  NEW_THREAD_DRAFT_KEY,
  parseStoredDraft,
  pruneExpiredDraftsInStorage,
  serializeDraft,
};

export interface UseMathDraftOptions<T> {
  storageKey: string;
  value: T;
  enabled?: boolean;
  debounceMs?: number;
  isEmpty: (value: T) => boolean;
  onRestore: (data: T) => void;
}

export interface UseMathDraftResult {
  restoredAt: number | null;
  hasSavedDraft: boolean;
  dismissRestoredNotice: () => void;
  clearDraft: () => void;
}

function safeStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function useMathDraft<T>({
  storageKey,
  value,
  enabled = true,
  debounceMs = DRAFT_DEBOUNCE_MS,
  isEmpty,
  onRestore,
}: UseMathDraftOptions<T>): UseMathDraftResult {
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  const hydratedKeyRef = useRef<string | null>(null);
  const lastPersistedRef = useRef<string | null>(null);
  const pendingRestoreRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const isEmptyRef = useRef(isEmpty);
  const onRestoreRef = useRef(onRestore);

  isEmptyRef.current = isEmpty;
  onRestoreRef.current = onRestore;

  const cancelPendingSave = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Khôi phục bản nháp từ localStorage sau khi mount (không gây hydration mismatch)
  useEffect(() => {
    if (!enabled || !storageKey || typeof window === "undefined") {
      hydratedKeyRef.current = null;
      lastPersistedRef.current = null;
      pendingRestoreRef.current = false;
      setRestoredAt(null);
      setHasSavedDraft(false);
      return;
    }

    try {
      pruneExpiredDraftsInStorage(window.localStorage);
      const raw = window.localStorage.getItem(storageKey);
      const parsed = parseStoredDraft<T>(raw);

      if (raw && !parsed) {
        window.localStorage.removeItem(storageKey);
      }

      if (parsed && !isEmptyRef.current(parsed.data)) {
        lastPersistedRef.current = safeStringify(parsed.data);
        pendingRestoreRef.current = true;
        onRestoreRef.current(parsed.data);
        setRestoredAt(parsed.updatedAt);
        setHasSavedDraft(true);
      } else {
        lastPersistedRef.current = null;
        pendingRestoreRef.current = false;
        setRestoredAt(null);
        setHasSavedDraft(false);
      }
    } catch {
      // localStorage có thể bị chặn ở chế độ duyệt web riêng tư
      lastPersistedRef.current = null;
      pendingRestoreRef.current = false;
    } finally {
      hydratedKeyRef.current = storageKey;
    }

    return () => {
      cancelPendingSave();
    };
  }, [storageKey, enabled, cancelPendingSave]);

  // Tự động lưu bản nháp với debounce (~800ms), bỏ qua khi dữ liệu trùng bản đã lưu hoặc rỗng từ đầu
  useEffect(() => {
    if (
      !enabled ||
      !storageKey ||
      typeof window === "undefined" ||
      hydratedKeyRef.current !== storageKey
    ) {
      return;
    }

    if (pendingRestoreRef.current) {
      pendingRestoreRef.current = false;
      return;
    }

    const empty = isEmptyRef.current(value);
    if (empty) {
      cancelPendingSave();
      if (lastPersistedRef.current === null) {
        return;
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        try {
          window.localStorage.removeItem(storageKey);
        } catch {
          // Bỏ qua lỗi quota / private mode
        }
        lastPersistedRef.current = null;
        setHasSavedDraft(false);
      }, debounceMs);
      return cancelPendingSave;
    }

    const serialized = safeStringify(value);
    if (serialized !== null && serialized === lastPersistedRef.current) {
      return;
    }

    cancelPendingSave();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      try {
        window.localStorage.setItem(storageKey, serializeDraft(value));
        lastPersistedRef.current = serialized;
        setHasSavedDraft(true);
      } catch {
        // Bỏ qua lỗi quota / private mode
      }
    }, debounceMs);

    return cancelPendingSave;
  }, [storageKey, value, enabled, debounceMs, cancelPendingSave]);

  const clearDraft = useCallback(() => {
    cancelPendingSave();
    pendingRestoreRef.current = false;
    lastPersistedRef.current = null;
    try {
      if (typeof window !== "undefined" && storageKey) {
        window.localStorage.removeItem(storageKey);
      }
    } catch {
      // ignore storage errors
    }
    setRestoredAt(null);
    setHasSavedDraft(false);
  }, [storageKey, cancelPendingSave]);

  const dismissRestoredNotice = useCallback(() => {
    setRestoredAt(null);
  }, []);

  return {
    restoredAt,
    hasSavedDraft,
    dismissRestoredNotice,
    clearDraft,
  };
}
