"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookmarkX, Loader2 } from "lucide-react";
import { toggleBookmarkAction } from "@/app/actions/collections";
import { Button } from "@/components/ui/button";

export function BookmarkRemoveButton({ threadId }: { threadId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    setBusy(true);
    try {
      const res = await toggleBookmarkAction(threadId);
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      disabled={busy}
      onClick={() => void handleRemove()}
      className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
      title="Bỏ khỏi sổ tay"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <BookmarkX className="h-3.5 w-3.5" />
      )}
      Gỡ
    </Button>
  );
}
