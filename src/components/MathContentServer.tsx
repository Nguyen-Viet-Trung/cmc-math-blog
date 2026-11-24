import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { CheckCircle2, ChevronRight, EyeOff, Lightbulb } from "lucide-react";
import {
  parseMathContentSegments,
  type MathCalloutKind,
  type MathContentSegment,
} from "@/lib/math-blocks";
import { slugifyHeading } from "@/lib/slug";
import { cn } from "@/lib/utils";

const REMARK_PLUGINS = [remarkGfm, remarkMath];
const REHYPE_PLUGINS = [rehypeKatex];

function formatMentionsForMarkdown(raw: string): string {
  return raw.replace(/@\[([^\]\n]{2,50})\]/g, "**@$1**");
}

function extractNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractNodeText).join("");
  }
  if (node && typeof node === "object" && "props" in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractNodeText(props?.children);
  }
  return "";
}

function isSafeLinkHref(href?: string): boolean {
  if (!href) return false;
  const trimmed = href.trim();
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:" ||
      parsed.protocol === "mailto:"
    );
  } catch {
    return false;
  }
}

const CALLOUT_STYLES: Record<
  MathCalloutKind,
  { wrapper: string; iconClass: string; icon: typeof Lightbulb }
> = {
  hint: {
    wrapper: "border-bounty-border bg-bounty-surface/40",
    iconClass: "text-bounty",
    icon: Lightbulb,
  },
  solution: {
    wrapper: "border-success-border bg-success-surface/40",
    iconClass: "text-success",
    icon: CheckCircle2,
  },
  spoiler: {
    wrapper: "border-border bg-muted/45",
    iconClass: "text-muted-foreground",
    icon: EyeOff,
  },
};

function createServerMarkdownComponents(
  headingCounts: Map<string, number>
): Components {
  function nextHeadingId(children: ReactNode): string {
    const base = slugifyHeading(extractNodeText(children));
    const seen = headingCounts.get(base) ?? 0;
    headingCounts.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen + 1}`;
  }

  return {
    h2: ({ children }) => <h2 id={nextHeadingId(children)}>{children}</h2>,
    h3: ({ children }) => <h3 id={nextHeadingId(children)}>{children}</h3>,
    a: ({ href, children }) => {
      if (!isSafeLinkHref(href)) {
        return <span>{children}</span>;
      }
      const isExternal =
        href!.startsWith("http://") || href!.startsWith("https://");
      return (
        <a
          href={href}
          target={isExternal ? "_blank" : undefined}
          rel={isExternal ? "noopener noreferrer" : undefined}
        >
          {children}
        </a>
      );
    },
  };
}

function RenderServerSegments({
  segments,
  mdComponents,
}: {
  segments: MathContentSegment[];
  mdComponents: Components;
}) {
  return (
    <>
      {segments.map((seg, idx) => {
        if (seg.type === "markdown") {
          return (
            <div key={`md-${idx}`} className="math-prose overflow-x-auto break-words">
              <ReactMarkdown
                remarkPlugins={REMARK_PLUGINS}
                rehypePlugins={REHYPE_PLUGINS}
                components={mdComponents}
              >
                {formatMentionsForMarkdown(seg.content)}
              </ReactMarkdown>
            </div>
          );
        }

        if (seg.type === "diagram") {
          return null;
        }

        const style = CALLOUT_STYLES[seg.kind];
        const Icon = style.icon;
        const innerSegments = parseMathContentSegments(seg.content);

        return (
          <details
            key={`call-${idx}`}
            className={cn(
              "group my-3 overflow-hidden rounded-lg border",
              style.wrapper
            )}
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-semibold text-foreground select-none hover:bg-background/30 [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Icon className={cn("h-4 w-4 shrink-0", style.iconClass)} />
                <span>{seg.title}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                <span className="group-open:hidden">Bấm để mở</span>
                <span className="hidden group-open:inline">Thu gọn</span>
                <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
              </span>
            </summary>
            <div className="border-t border-border/60 bg-card/80 px-4 py-3">
              {innerSegments.length > 0 ? (
                <RenderServerSegments
                  segments={innerSegments}
                  mdComponents={mdComponents}
                />
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  (Chưa có nội dung)
                </p>
              )}
            </div>
          </details>
        );
      })}
    </>
  );
}

/**
 * Server Component renderer cho văn bản Markdown + KaTeX tĩnh (như trang /rules).
 * Không gửi react-markdown / katex / Radix Dialog xuống trình duyệt (0 kB Client JS).
 */
export function MathContentServer({ content }: { content: string }) {
  const segments = parseMathContentSegments(content);
  const mdComponents = createServerMarkdownComponents(new Map<string, number>());

  return (
    <div className="space-y-2">
      <RenderServerSegments segments={segments} mdComponents={mdComponents} />
    </div>
  );
}
