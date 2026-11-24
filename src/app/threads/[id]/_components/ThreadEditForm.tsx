"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { updateThreadAction } from "@/app/actions/forum";
import { MathEditor } from "@/components/MathEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ThreadEditFormProps {
  threadId: string;
  initialTitle: string;
  initialGradeTag: string;
  initialContent: string;
  initialImageUrls: string[];
  onSaved: () => Promise<void>;
  onCancel: () => void;
  onError: (message: string) => void;
}

export function ThreadEditForm({
  threadId,
  initialTitle,
  initialGradeTag,
  initialContent,
  initialImageUrls,
  onSaved,
  onCancel,
  onError,
}: ThreadEditFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [gradeTag, setGradeTag] = useState(initialGradeTag);
  const [content, setContent] = useState(initialContent);
  const [imageUrls, setImageUrls] = useState<string[]>(initialImageUrls);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const res = await updateThreadAction({
        threadId,
        title,
        gradeTag,
        content,
        imageUrls,
      });
      if (!res.ok) {
        onError(res.error || "Không thể lưu chỉnh sửa bài viết.");
        return;
      }
      await onSaved();
    } catch {
      onError("Không thể kết nối máy chủ khi lưu chỉnh sửa bài viết.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="edit-thread-title">Tiêu đề bài viết</Label>
          <Input
            id="edit-thread-title"
            type="text"
            required
            minLength={8}
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-thread-grade">Khối lớp / Tag</Label>
          <Input
            id="edit-thread-grade"
            type="text"
            maxLength={30}
            value={gradeTag}
            onChange={(e) => setGradeTag(e.target.value)}
          />
        </div>
      </div>

      <MathEditor
        value={content}
        onChange={setContent}
        imageUrls={imageUrls}
        onChangeImages={setImageUrls}
        rows={12}
      />

      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="h-3.5 w-3.5" />
          Hủy
        </Button>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}
