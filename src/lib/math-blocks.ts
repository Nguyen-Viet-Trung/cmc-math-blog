/**
 * Pure parser splitting Markdown content into ordered segments:
 * - Standard Markdown (with KaTeX)
 * - Collapsible Callout blocks: `:::hint [Title]`, `:::solution [Title]`, `:::spoiler [Title]`
 * - Zero-storage Math Diagram blocks: ```graph, ```geogebra, ```desmos
 */

export type MathCalloutKind = "hint" | "solution" | "spoiler";
export type MathDiagramKind = "graph" | "geogebra" | "desmos";

export type MathContentSegment =
  | { type: "markdown"; content: string }
  | {
      type: "callout";
      kind: MathCalloutKind;
      title: string;
      content: string;
    }
  | {
      type: "diagram";
      kind: MathDiagramKind;
      source: string;
    };

const DEFAULT_CALLOUT_TITLES: Record<MathCalloutKind, string> = {
  hint: "Gợi ý tư duy",
  solution: "Lời giải chi tiết",
  spoiler: "Nội dung ẩn",
};

const CALLOUT_OPEN_RE = /^:::(hint|solution|spoiler)(?:\s+(.*))?$/i;
const CALLOUT_CLOSE_RE = /^:::\s*$/;
const DIAGRAM_OPEN_RE = /^```(graph|geogebra|desmos)\s*$/i;
const FENCE_CLOSE_RE = /^```\s*$/;
const ANY_FENCE_RE = /^```/;

export function parseMathContentSegments(raw: string): MathContentSegment[] {
  if (!raw) return [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const segments: MathContentSegment[] = [];
  let mdBuffer: string[] = [];
  let inGenericFence = false;

  const flushMarkdown = () => {
    const text = mdBuffer.join("\n");
    if (text.trim().length > 0) {
      segments.push({ type: "markdown", content: text });
    }
    mdBuffer = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (inGenericFence) {
      mdBuffer.push(line);
      if (FENCE_CLOSE_RE.test(trimmed)) {
        inGenericFence = false;
      }
      i += 1;
      continue;
    }

    const diagramMatch = trimmed.match(DIAGRAM_OPEN_RE);
    if (diagramMatch) {
      const kind = diagramMatch[1].toLowerCase() as MathDiagramKind;
      const bodyLines: string[] = [];
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        if (FENCE_CLOSE_RE.test(lines[j].trim())) {
          closed = true;
          break;
        }
        bodyLines.push(lines[j]);
        j += 1;
      }
      if (closed) {
        flushMarkdown();
        segments.push({
          type: "diagram",
          kind,
          source: bodyLines.join("\n").trim(),
        });
        i = j + 1;
        continue;
      }
    }

    if (ANY_FENCE_RE.test(trimmed)) {
      inGenericFence = true;
      mdBuffer.push(line);
      i += 1;
      continue;
    }

    const calloutMatch = trimmed.match(CALLOUT_OPEN_RE);
    if (calloutMatch) {
      const kind = calloutMatch[1].toLowerCase() as MathCalloutKind;
      const customTitle = (calloutMatch[2] ?? "").trim();
      const bodyLines: string[] = [];
      let j = i + 1;
      let depth = 1;
      let innerFence = false;
      let closed = false;

      while (j < lines.length) {
        const curTrim = lines[j].trim();
        if (ANY_FENCE_RE.test(curTrim)) {
          innerFence = !innerFence;
          bodyLines.push(lines[j]);
          j += 1;
          continue;
        }
        if (!innerFence) {
          if (CALLOUT_OPEN_RE.test(curTrim)) {
            depth += 1;
          } else if (CALLOUT_CLOSE_RE.test(curTrim)) {
            depth -= 1;
            if (depth === 0) {
              closed = true;
              break;
            }
          }
        }
        bodyLines.push(lines[j]);
        j += 1;
      }

      if (closed) {
        flushMarkdown();
        segments.push({
          type: "callout",
          kind,
          title: customTitle || DEFAULT_CALLOUT_TITLES[kind],
          content: bodyLines.join("\n").trim(),
        });
        i = j + 1;
        continue;
      }
    }

    mdBuffer.push(line);
    i += 1;
  }

  flushMarkdown();
  return segments;
}
