"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separatorBefore?: boolean;
  active?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  triggerLabel?: string;
  align?: "left" | "right";
  disabled?: boolean;
}

/**
 * Toggle popup menu gọn nhẹ dùng Portal để không bao giờ bị cắt (clip) bởi `overflow-x-auto` của bảng.
 * Hỗ trợ đóng khi bấm ngoài, bấm Escape, hoặc cuộn/thay đổi kích thước cửa sổ.
 */
export function ActionMenu({
  items,
  triggerLabel = "Mở thao tác khác",
  align = "right",
  disabled = false,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function updatePosition() {
      const btn = triggerRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const menuWidth = 208;
      const estimatedHeight = Math.min(340, items.length * 36 + 16);
      const spaceBelow = window.innerHeight - rect.bottom;
      const top =
        spaceBelow < estimatedHeight && rect.top > estimatedHeight
          ? Math.max(8, rect.top - estimatedHeight - 4)
          : Math.min(window.innerHeight - 16, rect.bottom + 4);
      const rawLeft = align === "right" ? rect.right - menuWidth : rect.left;
      const left = Math.max(
        8,
        Math.min(window.innerWidth - menuWidth - 8, rawLeft)
      );
      setPos({ top, left });
    }

    updatePosition();

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    function handleScrollOrResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [open, align, items.length]);

  if (items.length === 0) return null;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        aria-label={triggerLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        title={triggerLabel}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-8 w-8 text-muted-foreground hover:text-foreground",
          open && "bg-muted text-foreground"
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
      </Button>

      {open &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ top: pos.top, left: pos.left }}
            className="fixed z-50 w-52 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95 duration-100"
          >
            {items.map((item) => (
              <div key={item.id}>
                {item.separatorBefore && (
                  <div className="my-1 h-px bg-border" role="separator" />
                )}
                <button
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    setOpen(false);
                    item.onSelect();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
                    item.variant === "destructive"
                      ? "text-destructive hover:bg-destructive/10"
                      : item.active
                        ? "bg-muted font-semibold text-foreground"
                        : "text-foreground hover:bg-muted/80"
                  )}
                >
                  {item.icon && (
                    <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center opacity-80">
                      {item.icon}
                    </span>
                  )}
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.active && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}
