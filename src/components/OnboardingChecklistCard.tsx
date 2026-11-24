"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import { updateOnboardingStateAction } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { MAX_FAVORITE_CATEGORIES } from "@/lib/onboarding";
import type { Category, OnboardingProgress } from "@/lib/types";
import { cn } from "@/lib/utils";

interface OnboardingChecklistCardProps {
  initialProgress: OnboardingProgress;
  categories: Category[];
}

export function OnboardingChecklistCard({
  initialProgress,
  categories,
}: OnboardingChecklistCardProps) {
  const [dismissed, setDismissed] = useState(initialProgress.state.dismissed);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(
    initialProgress.state.favoriteCategories
  );
  const [savedSlugs, setSavedSlugs] = useState<string[]>(
    initialProgress.state.favoriteCategories
  );
  const [pickerOpen, setPickerOpen] = useState(
    !initialProgress.steps.find((s) => s.id === "categories")?.completed
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDismissing, startDismissTransition] = useTransition();

  const steps = initialProgress.steps.map((step) =>
    step.id === "categories"
      ? { ...step, completed: savedSlugs.length > 0 }
      : step
  );
  const completedCount = steps.filter((s) => s.completed).length;
  const allCompleted = completedCount === steps.length;

  if (dismissed || allCompleted) {
    return null;
  }

  const percent = Math.round((completedCount / steps.length) * 100);
  const hasUnsavedCategoryChanges =
    selectedSlugs.length !== savedSlugs.length ||
    selectedSlugs.some((slug) => !savedSlugs.includes(slug));

  function toggleCategorySlug(slug: string) {
    setFeedback(null);
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((item) => item !== slug);
      }
      if (prev.length >= MAX_FAVORITE_CATEGORIES) {
        return prev;
      }
      return [...prev, slug];
    });
  }

  function handleSaveCategories() {
    setFeedback(null);
    startSaveTransition(async () => {
      const res = await updateOnboardingStateAction({
        favoriteCategories: selectedSlugs,
      });
      if (!res.ok) {
        setFeedback(res.error || "Không thể lưu chuyên mục yêu thích.");
        return;
      }
      const next = res.state?.favoriteCategories ?? selectedSlugs;
      setSavedSlugs(next);
      setSelectedSlugs(next);
      if (next.length > 0) {
        setPickerOpen(false);
      }
    });
  }

  function handleDismiss() {
    setDismissed(true);
    startDismissTransition(async () => {
      const res = await updateOnboardingStateAction({ dismissed: true });
      if (!res.ok) {
        setDismissed(false);
        setFeedback(res.error || "Không thể ẩn danh sách lúc này.");
      }
    });
  }

  return (
    <section
      aria-label="Hướng dẫn bắt đầu cùng CMC"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Bắt đầu cùng CMC
            </span>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-primary">
              {completedCount}/{steps.length} bước
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Hoàn thành nhanh vài bước nhỏ để cá nhân hóa trải nghiệm học Toán của
            bạn.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={isDismissing}
          onClick={handleDismiss}
          aria-label="Ẩn hướng dẫn bắt đầu"
          title="Ẩn hướng dẫn"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-label="Tiến độ hoàn thành hướng dẫn bắt đầu"
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="mt-3 divide-y divide-border/70">
        {steps.map((step) => (
          <li key={step.id} className="py-2.5 first:pt-1 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2.5">
                {step.completed ? (
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-success"
                  />
                ) : (
                  <Circle
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/70"
                  />
                )}
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-xs font-medium leading-snug",
                      step.completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  {!step.completed && (
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>

              {step.id === "categories" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPickerOpen((prev) => !prev)}
                  className="h-7 shrink-0 px-2 text-xs text-primary hover:text-primary"
                >
                  {pickerOpen ? "Thu gọn" : step.completed ? "Sửa" : "Chọn"}
                </Button>
              ) : (
                !step.completed && (
                  <Link
                    href={step.href}
                    prefetch={false}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary transition-colors hover:bg-muted"
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )
              )}
            </div>

            {step.id === "categories" && pickerOpen && (
              <div
                id="onboarding-categories"
                className="mt-2.5 ml-6 space-y-2.5 rounded-md border border-border bg-muted/30 p-3"
              >
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => {
                    const active = selectedSlugs.includes(cat.slug);
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleCategorySlug(cat.slug)}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs transition-colors",
                          active
                            ? "border-primary bg-primary/10 font-semibold text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                        )}
                      >
                        {active && <Check className="h-3 w-3" />}
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Đã chọn {selectedSlugs.length}/{MAX_FAVORITE_CATEGORIES} chuyên
                    mục
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isSaving || !hasUnsavedCategoryChanges}
                    onClick={handleSaveCategories}
                    className="h-7 px-3 text-xs"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu chuyên mục"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>

      {feedback && (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {feedback}
        </p>
      )}
    </section>
  );
}
