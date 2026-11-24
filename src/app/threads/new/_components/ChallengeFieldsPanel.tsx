"use client";

import { Clock } from "lucide-react";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ChallengeFieldsPanelProps {
  challengeDeadline: string;
  challengeBounty: string;
  onDeadlineChange: (value: string) => void;
  onBountyChange: (value: string) => void;
}

export function ChallengeFieldsPanel({
  challengeDeadline,
  challengeBounty,
  onDeadlineChange,
  onBountyChange,
}: ChallengeFieldsPanelProps) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border border-bounty-border bg-bounty-surface/40 p-4 sm:grid-cols-2">
      <Field>
        <FieldLabel
          htmlFor="challenge-deadline"
          className="inline-flex items-center gap-1.5 text-xs"
        >
          <Clock className="size-3.5 text-bounty" aria-hidden="true" />
          Hạn kết thúc nộp bài ẩn
        </FieldLabel>
        <Input
          id="challenge-deadline"
          type="datetime-local"
          required
          value={challengeDeadline}
          onChange={(e) => onDeadlineChange(e.target.value)}
          className="h-9 text-xs"
        />
        <FieldDescription>
          Trước thời điểm này, học sinh chỉ thấy bài nộp của chính mình.
        </FieldDescription>
      </Field>
      <Field>
        <FieldLabel htmlFor="challenge-bounty" className="text-xs">
          Điểm thưởng mỗi lời giải đúng (1–1000)
        </FieldLabel>
        <Input
          id="challenge-bounty"
          type="number"
          required
          min={1}
          max={1000}
          value={challengeBounty}
          onChange={(e) => onBountyChange(e.target.value)}
          className="h-9 font-semibold tabular-nums text-bounty"
        />
        <FieldDescription>
          Admin có thể chọn nhiều học sinh giải đúng cùng nhận mức điểm này.
        </FieldDescription>
      </Field>
    </div>
  );
}
