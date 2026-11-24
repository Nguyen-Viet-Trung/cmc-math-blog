"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { addThreadToCampaignAction } from "@/app/actions/campaigns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { AdminCampaignItem } from "@/lib/campaign-service";
import { getThreadTypeLabel } from "@/lib/format";
import type { ThreadType } from "@/lib/types";
import type { AdminNotice } from "../AdminRewardsTab";

export function CampaignAttachThreadDialog({
  campaign,
  selectableThreads,
  onClose,
  onSaved,
  onNotice,
}: {
  campaign: AdminCampaignItem;
  selectableThreads: {
    id: string;
    title: string;
    threadType: string;
    status: string;
    bountyPoints: number;
  }[];
  onClose: () => void;
  onSaved: () => Promise<void>;
  onNotice: (notice: AdminNotice) => void;
}) {
  const [selectedThreadId, setSelectedThreadId] = useState("");
  const [sortOrder, setSortOrder] = useState(
    String(campaign.threads.length + 1)
  );
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const available = useMemo(() => {
    const attached = new Set(campaign.threads.map((t) => t.threadId));
    return selectableThreads.filter((t) => !attached.has(t.id));
  }, [campaign.threads, selectableThreads]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedThreadId || saving) return;
    setSaving(true);
    try {
      const res = await addThreadToCampaignAction({
        campaignId: campaign.id,
        threadId: selectedThreadId,
        sortOrder: Number(sortOrder),
        note,
      });
      if (!res.ok) {
        onNotice({
          type: "error",
          text: res.error || "Không thể gắn thử thách vào giải đấu.",
        });
        return;
      }
      onClose();
      onNotice({
        type: "success",
        text: "Đã gắn bài thử thách vào giải đấu!",
      });
      await onSaved();
    } catch {
      onNotice({
        type: "error",
        text: "Không thể kết nối máy chủ khi gắn bài viết.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <div className="space-y-1 pr-6">
          <DialogTitle>Gắn bài Thử thách vào Giải đấu</DialogTitle>
          <DialogDescription>
            Giải đấu: {campaign.title}. Chỉ hiển thị bài Thử thách Tuần hoặc bài
            do Ban Quản Trị đăng để đảm bảo 100% lời giải do Admin phê duyệt.
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="camp-thread-pick">Chọn bài viết / Thử thách</Label>
            <NativeSelect
              id="camp-thread-pick"
              required
              value={selectedThreadId}
              onChange={(e) => setSelectedThreadId(e.target.value)}
            >
              <option value="">-- Chọn 1 bài toán để gắn vào giải đấu --</option>
              {available.map((t) => (
                <option key={t.id} value={t.id}>
                  [{getThreadTypeLabel(t.threadType as ThreadType)}] {t.title} (+
                  {t.bountyPoints}đ)
                </option>
              ))}
            </NativeSelect>
            {available.length === 0 && (
              <p className="text-[11px] text-muted-foreground">
                Chưa có thêm bài Thử thách Tuần hoặc bài Admin nào khả dụng. Hãy
                tạo bài Thử thách mới tại nút &ldquo;Đăng câu hỏi&rdquo;.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="camp-thread-order">Thứ tự</Label>
              <Input
                id="camp-thread-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="camp-thread-note">Ghi chú chặng (tùy chọn)</Label>
              <Input
                id="camp-thread-note"
                type="text"
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Vòng 1 — Bất đẳng thức"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={saving || !selectedThreadId}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Gắn vào giải đấu
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
