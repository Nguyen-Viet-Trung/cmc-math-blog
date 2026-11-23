"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  Layers,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  addThreadToCollectionAction,
  deleteCollectionAction,
  removeThreadFromCollectionAction,
  upsertCollectionAction,
} from "@/app/actions/collections";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { AdminCollectionWithThreads } from "@/lib/collection-service";
import type { AdminThreadManageItem } from "@/lib/types";
import type { AdminNotice } from "./AdminRewardsTab";

const COLOR_OPTIONS = [
  { value: "blue", label: "Xanh dương" },
  { value: "indigo", label: "Chàm" },
  { value: "emerald", label: "Xanh lá" },
  { value: "amber", label: "Vàng hổ phách" },
  { value: "rose", label: "Đỏ hồng" },
];

export function AdminCollectionsTab({
  onNotice,
}: {
  onNotice: (notice: AdminNotice | null) => void;
}) {
  const [collections, setCollections] = useState<AdminCollectionWithThreads[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminCollectionWithThreads | null>(null);

  // Form tạo / sửa bộ sưu tập
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverColor, setCoverColor] = useState("blue");
  const [isPublished, setIsPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tìm bài viết để gắn vào bộ sưu tập
  const [selectedColId, setSelectedColId] = useState<string | null>(null);
  const [threadSearch, setThreadSearch] = useState("");
  const [threadResults, setThreadResults] = useState<AdminThreadManageItem[]>(
    []
  );
  const [searchingThreads, setSearchingThreads] = useState(false);
  const [itemNote, setItemNote] = useState("");

  const fetchCollections = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/list?resource=collections", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as {
        collections?: AdminCollectionWithThreads[];
      };
      setCollections(json.collections ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCollections();
  }, [fetchCollections]);

  async function searchThreads(query: string) {
    setSearchingThreads(true);
    try {
      const sp = new URLSearchParams({
        resource: "threads",
        page: "1",
        pageSize: "8",
      });
      if (query.trim()) sp.set("q", query.trim());
      const res = await fetch(`/api/admin/list?${sp.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as { items?: AdminThreadManageItem[] };
      setThreadResults(json.items ?? []);
    } finally {
      setSearchingThreads(false);
    }
  }

  function resetForm() {
    setEditingId(undefined);
    setTitle("");
    setSlug("");
    setDescription("");
    setCoverColor("blue");
    setIsPublished(true);
  }

  function startEdit(col: AdminCollectionWithThreads) {
    setEditingId(col.id);
    setTitle(col.title);
    setSlug(col.slug);
    setDescription(col.description);
    setCoverColor(col.coverColor);
    setIsPublished(col.isPublished);
    onNotice(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    onNotice(null);
    try {
      const res = await upsertCollectionAction({
        id: editingId,
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
      onNotice({
        type: "success",
        text: editingId
          ? "Đã cập nhật Bộ sưu tập Chuyên đề!"
          : "Đã tạo Bộ sưu tập Chuyên đề mới!",
      });
      resetForm();
      await fetchCollections();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteCollectionAction(deleteTarget.id);
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể xóa chuyên đề." });
        return;
      }
      if (selectedColId === deleteTarget.id) setSelectedColId(null);
      setDeleteTarget(null);
      onNotice({ type: "success", text: "Đã xóa bộ sưu tập chuyên đề." });
      await fetchCollections();
    } finally {
      setBusyId(null);
    }
  }

  async function handleAttachThread(collectionId: string, threadId: string) {
    setBusyId(`${collectionId}:${threadId}`);
    try {
      const targetCol = collections.find((c) => c.id === collectionId);
      const nextOrder = (targetCol?.threads.length ?? 0) + 1;
      const res = await addThreadToCollectionAction({
        collectionId,
        threadId,
        sortOrder: nextOrder,
        note: itemNote,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể gắn bài viết." });
        return;
      }
      setItemNote("");
      onNotice({ type: "success", text: "Đã thêm bài viết vào chuyên đề!" });
      await fetchCollections();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDetachThread(collectionId: string, threadId: string) {
    setBusyId(`rm:${collectionId}:${threadId}`);
    try {
      const res = await removeThreadFromCollectionAction({
        collectionId,
        threadId,
      });
      if (!res.ok) {
        onNotice({ type: "error", text: res.error || "Không thể gỡ bài viết." });
        return;
      }
      onNotice({ type: "success", text: "Đã gỡ bài viết khỏi chuyên đề." });
      await fetchCollections();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card className="h-fit p-5">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="heading-3">
            {editingId ? "Chỉnh sửa Chuyên đề" : "Tạo Chuyên đề mới"}
          </h2>
          {editingId && (
            <Button type="button" size="sm" variant="ghost" onClick={resetForm}>
              <X className="h-3.5 w-3.5" />
              Hủy sửa
            </Button>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <FieldGroup className="gap-3.5">
            <Field>
              <FieldLabel htmlFor="col-title">Tên chuyên đề</FieldLabel>
              <Input
                id="col-title"
                required
                minLength={3}
                maxLength={120}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Chuỗi 10 bài Bất đẳng thức Cauchy-Schwarz"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="col-slug">
                Đường dẫn (slug — để trống tự tạo)
              </FieldLabel>
              <Input
                id="col-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="vd: bat-dang-thuc-cauchy-schwarz"
                className="font-mono text-xs"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="col-desc">Mô tả lộ trình ôn tập</FieldLabel>
              <Textarea
                id="col-desc"
                rows={3}
                maxLength={600}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tóm tắt mục tiêu, đối tượng khối lớp và phương pháp trọng tâm..."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="col-color">Màu nhấn</FieldLabel>
                <NativeSelect
                  id="col-color"
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

            <Button type="submit" disabled={saving} className="w-full" size="sm">
              {saving ? (
                <Spinner className="size-3.5" />
              ) : (
                <Plus className="size-3.5" aria-hidden="true" />
              )}
              {editingId ? "Lưu thay đổi" : "Tạo Chuyên đề"}
            </Button>
          </FieldGroup>
        </form>
      </Card>

      <div className="flex flex-col gap-4">
        {loading ? (
          <Card className="flex flex-col gap-3 p-5">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </Card>
        ) : collections.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Layers aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>Chưa có bộ sưu tập chuyên đề nào</EmptyTitle>
              <EmptyDescription>
                Hãy tạo bộ sưu tập đầu tiên ở cột bên trái để gom bài viết thành
                lộ trình ôn tập.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          collections.map((col) => {
            const isExpanded = selectedColId === col.id;
            const attachedIds = new Set(col.threads.map((t) => t.id));
            return (
              <Card key={col.id} className="space-y-3 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="heading-3">{col.title}</h3>
                      <Badge variant={col.isPublished ? "success" : "outline"}>
                        {col.isPublished ? "Công khai" : "Bản nháp"}
                      </Badge>
                      <Badge variant="subtle" className="tabular-nums">
                        {col.threads.length} bài
                      </Badge>
                    </div>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      /collections/{col.slug}
                    </p>
                    {col.description && (
                      <p className="text-xs text-muted-foreground">
                        {col.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={`/collections/${col.slug}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        Xem
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={isExpanded ? "default" : "outline"}
                      onClick={() => {
                        const next = isExpanded ? null : col.id;
                        setSelectedColId(next);
                        if (next && threadResults.length === 0) {
                          void searchThreads("");
                        }
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      {isExpanded ? "Đóng chọn bài" : "Gắn bài viết"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => startEdit(col)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteTarget(col)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {col.threads.length > 0 && (
                  <ul className="divide-y divide-border rounded-md border border-border bg-muted/20">
                    {col.threads.map((th, idx) => (
                      <li
                        key={th.id}
                        className="flex items-center justify-between gap-3 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="mr-2 font-mono text-muted-foreground">
                            #{idx + 1}
                          </span>
                          <Link
                            href={`/threads/${th.id}`}
                            className="font-medium text-foreground hover:text-primary"
                          >
                            {th.title}
                          </Link>
                          {th.note && (
                            <span className="ml-2 text-[11px] text-muted-foreground">
                              — {th.note}
                            </span>
                          )}
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={busyId === `rm:${col.id}:${th.id}`}
                          onClick={() => void handleDetachThread(col.id, th.id)}
                          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                        >
                          Gỡ
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                {isExpanded && (
                  <div className="space-y-3 rounded-md border border-primary/25 bg-accent/30 p-3.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="relative flex-1 min-w-[200px]">
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
                          placeholder="Tìm tiêu đề bài viết để thêm vào chuyên đề..."
                          className="h-8 bg-card pl-8 text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={searchingThreads}
                        onClick={() => void searchThreads(threadSearch)}
                      >
                        {searchingThreads ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Tìm bài"
                        )}
                      </Button>
                    </div>

                    <Input
                      value={itemNote}
                      onChange={(e) => setItemNote(e.target.value)}
                      placeholder="Ghi chú tùy chọn cho bài sắp thêm (VD: Bài mở đầu làm quen kỹ thuật)..."
                      className="h-8 bg-card text-xs"
                    />

                    <div className="max-h-56 divide-y divide-border overflow-y-auto rounded border border-border bg-card">
                      {threadResults.length === 0 ? (
                        <p className="p-3 text-center text-xs text-muted-foreground">
                          Không tìm thấy bài viết phù hợp.
                        </p>
                      ) : (
                        threadResults.map((t) => {
                          const alreadyIn = attachedIds.has(t.id);
                          return (
                            <div
                              key={t.id}
                              className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-foreground">
                                  {t.title}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {t.categoryName} · {t.authorName}
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={alreadyIn ? "secondary" : "outline"}
                                disabled={
                                  alreadyIn ||
                                  busyId === `${col.id}:${t.id}`
                                }
                                onClick={() =>
                                  void handleAttachThread(col.id, t.id)
                                }
                                className="h-7 shrink-0 text-[11px]"
                              >
                                {alreadyIn ? "Đã có" : "+ Thêm"}
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Xóa Bộ sưu tập Chuyên đề?"
        description="Bộ sưu tập sẽ bị xóa (các bài viết gốc trên diễn đàn vẫn được giữ nguyên)."
        confirmLabel="Xóa chuyên đề"
        confirmVariant="destructive"
        isLoading={Boolean(busyId)}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
