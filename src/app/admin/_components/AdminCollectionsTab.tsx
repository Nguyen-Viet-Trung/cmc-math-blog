"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  deleteCollectionAction,
  removeThreadFromCollectionAction,
} from "@/app/actions/collections";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ActionMenu } from "@/components/ui/action-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { AdminCollectionWithThreads } from "@/lib/collection-service";
import type { AdminNotice } from "./AdminRewardsTab";
import {
  CollectionAttachThreadDialog,
  CollectionFormDrawer,
} from "./modals/AdminCollectionDrawers";

export function AdminCollectionsTab({
  onNotice,
}: {
  onNotice: (notice: AdminNotice | null) => void;
}) {
  const router = useRouter();
  const [collections, setCollections] = useState<AdminCollectionWithThreads[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCollection, setEditingCollection] =
    useState<AdminCollectionWithThreads | null>(null);
  const [attachTargetId, setAttachTargetId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminCollectionWithThreads | null>(null);

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

  const attachTarget =
    collections.find((c) => c.id === attachTargetId) ?? null;

  async function refreshAll() {
    await fetchCollections();
    router.refresh();
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await deleteCollectionAction(deleteTarget.id);
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể xóa chuyên đề.",
        });
        return;
      }
      if (attachTargetId === deleteTarget.id) setAttachTargetId(null);
      setDeleteTarget(null);
      onNotice({ type: "success", text: "Đã xóa bộ sưu tập chuyên đề." });
      await refreshAll();
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
        onNotice({
          type: "error",
          text: res.error || "Không thể gỡ bài viết.",
        });
        return;
      }
      onNotice({ type: "success", text: "Đã gỡ bài viết khỏi chuyên đề." });
      await refreshAll();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {collections.length} bộ sưu tập chuyên đề
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingCollection(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo chuyên đề
        </Button>
      </div>

      {loading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </Card>
      ) : collections.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Layers aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Chưa có bộ sưu tập chuyên đề nào</EmptyTitle>
            <EmptyDescription>
              Tạo bộ sưu tập đầu tiên để gom bài toán hay thành lộ trình ôn tập
              theo chủ đề.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingCollection(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo chuyên đề đầu tiên
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {collections.map((col) => (
            <Card key={col.id} className="space-y-3 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground sm:text-base">
                      {col.title}
                    </h3>
                    <Badge
                      variant={col.isPublished ? "success" : "outline"}
                      className="text-[10px]"
                    >
                      {col.isPublished ? "Công khai" : "Bản nháp"}
                    </Badge>
                    <Badge variant="subtle" className="text-[10px] tabular-nums">
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

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setAttachTargetId(col.id)}
                    className="h-7 px-2.5 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Gắn bài
                  </Button>
                  <ActionMenu
                    triggerLabel={`Thao tác cho ${col.title}`}
                    items={[
                      {
                        id: "view",
                        label: "Xem trang chuyên đề",
                        icon: <ExternalLink className="h-3.5 w-3.5" />,
                        onSelect: () => {
                          window.open(`/collections/${col.slug}`, "_blank");
                        },
                      },
                      {
                        id: "edit",
                        label: "Chỉnh sửa thông tin",
                        icon: <Pencil className="h-3.5 w-3.5" />,
                        onSelect: () => {
                          setEditingCollection(col);
                          setFormOpen(true);
                          onNotice(null);
                        },
                      },
                      {
                        id: "delete",
                        label: "Xóa chuyên đề",
                        icon: <Trash2 className="h-3.5 w-3.5" />,
                        variant: "destructive",
                        separatorBefore: true,
                        onSelect: () => setDeleteTarget(col),
                      },
                    ]}
                  />
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
                          prefetch={false}
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
            </Card>
          ))}
        </div>
      )}

      <CollectionFormDrawer
        open={formOpen}
        editingCollection={editingCollection}
        onOpenChange={setFormOpen}
        onSaved={refreshAll}
        onNotice={onNotice}
      />

      <CollectionAttachThreadDialog
        collection={attachTarget}
        onClose={() => setAttachTargetId(null)}
        onAttached={refreshAll}
        onNotice={onNotice}
      />

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
