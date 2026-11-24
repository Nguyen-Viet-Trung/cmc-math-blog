"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Bold,
  Columns2,
  Edit3,
  Eye,
  Heading2,
  Heading3,
  Italic,
  Lightbulb,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Sigma,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const MathContent = dynamic(
  () => import("@/components/MathContent").then((m) => m.MathContent),
  {
    loading: () => <Skeleton className="h-40 w-full rounded-md" />,
  }
);

type EditorMode = "write" | "split" | "preview";

interface RichTextEditorProps {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}

export function RichTextEditor({
  id,
  value,
  onChange,
  maxLength = 50000,
  rows = 18,
  placeholder = "Soạn nội dung văn bản định dạng Rich Text (hỗ trợ tiêu đề, in đậm, danh sách, trích dẫn, liên kết và công thức LaTeX)...",
}: RichTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [mode, setMode] = useState<EditorMode>("write");
  const deferredValue = useDeferredValue(value);
  const isPreviewStale = deferredValue !== value;

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      setMode("split");
    }
  }, []);

  function applyEdit(
    nextValue: string,
    selectionStart: number,
    selectionEnd: number
  ) {
    onChange(nextValue);
    if (mode === "preview") {
      setMode("write");
    }
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function wrapSelection(
    before: string,
    after: string,
    fallbackText: string
  ) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallbackText;
    const next =
      value.slice(0, start) + before + selected + after + value.slice(end);
    const cursorStart = start + before.length;
    const cursorEnd = cursorStart + selected.length;
    applyEdit(next, cursorStart, cursorEnd);
  }

  function prefixLines(prefix: string, fallbackText: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;

    if (start === end) {
      const needsLeadingNewline = start > 0 && value[start - 1] !== "\n";
      const lead = needsLeadingNewline ? "\n" : "";
      const inserted = `${lead}${prefix}${fallbackText}`;
      const next = value.slice(0, start) + inserted + value.slice(end);
      const selStart = start + lead.length + prefix.length;
      applyEdit(next, selStart, selStart + fallbackText.length);
      return;
    }

    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const selectedBlock = value.slice(lineStart, end);
    const prefixed = selectedBlock
      .split("\n")
      .map((line) => `${prefix}${line}`)
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(end);
    applyEdit(next, lineStart, lineStart + prefixed.length);
  }

  function insertBlock(block: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + block + value.slice(end);
    const cursor = start + block.length;
    applyEdit(next, cursor, cursor);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === "b") {
      e.preventDefault();
      wrapSelection("**", "**", "văn bản in đậm");
    } else if (key === "i") {
      e.preventDefault();
      wrapSelection("*", "*", "văn bản in nghiêng");
    } else if (key === "k") {
      e.preventDefault();
      wrapSelection("[", "](https://)", "Tên liên kết");
    }
  }

  const toolbarButtons = [
    {
      label: "Tiêu đề lớn (H2)",
      icon: Heading2,
      onClick: () => prefixLines("## ", "Tiêu đề mục"),
    },
    {
      label: "Tiêu đề điều mục (H3)",
      icon: Heading3,
      onClick: () => prefixLines("### ", "[1] Tên điều quy định"),
    },
    {
      label: "In đậm (Ctrl+B)",
      icon: Bold,
      onClick: () => wrapSelection("**", "**", "nội dung nổi bật"),
    },
    {
      label: "In nghiêng (Ctrl+I)",
      icon: Italic,
      onClick: () => wrapSelection("*", "*", "nội dung nhấn mạnh"),
    },
    {
      label: "Danh sách dấu chấm",
      icon: List,
      onClick: () => prefixLines("- ", "Nội dung mục"),
    },
    {
      label: "Danh sách đánh số",
      icon: ListOrdered,
      onClick: () => prefixLines("1. ", "Nội dung mục"),
    },
    {
      label: "Trích dẫn / Lưu ý nổi bật",
      icon: Quote,
      onClick: () => prefixLines("> ", "Đoạn ghi chú quan trọng"),
    },
    {
      label: "Chèn liên kết (Ctrl+K)",
      icon: Link2,
      onClick: () => wrapSelection("[", "](https://)", "Tên liên kết"),
    },
    {
      label: "Công thức Toán (LaTeX)",
      icon: Sigma,
      onClick: () => wrapSelection("$", "$", "\\frac{a}{b}"),
    },
    {
      label: "Khối lưu ý đóng/mở",
      icon: Lightbulb,
      onClick: () =>
        insertBlock(
          "\n:::hint Lưu ý quan trọng\nNội dung hướng dẫn chi tiết...\n:::\n"
        ),
    },
    {
      label: "Đường kẻ phân cách",
      icon: Minus,
      onClick: () => insertBlock("\n---\n"),
    },
  ];

  const showEditor = mode === "write" || mode === "split";
  const showPreview = mode === "preview" || mode === "split";

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {/* Toolbar & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1">
          {toolbarButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <button
                key={btn.label}
                type="button"
                title={btn.label}
                aria-label={btn.label}
                onClick={btn.onClick}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>

        <Tabs
          value={mode}
          onValueChange={(next) => setMode(next as EditorMode)}
        >
          <TabsList className="h-8 bg-background/80">
            <TabsTrigger value="write" className="h-6 px-2.5 text-xs">
              <Edit3 className="h-3 w-3" />
              Soạn thảo
            </TabsTrigger>
            <TabsTrigger
              value="split"
              className="hidden h-6 px-2.5 text-xs lg:inline-flex"
            >
              <Columns2 className="h-3 w-3" />
              Chia đôi
            </TabsTrigger>
            <TabsTrigger value="preview" className="h-6 px-2.5 text-xs">
              <Eye className="h-3 w-3" />
              Xem trước
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Editor & Live Rich Preview */}
      <div
        className={cn(
          "grid grid-cols-1",
          mode === "split" && "lg:grid-cols-2 lg:divide-x lg:divide-border"
        )}
      >
        {showEditor && (
          <textarea
            id={id}
            ref={textareaRef}
            rows={rows}
            value={value}
            maxLength={maxLength}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="block min-h-[420px] w-full resize-y border-0 bg-card p-4 font-mono text-[0.84rem] leading-[1.68] text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        )}

        {showPreview && (
          <div
            className={cn(
              "min-h-[420px] overflow-y-auto bg-background/35 p-5 transition-opacity duration-150",
              mode === "split" && "hidden max-h-[620px] lg:block",
              isPreviewStale && "opacity-75"
            )}
          >
            {deferredValue.trim() ? (
              <MathContent content={deferredValue} />
            ) : (
              <p className="text-sm italic text-muted-foreground">
                Chưa có nội dung để xem trước...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/35 px-3.5 py-2 text-[11px] text-muted-foreground">
        <span>
          Hỗ trợ tiêu đề (<code>##</code>, <code>###</code>),{" "}
          <strong>in đậm</strong> (Ctrl+B), <em>in nghiêng</em> (Ctrl+I), liên
          kết (Ctrl+K), trích dẫn và công thức LaTeX (<code>$...$</code>).
        </span>
        <span className="shrink-0 tabular-nums">
          {value.length.toLocaleString("vi-VN")} /{" "}
          {maxLength.toLocaleString("vi-VN")} ký tự
        </span>
      </div>
    </div>
  );
}
