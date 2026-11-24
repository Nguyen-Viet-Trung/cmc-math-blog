"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function MathImageLightbox({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-5xl border-border bg-card p-2 sm:p-3">
        <DialogTitle className="sr-only">Xem ảnh phóng to</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Ảnh phóng to"
          className="mx-auto block max-h-[86vh] max-w-full rounded-lg bg-white object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}
