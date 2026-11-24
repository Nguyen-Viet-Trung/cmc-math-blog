"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Medal, Plus } from "lucide-react";
import {
  deleteCampaignAction,
  deleteCampaignAwardAction,
  removeThreadFromCampaignAction,
} from "@/app/actions/campaigns";
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
import type {
  AdminCampaignItem,
  AdminCampaignsPayload,
} from "@/lib/campaign-service";
import type { CampaignAwardItem } from "@/lib/types";
import { AdminCampaignCard } from "./AdminCampaignCard";
import type { AdminNotice } from "./AdminRewardsTab";

const CampaignFormDrawer = dynamic(
  () =>
    import("./modals/CampaignFormDrawer").then((m) => m.CampaignFormDrawer),
  { ssr: false }
);
const CampaignAwardDrawer = dynamic(
  () =>
    import("./modals/CampaignAwardDrawer").then((m) => m.CampaignAwardDrawer),
  { ssr: false }
);
const CampaignAttachThreadDialog = dynamic(
  () =>
    import("./modals/CampaignAttachThreadDialog").then(
      (m) => m.CampaignAttachThreadDialog
    ),
  { ssr: false }
);
const CampaignGrantsDialog = dynamic(
  () =>
    import("./modals/CampaignGrantsDialog").then((m) => m.CampaignGrantsDialog),
  { ssr: false }
);
const ConfirmDialog = dynamic(
  () => import("@/components/ConfirmDialog").then((m) => m.ConfirmDialog),
  { ssr: false }
);

