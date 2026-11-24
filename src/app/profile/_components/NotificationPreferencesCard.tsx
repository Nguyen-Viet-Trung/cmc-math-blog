"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { updateNotificationPrefsAction } from "@/app/actions/profile";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  NOTIFICATION_PREF_META,
  normalizeNotificationPrefs,
  type NotificationPrefKey,
  type NotificationPrefs,
} from "@/lib/notification-prefs";
import { cn } from "@/lib/utils";

interface NotificationPreferencesCardProps {
  initialPrefs?: Partial<NotificationPrefs>;
}

export function NotificationPreferencesCard({
  initialPrefs,
}: NotificationPreferencesCardProps) {
  const [savedPrefs, setSavedPrefs] = useState<NotificationPrefs>(() =>
    normalizeNotificationPrefs(initialPrefs)
  );
  const [prefs, setPrefs] = useState<NotificationPrefs>(() =>
    normalizeNotificationPrefs(initialPrefs)
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDirty = NOTIFICATION_PREF_META.some(
    (item) => prefs[item.key] !== savedPrefs[item.key]
  );

  function togglePref(key: NotificationPrefKey) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    setMessage(null);
    setError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const res = await updateNotificationPrefsAction(prefs);
      if (!res.ok) {
        setError(res.error || "Không thể lưu cài đặt thông báo.");
        return;
      }
      const next = res.prefs ?? prefs;
      setSavedPrefs(next);
      setPrefs(next);
      setMessage("Đã lưu tùy chọn thông báo thành công!");
    } catch {
      setError("Không thể kết nối máy chủ khi lưu cài đặt thông báo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <h2 className="heading-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" aria-hidden="true" />
            Tùy chọn thông báo
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Chọn nhóm thông báo bạn muốn nhận trong chuông thông báo. Các thông
            báo trùng nhau chưa đọc trong vòng 15 phút sẽ được tự động gộp gọn.
          </p>
        </div>

        <Separator />

        <div className="divide-y divide-border rounded-lg border border-border bg-background/50">
          {NOTIFICATION_PREF_META.map((item) => {
            const enabled = prefs[item.key];
            const labelId = `notif-pref-label-${item.key}`;
            const descId = `notif-pref-desc-${item.key}`;

            return (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="min-w-0">
                  <p
                    id={labelId}
                    className="text-sm font-medium text-foreground"
                  >
                    {item.label}
                  </p>
                  <p
                    id={descId}
                    className="mt-0.5 text-xs leading-relaxed text-muted-foreground"
                  >
                    {item.description}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  aria-labelledby={labelId}
                  aria-describedby={descId}
                  onClick={() => togglePref(item.key)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    enabled
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/70 bg-muted"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm transition-transform",
                      enabled
                        ? "translate-x-4 bg-primary-foreground"
                        : "translate-x-0.5 bg-muted-foreground"
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Lưu ý: Thông báo hệ thống và cập nhật đơn đổi quà luôn được gửi để bạn
          không bỏ lỡ thông tin quan trọng.
        </p>

        {error && (
          <Alert variant="destructive" className="text-xs font-semibold">
            {error}
          </Alert>
        )}
        {message && (
          <Alert variant="success" className="text-xs font-semibold">
            {message}
          </Alert>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={saving || !isDirty}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-4 w-4" aria-hidden="true" />
            )}
            Lưu cài đặt thông báo
          </Button>
        </div>
      </form>
    </Card>
  );
}
