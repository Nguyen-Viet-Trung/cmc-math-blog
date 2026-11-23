"use client";

import { memo, useMemo, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  LineChart,
  Play,
  Shapes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  compileMathExpression,
  parseGraphBlock,
  parseSafeMathEmbedUrl,
} from "@/lib/math-diagram";
import type { MathDiagramKind } from "@/lib/math-blocks";

const CURVE_COLORS = [
  "#2563eb", // blue
  "#d97706", // amber
  "#059669", // emerald
  "#e11d48", // rose
  "#7c3aed", // violet
  "#0891b2", // cyan
];

const SVG_W = 640;
const SVG_H = 380;
const PAD = 38;

function niceTickStep(span: number): number {
  const rough = span / 8;
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(rough, 1e-6))));
  const frac = rough / pow;
  if (frac <= 1.5) return 1 * pow;
  if (frac <= 3.5) return 2 * pow;
  if (frac <= 7.5) return 5 * pow;
  return 10 * pow;
}

function formatTickLabel(val: number): string {
  if (Math.abs(val) < 1e-9) return "0";
  if (Number.isInteger(val)) return String(val);
  return Number(val.toFixed(2)).toString();
}

function SvgFunctionPlot({ source }: { source: string }) {
  const computed = useMemo(() => {
    const spec = parseGraphBlock(source);
    if (spec.error) {
      return { spec, paths: [] as { label: string; d: string; color: string }[] };
    }

    const plotW = SVG_W - PAD * 2;
    const plotH = SVG_H - PAD * 2;
    const xSpan = spec.xMax - spec.xMin;
    const ySpan = spec.yMax - spec.yMin;

    const toSvgX = (x: number) => PAD + ((x - spec.xMin) / xSpan) * plotW;
    const toSvgY = (y: number) => PAD + ((spec.yMax - y) / ySpan) * plotH;

    const samples = 420;
    const jumpThreshold = ySpan * 1.4;
    const yClampMin = spec.yMin - ySpan * 2;
    const yClampMax = spec.yMax + ySpan * 2;

    try {
      const paths = spec.curves.map((curve) => {
        const fn = compileMathExpression(curve.expr);
        const parts: string[] = [];
        let prevValid = false;
        let prevY = 0;

        for (let i = 0; i <= samples; i++) {
          const x = spec.xMin + (xSpan * i) / samples;
          const y = fn(x);
          const valid =
            Number.isFinite(y) && y >= yClampMin && y <= yClampMax;

          if (!valid) {
            prevValid = false;
            continue;
          }

          const sx = toSvgX(x);
          const sy = toSvgY(y);
          if (!prevValid || Math.abs(y - prevY) > jumpThreshold) {
            parts.push(`M ${sx.toFixed(2)} ${sy.toFixed(2)}`);
          } else {
            parts.push(`L ${sx.toFixed(2)} ${sy.toFixed(2)}`);
          }
          prevValid = true;
          prevY = y;
        }

        return {
          label: curve.label,
          d: parts.join(" "),
          color: CURVE_COLORS[curve.colorIndex % CURVE_COLORS.length],
        };
      });

      return { spec, paths };
    } catch (err) {
      return {
        spec: {
          ...spec,
          error:
            err instanceof Error
              ? err.message
              : "Không thể tính giá trị biểu thức đồ thị.",
        },
        paths: [] as { label: string; d: string; color: string }[],
      };
    }
  }, [source]);

  const { spec, paths } = computed;

  if (spec.error) {
    return (
      <div className="my-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">Không thể vẽ đồ thị</p>
          <p className="mt-0.5 opacity-90">{spec.error}</p>
        </div>
      </div>
    );
  }

  const plotW = SVG_W - PAD * 2;
  const plotH = SVG_H - PAD * 2;
  const xSpan = spec.xMax - spec.xMin;
  const ySpan = spec.yMax - spec.yMin;
  const toSvgX = (x: number) => PAD + ((x - spec.xMin) / xSpan) * plotW;
  const toSvgY = (y: number) => PAD + ((spec.yMax - y) / ySpan) * plotH;

  const xStep = niceTickStep(xSpan);
  const yStep = niceTickStep(ySpan);

  const xTicks: number[] = [];
  for (
    let t = Math.ceil(spec.xMin / xStep) * xStep;
    t <= spec.xMax + 1e-9 && xTicks.length < 50 && t + xStep > t;
    t += xStep
  ) {
    xTicks.push(Number(t.toFixed(6)));
  }

  const yTicks: number[] = [];
  for (
    let t = Math.ceil(spec.yMin / yStep) * yStep;
    t <= spec.yMax + 1e-9 && yTicks.length < 50 && t + yStep > t;
    t += yStep
  ) {
    yTicks.push(Number(t.toFixed(6)));
  }

  const hasOriginX = spec.xMin <= 0 && spec.xMax >= 0;
  const hasOriginY = spec.yMin <= 0 && spec.yMax >= 0;
  const axisXPos = hasOriginY ? toSvgY(0) : SVG_H - PAD;
  const axisYPos = hasOriginX ? toSvgX(0) : PAD;
  const clipId = `graph-clip-${Math.abs(
    source.split("").reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)
  )}`;

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 text-foreground">
          <LineChart className="h-3.5 w-3.5 text-primary" />
          Đồ thị hàm số (SVG)
        </span>
        <span className="font-mono tabular-nums">
          x ∈ [{spec.xMin}, {spec.xMax}] · y ∈ [{spec.yMin}, {spec.yMax}]
        </span>
      </div>

      <div className="bg-card p-2">
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label="Đồ thị hàm số Toán học"
          className="mx-auto block h-auto w-full max-w-[640px]"
        >
          <defs>
            <clipPath id={clipId}>
              <rect x={PAD} y={PAD} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {xTicks.map((t) => {
            const sx = toSvgX(t);
            return (
              <line
                key={`gx-${t}`}
                x1={sx}
                y1={PAD}
                x2={sx}
                y2={SVG_H - PAD}
                stroke="currentColor"
                className="text-border/70"
                strokeWidth={1}
              />
            );
          })}
          {yTicks.map((t) => {
            const sy = toSvgY(t);
            return (
              <line
                key={`gy-${t}`}
                x1={PAD}
                y1={sy}
                x2={SVG_W - PAD}
                y2={sy}
                stroke="currentColor"
                className="text-border/70"
                strokeWidth={1}
              />
            );
          })}

          {/* Border frame */}
          <rect
            x={PAD}
            y={PAD}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="currentColor"
            className="text-border"
            strokeWidth={1}
          />

          {/* Axes */}
          <line
            x1={PAD}
            y1={axisXPos}
            x2={SVG_W - PAD}
            y2={axisXPos}
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth={1.5}
          />
          <line
            x1={axisYPos}
            y1={PAD}
            x2={axisYPos}
            y2={SVG_H - PAD}
            stroke="currentColor"
            className="text-muted-foreground"
            strokeWidth={1.5}
          />

          {/* Axis labels */}
          <text
            x={SVG_W - PAD + 10}
            y={axisXPos + 4}
            fontSize={12}
            fontStyle="italic"
            fill="currentColor"
            className="text-foreground"
          >
            x
          </text>
          <text
            x={axisYPos - 4}
            y={PAD - 10}
            fontSize={12}
            fontStyle="italic"
            fill="currentColor"
            className="text-foreground"
          >
            y
          </text>

          {/* Tick labels */}
          {xTicks.map((t) => {
            if (Math.abs(t) < 1e-9 && hasOriginX && hasOriginY) return null;
            const sx = toSvgX(t);
            return (
              <text
                key={`tx-${t}`}
                x={sx}
                y={Math.min(SVG_H - 12, axisXPos + 15)}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                className="font-mono text-muted-foreground"
              >
                {formatTickLabel(t)}
              </text>
            );
          })}
          {yTicks.map((t) => {
            if (Math.abs(t) < 1e-9 && hasOriginX && hasOriginY) return null;
            const sy = toSvgY(t);
            return (
              <text
                key={`ty-${t}`}
                x={Math.max(26, axisYPos - 7)}
                y={sy + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="currentColor"
                className="font-mono text-muted-foreground"
              >
                {formatTickLabel(t)}
              </text>
            );
          })}

          {/* Curves */}
          <g clipPath={`url(#${clipId})`}>
            {paths.map((p, idx) => (
              <path
                key={`${p.label}-${idx}`}
                d={p.d}
                fill="none"
                stroke={p.color}
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}

            {/* Points */}
            {spec.points.map((pt, idx) => {
              const sx = toSvgX(pt.x);
              const sy = toSvgY(pt.y);
              return (
                <g key={`pt-${idx}`}>
                  <circle
                    cx={sx}
                    cy={sy}
                    r={4}
                    fill="#e11d48"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  <text
                    x={sx + 7}
                    y={sy - 7}
                    fontSize={11}
                    fontWeight={600}
                    fill="#e11d48"
                  >
                    {pt.label
                      ? `${pt.label}(${formatTickLabel(pt.x)}, ${formatTickLabel(pt.y)})`
                      : `(${formatTickLabel(pt.x)}, ${formatTickLabel(pt.y)})`}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {paths.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border bg-muted/25 px-3 py-2 text-xs">
          {paths.map((p, idx) => (
            <span
              key={`leg-${idx}`}
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-foreground"
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function InteractiveMathEmbed({
  kind,
  source,
}: {
  kind: "geogebra" | "desmos";
  source: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const embed = useMemo(
    () => parseSafeMathEmbedUrl(kind, source),
    [kind, source]
  );

  if (!embed) {
    return (
      <div className="my-3 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">
            Liên kết {kind === "geogebra" ? "GeoGebra" : "Desmos"} không hợp lệ
          </p>
          <p className="mt-0.5 opacity-90">
            Chỉ chấp nhận đường dẫn HTTPS chính thức từ{" "}
            <code>
              {kind === "geogebra"
                ? "https://www.geogebra.org/m/<mã>"
                : "https://www.desmos.com/calculator/<mã>"}
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="my-3 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2 text-xs">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <Shapes className="h-3.5 w-3.5 text-primary" />
          {embed.title}
        </span>
        <a
          href={embed.externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Mở trên {embed.provider === "geogebra" ? "GeoGebra" : "Desmos"}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {loaded ? (
        <div className="aspect-[16/10] w-full bg-white">
          <iframe
            src={embed.embedUrl}
            title={embed.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups"
            className="h-full w-full border-0"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2.5 px-4 py-8 text-center">
          <p className="text-xs text-muted-foreground">
            Hình vẽ tương tác được tải theo yêu cầu để tiết kiệm băng thông.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setLoaded(true)}
          >
            <Play className="h-3.5 w-3.5" />
            Tải hình vẽ {embed.provider === "geogebra" ? "GeoGebra" : "Desmos"}
          </Button>
        </div>
      )}
    </div>
  );
}

export const MathDiagram = memo(function MathDiagram({
  kind,
  source,
}: {
  kind: MathDiagramKind;
  source: string;
}) {
  if (kind === "graph") {
    return <SvgFunctionPlot source={source} />;
  }
  return <InteractiveMathEmbed kind={kind} source={source} />;
});
