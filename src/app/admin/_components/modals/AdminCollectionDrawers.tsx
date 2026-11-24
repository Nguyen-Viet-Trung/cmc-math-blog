"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Save, Search } from "lucide-react";
import {
  addThreadToCollectionAction,
  upsertCollectionAction,
} from "@/app/actions/collections";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCollectionWithThreads } from "@/lib/collection-service";
import type { AdminThreadManageItem } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

const COLOR_OPTIONS = [
  { value: "blue", label: "Xanh dương" },
  { value: "indigo", label: "Chàm" },
  { value: "emerald", label: "Xanh lá" },
  { value: "amber", label: "Vàng hổ phách" },
  { value: "rose", label: "Đỏ hồng" },
];

export function CollectionFormDrawer({
  open,
  editingCollection,
  onOpenChange,
  onSaved,
  onNotice,
}: {
  open: boolean;
  editingCollection: AdminCollectionWithThreads | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: AdminNotice | null) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("blue");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    if (editingCollection) {
      setTitle(editingCollection.title);
      setSlug(editingCollection.slug);
      setDescription(editingCollection.description);
      setCoverColor(editingCollection.coverColor);
      setIsPublished(editingCollection.isPublished);
    } else {
      setTitle("");
      setSlug("");
      setDescription("");
      setCoverColor("blue");
      setIsPublished(true);
    }
  }, [open, editingCollection]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    onNotice(null);
    try {
      const res = await upsertCollectionAction({
        id: editingCollection?.id,
        title,
        slug: slug || undefined,
        description,
        coverColor,
        isPublished,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể lưu bộ sưu tập chuyên đề.",
        });
        return;
      }
      onOpenChange(false);
      onNotice({
        type: "success",
        text: editingCollection
          ? "Đã cập nhật Bộ sưu tập Chuyên đề!"
          : "Đã tạo Bộ sưu tập Chuyên đề mới!",
      });
      await onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <SheetContent side="right" className="overflow-y-auto p-6">
        <div className="mb-5 pr-8">
          <SheetTitle className="text-base font-bold">
            {editingCollection ? "Chỉnh sửa Chuyên đề" : "Tạo Chuyên đề mới"}
          </SheetTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Gom nhóm các bài toán, chuyên đề Research và đề ôn luyện thành lộ
            trình học tập.
          </p>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-1 flex-col"
        >
          <FieldGroup className="gap-3.5">
            <Field>
              <FieldLabel htmlFor="drawer-col-title">Tên chuyên đề</FieldLabel>
              <Input
                id="drawer-col-title"
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chuỗi 10 bài Bất đẳng thức Cauchy-Schwarz"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="drawer-col-slug">
                Đường dẫn (slug — để trống tự tạo)
              </FieldLabel>
              <Input
                id="drawer-col-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="vd: bat-dang-thuc-cauchy-schwarz"
                className="font-mono text-xs"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="drawer-col-desc">
                Mô tả lộ trình ôn tập
              </FieldLabel>
              <Textarea
                id="drawer-col-desc"
                rows={3}
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt mục tiêu, đối tượng khối lớp và phương pháp trọng tâm..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="drawer-col-color">Màu nhấn</FieldLabel>
                <NativeSelect
                  id="drawer-col-color"
                  value={coverColor}
                  onChange={(e) => setCoverColor(e.target.value)}
                  className="text-xs"
                >
                  {COLOR_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <div className="flex items-end pb-1">
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  Công khai ngay
                </label>
              </div>
            </div>
          </FieldGroup>

          <div className="mt-auto flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : editingCollection ? (
                <Save className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {editingCollection ? "Lưu thay đổi" : "Tạo Chuyên đề"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CollectionAttachThreadDialog({
  collection,
  onClose,
  onAttached,
  onNotice,
}: {
  collection: AdminCollectionWithThreads | null;
  onClose: () => void;
  onAttached: () => Promise<void>;
  onNotice: (notice: AdminNotice | null) => void;
}) {
  const [threadSearch, setThreadSearch] = useState("");
  const [threadResults, setThreadResults] = useState<AdminThreadManageItem[]>(
    []
  );
  const [searching, setSearching] = useState(false);
  const [itemNote, setItemNote] = useState("");
  const [busyThreadId, setBusyThreadId] = useState<string | null>(null);

  const searchThreads = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const sp = new URLSearchParams({
        resource: "threads",
        page: "1",
        pageSize: "10",
      });
      if (query.trim()) sp.set("q", query.trim());
      const res = await fetch(`/api/admin/list?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { items?: AdminThreadManageItem[] };
      setThreadResults(json.items ?? []);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!collection) return;
    setThreadSearch("");
    setItemNote("");
    void searchThreads("");
  }, [collection, searchThreads]);

  async function handleAttach(threadId: string) {
    if (!collection || busyThreadId) return;
    setBusyThreadId(threadId);
    try {
      const res = await addThreadToCollectionAction({
        collectionId: collection.id,
        threadId,
        sortOrder: collection.threads.length + 1,
        note: itemNote,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể gắn bài viết." });
        return;
      }
      setItemNote("");
      onNotice({ type: "success", text: "Đã thêm bài viết vào chuyên đề!" });
      await onAttached();
    } finally {
      setBusyThreadId(null);
    }
  }

  const attachedIds = new Set(collection?.threads.map((t) => t.id) ?? []);

  return (
    <Dialog open={Boolean(collection)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <div className="space-y-1 pr-6">
          <DialogTitle>Gắn bài viết vào chuyên đề</DialogTitle>
          <DialogDescription>
            {collection?.title} ({collection?.threads.length ?? 0} bài hiện có)
          </DialogDescription>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={threadSearch}
                onChange={(e) => setThreadSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void searchThreads(threadSearch);
                  }
                }}
                placeholder="Tìm tiêu đề bài viết..."
                className="h-9 pl-8 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={searching}
              onClick={() => void searchThreads(threadSearch)}
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Tìm"
              )}
            </Button>
          </div>

          <Input
            value={itemNote}
            onChange={(e) => setItemNote(e.target.value)}
            placeholder="Ghi chú lộ trình tùy chọn cho bài sắp thêm..."
            className="h-8 text-xs"
          />

          <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-muted/15">
            {searching && threadResults.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Đang tìm bài viết...
              </p>
            ) : threadResults.length === 0 ? (
              <p className="p-6 text-center text-xs text-muted-foreground">
                Không tìm thấy bài viết phù hợp.
              </p>
            ) : (
              threadResults.map((t) => {
                const alreadyIn = attachedIds.has(t.id);
                return (
                  <div
                    key={t.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">
                        {t.title}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {t.categoryName} · {t.authorName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={alreadyIn ? "secondary" : "outline"}
                      disabled={alreadyIn || busyThreadId === t.id}
                      onClick={() => void handleAttach(t.id)}
                      className="h-7 shrink-0 px-2.5 text-[11px]"
                    >
                      {busyThreadId === t.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : alreadyIn ? (
                        "Đã có"
                      ) : (
                        "+ Thêm"
                      )}
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