export function AdminCampaignsTab({
  onNotice,
  autoOpenCreate = false,
  onConsumedAutoOpen,
}: {
  onNotice: (notice: AdminNotice | null) => void;
  autoOpenCreate?: boolean;
  onConsumedAutoOpen?: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<AdminCampaignItem | null>(null);
  const [awardDrawerState, setAwardDrawerState] = useState<{
    campaignId: string;
    campaignTitle: string;
    editing: CampaignAwardItem | null;
  } | null>(null);
  const [attachCampaignId, setAttachCampaignId] = useState<string | null>(null);
  const [grantsCampaignId, setGrantsCampaignId] = useState<string | null>(null);
  const [deleteCampaignTarget, setDeleteCampaignTarget] =
    useState<AdminCampaignItem | null>(null);
  const [deleteAwardTarget, setDeleteAwardTarget] =
    useState<CampaignAwardItem | null>(null);

  useEffect(() => {
    if (!autoOpenCreate) return;
    setEditingCampaign(null);
    setFormOpen(true);
    onConsumedAutoOpen?.();
  }, [autoOpenCreate, onConsumedAutoOpen]);

  const query = useQuery<AdminCampaignsPayload>({
    queryKey: ["admin-list", "campaigns"],
    staleTime: 20_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/list?resource=campaigns", {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Không thể tải dữ liệu Giải đấu & Huy hiệu.");
      }
      return (await res.json()) as AdminCampaignsPayload;
    },
  });

  const campaigns = query.data?.campaigns ?? [];
  const shopRewards = query.data?.shopRewards ?? [];
  const selectableThreads = query.data?.selectableThreads ?? [];
  const selectableStudents = query.data?.selectableStudents ?? [];
  const loading = query.isLoading && !query.data;

  const attachTarget =
    campaigns.find((c) => c.id === attachCampaignId) ?? null;
  const grantsTarget =
    campaigns.find((c) => c.id === grantsCampaignId) ?? null;

  const refreshAll = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["admin-list", "campaigns"],
    });
    router.refresh();
  }, [queryClient, router]);

  const handleEditCampaign = useCallback((camp: AdminCampaignItem) => {
    setEditingCampaign(camp);
    setFormOpen(true);
  }, []);

  const handleAddAward = useCallback((camp: AdminCampaignItem) => {
    setAwardDrawerState({
      campaignId: camp.id,
      campaignTitle: camp.title,
      editing: null,
    });
  }, []);

  const handleEditAward = useCallback(
    (camp: AdminCampaignItem, award: CampaignAwardItem) => {
      setAwardDrawerState({
        campaignId: camp.id,
        campaignTitle: camp.title,
        editing: award,
      });
    },
    []
  );

  const handleDetachThread = useCallback(
    async (campaignId: string, threadId: string) => {
      setBusyId(`rm:${campaignId}:${threadId}`);
      try {
        const res = await removeThreadFromCampaignAction({
          campaignId,
          threadId,
        });
        if (!res.ok) {
          onNotice({
            type: "error",
            text: res.error || "Không thể gỡ bài khỏi giải đấu.",
          });
          return;
        }
        onNotice({ type: "success", text: "Đã gỡ bài khỏi giải đấu." });
        await refreshAll();
      } catch {
        onNotice({
          type: "error",
          text: "Không thể kết nối máy chủ khi gỡ bài viết.",
        });
      } finally {
        setBusyId(null);
      }
    },
    [onNotice, refreshAll]
  );

  async function handleConfirmDeleteCampaign() {
    if (!deleteCampaignTarget || busyId) return;
    setBusyId(deleteCampaignTarget.id);
    try {
      const res = await deleteCampaignAction(deleteCampaignTarget.id);
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể xóa giải đấu.",
        });
        return;
      }
      setDeleteCampaignTarget(null);
      onNotice({ type: "success", text: "Đã xóa giải đấu." });
      await refreshAll();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa giải đấu.",
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmDeleteAward() {
    if (!deleteAwardTarget || busyId) return;
    setBusyId(deleteAwardTarget.id);
    try {
      const res = await deleteCampaignAwardAction(deleteAwardTarget.id);
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể xóa Award.",
        });
        return;
      }
      setDeleteAwardTarget(null);
      onNotice({ type: "success", text: "Đã xóa mốc Award & Huy hiệu." });
      await refreshAll();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi xóa Award.",
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-muted-foreground">
          {campaigns.length} giải đấu Toán học
        </span>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setEditingCampaign(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          Tạo Giải đấu mới
        </Button>
      </div>

      {loading ? (
        <Card className="space-y-3 p-5">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </Card>
      ) : query.isError ? (
        <Card className="space-y-3 p-6 text-sm text-destructive">
          <p>Không thể tải danh sách Giải đấu. Vui lòng thử lại.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void query.refetch()}
          >
            Thử tải lại
          </Button>
        </Card>
      ) : campaigns.length === 0 ? (
        <Empty className="py-10">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Medal aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Chưa có Giải đấu (Campaign) nào</EmptyTitle>
            <EmptyDescription>
              Tạo giải đấu đầu tiên với ngày bắt đầu/kết thúc, gắn các bài thử
              thách và thiết kế Award (điểm thưởng, quà Shop) + Huy hiệu tự động
              cho học sinh.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setEditingCampaign(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo Giải đấu đầu tiên
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-4">
          {campaigns.map((camp) => (
            <AdminCampaignCard
              key={camp.id}
              camp={camp}
              busyId={busyId}
              onEditCampaign={handleEditCampaign}
              onDeleteCampaign={setDeleteCampaignTarget}
              onAttachThread={setAttachCampaignId}
              onDetachThread={handleDetachThread}
              onAddAward={handleAddAward}
              onEditAward={handleEditAward}
              onDeleteAward={setDeleteAwardTarget}
              onOpenGrants={setGrantsCampaignId}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <CampaignFormDrawer
          open={formOpen}
          editing={editingCampaign}
          onOpenChange={setFormOpen}
          onSaved={refreshAll}
          onNotice={onNotice}
        />
      )}

      {awardDrawerState && (
        <CampaignAwardDrawer
          open
          campaignId={awardDrawerState.campaignId}
          campaignTitle={awardDrawerState.campaignTitle}
          editing={awardDrawerState.editing}
          shopRewards={shopRewards}
          onOpenChange={(open) => {
            if (!open) setAwardDrawerState(null);
          }}
          onSaved={refreshAll}
          onNotice={onNotice}
        />
      )}

      {attachTarget && (
        <CampaignAttachThreadDialog
          key={attachTarget.id}
          campaign={attachTarget}
          selectableThreads={selectableThreads}
          onClose={() => setAttachCampaignId(null)}
          onSaved={refreshAll}
          onNotice={onNotice}
        />
      )}

      {grantsTarget && (
        <CampaignGrantsDialog
          key={grantsTarget.id}
          campaign={grantsTarget}
          selectableStudents={selectableStudents}
          onClose={() => setGrantsCampaignId(null)}
          onSaved={refreshAll}
          onNotice={onNotice}
        />
      )}

      {deleteCampaignTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteCampaignTarget(null);
          }}
          title="Xóa Giải đấu này?"
          description={
            deleteCampaignTarget.totalGrantsCount > 0
              ? `Giải đấu "${deleteCampaignTarget.title}" đã có ${deleteCampaignTarget.totalGrantsCount} lượt trao Huy hiệu. Xóa giải đấu sẽ gỡ các Huy hiệu đó khỏi hồ sơ học sinh (điểm thưởng đã cộng vẫn giữ nguyên).`
              : `Giải đấu "${deleteCampaignTarget.title}" cùng các mốc Award gắn kèm sẽ bị xóa vĩnh viễn.`
          }
          confirmLabel="Xóa giải đấu"
          confirmVariant="destructive"
          isLoading={busyId === deleteCampaignTarget.id}
          onConfirm={handleConfirmDeleteCampaign}
        />
      )}

      {deleteAwardTarget && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setDeleteAwardTarget(null);
          }}
          title="Xóa mốc Award & Huy hiệu?"
          description={
            deleteAwardTarget.grantedCount > 0
              ? `Cảnh báo: ${deleteAwardTarget.grantedCount} học sinh đã đạt mốc "${deleteAwardTarget.title}" (Huy hiệu ${deleteAwardTarget.badgeName}). Xóa mốc này sẽ gỡ Huy hiệu và trạng thái quà tặng khỏi hồ sơ của họ (điểm thưởng đã cộng vẫn giữ nguyên).`
              : `Mốc "${deleteAwardTarget.title}" (Huy hiệu ${deleteAwardTarget.badgeName}) sẽ bị xóa khỏi giải đấu.`
          }
          confirmLabel="Xóa Award"
          confirmVariant="destructive"
          isLoading={busyId === deleteAwardTarget.id}
          onConfirm={handleConfirmDeleteAward}
        />
      )}
    </div>
  );
}
