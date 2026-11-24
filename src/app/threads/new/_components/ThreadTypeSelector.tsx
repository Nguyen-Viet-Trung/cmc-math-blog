"use client";

import { Field, FieldLabel } from "@/components/ui/field";
import type { ThreadType } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ThreadTypeOption } from "./new-thread-config";

interface ThreadTypeSelectorProps {
  options: ThreadTypeOption[];
  value: ThreadType;
  isAdmin: boolean;
  onChange: (next: ThreadType) => void;
}

export function ThreadTypeSelector({
  options,
  value,
  isAdmin,
  onChange,
}: ThreadTypeSelectorProps) {
  return (
    <Field>
      <FieldLabel>Loại bài viết</FieldLabel>
      <div
        role="group"
        aria-label="Chọn loại bài viết"
        className={cn(
          "grid grid-cols-1 gap-2",
          isAdmin ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"
        )}
      >
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
                active
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              />
              <span className="min-w-0">
                <span className="block text-xs font-semibold text-foreground">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                  {opt.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </Field>
  );
}
