/**
 * Zero-storage, zero-eval math graph expression evaluator & safe embed URL parser.
 * Supports:
 * - ```graph blocks with x/y ranges, multiple f(x)/y= curves, and labeled points.
 * - Safe HTTPS embed URL validation for GeoGebra and Desmos only.
 */

export interface GraphCurveSpec {
  label: string;
  expr: string;
  colorIndex: number;
}

export interface GraphPointSpec {
  x: number;
  y: number;
  label: string;
}

export interface ParsedGraphSpec {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  curves: GraphCurveSpec[];
  points: GraphPointSpec[];
  error?: string;
}

type Token =
  | { type: "number"; value: number }
  | { type: "ident"; value: string }
  | { type: "op"; value: "+" | "-" | "*" | "/" | "^" }
  | { type: "lparen" }
  | { type: "rparen" };

const ALLOWED_FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "asin",
  "acos",
  "atan",
  "abs",
  "sqrt",
  "ln",
  "log",
  "exp",
  "floor",
  "ceil",
]);

function tokenizeMathExpression(raw: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const s = raw.trim();

  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = "";
      let dotCount = 0;
      while (i < s.length && /[0-9.]/.test(s[i])) {
        if (s[i] === ".") dotCount += 1;
        if (dotCount > 1) {
          throw new Error(`Số không hợp lệ tại "${numStr}."`);
        }
        numStr += s[i];
        i += 1;
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) {
        throw new Error(`Giá trị số không hợp lệ: "${numStr}"`);
      }
      tokens.push({ type: "number", value: val });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let ident = "";
      while (i < s.length && /[a-zA-Z]/.test(s[i])) {
        ident += s[i];
        i += 1;
      }
      const lower = ident.toLowerCase();
      // Hỗ trợ viết tắt như "2x" đã tách ở bước chèn nhân ngầm, hoặc "pi", "e", "x", hàm toán học
      if (lower === "x" || lower === "pi" || lower === "e" || ALLOWED_FUNCTIONS.has(lower)) {
        tokens.push({ type: "ident", value: lower });
      } else {
        throw new Error(`Ký hiệu hoặc hàm không được hỗ trợ: "${ident}"`);
      }
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
      tokens.push({ type: "op", value: ch });
      i += 1;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i += 1;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i += 1;
      continue;
    }
    throw new Error(`Ký tự không hợp lệ trong biểu thức: "${ch}"`);
  }

  // Chèn toán tử nhân ngầm: 2x -> 2*x, 2(x+1) -> 2*(x+1), (x+1)(x-1) -> (x+1)*(x-1), x sin(x) -> x*sin(x)
  const expanded: Token[] = [];
  for (let k = 0; k < tokens.length; k++) {
    const cur = tokens[k];
    const prev = expanded[expanded.length - 1];
    if (prev) {
      const prevEndsValue =
        prev.type === "number" ||
        prev.type === "rparen" ||
        (prev.type === "ident" && !ALLOWED_FUNCTIONS.has(prev.value));
      const curStartsValue =
        cur.type === "ident" || cur.type === "lparen" || cur.type === "number";
      if (prevEndsValue && curStartsValue) {
        expanded.push({ type: "op", value: "*" });
      }
    }
    expanded.push(cur);
  }

  return expanded;
}

type ExprNode = (x: number) => number;

/**
 * Compile a math expression string into a safe evaluator `(x: number) => number`.
 * Zero `eval` / zero `new Function`.
 */
export function compileMathExpression(rawExpr: string): ExprNode {
  const tokens = tokenizeMathExpression(rawExpr);
  if (tokens.length === 0) {
    throw new Error("Biểu thức rỗng.");
  }

  let pos = 0;

  function peek(): Token | undefined {
    return tokens[pos];
  }

  function consume(): Token {
    return tokens[pos++];
  }

  function parseAddSub(): ExprNode {
    let left = parseMulDiv();
    while (true) {
      const t = peek();
      if (t?.type === "op" && (t.value === "+" || t.value === "-")) {
        consume();
        const right = parseMulDiv();
        const prevLeft = left;
        left =
          t.value === "+"
            ? (x) => prevLeft(x) + right(x)
            : (x) => prevLeft(x) - right(x);
      } else {
        break;
      }
    }
    return left;
  }

  function parseMulDiv(): ExprNode {
    let left = parseUnary();
    while (true) {
      const t = peek();
      if (t?.type === "op" && (t.value === "*" || t.value === "/")) {
        consume();
        const right = parseUnary();
        const prevLeft = left;
        left =
          t.value === "*"
            ? (x) => prevLeft(x) * right(x)
            : (x) => prevLeft(x) / right(x);
      } else {
        break;
      }
    }
    return left;
  }

  function parseUnary(): ExprNode {
    const t = peek();
    if (t?.type === "op" && t.value === "+") {
      consume();
      return parseUnary();
    }
    if (t?.type === "op" && t.value === "-") {
      consume();
      const inner = parseUnary();
      return (x) => -inner(x);
    }
    return parsePower();
  }

  function parsePower(): ExprNode {
    const base = parsePrimary();
    const t = peek();
    if (t?.type === "op" && t.value === "^") {
      consume();
      const exponent = parseUnary(); // right-associative, allows x^-2
      return (x) => Math.pow(base(x), exponent(x));
    }
    return base;
  }

  function parsePrimary(): ExprNode {
    const t = peek();
    if (!t) {
      throw new Error("Thiếu toán hạng ở cuối biểu thức.");
    }

    if (t.type === "number") {
      consume();
      return () => t.value;
    }

    if (t.type === "ident") {
      consume();
      if (t.value === "x") return (x) => x;
      if (t.value === "pi") return () => Math.PI;
      if (t.value === "e") return () => Math.E;

      if (ALLOWED_FUNCTIONS.has(t.value)) {
        const next = peek();
        if (next?.type !== "lparen") {
          throw new Error(`Hàm "${t.value}" cần dấu ngoặc đơn, ví dụ ${t.value}(x).`);
        }
        consume();
        const arg = parseAddSub();
        if (peek()?.type !== "rparen") {
          throw new Error(`Thiếu dấu ngoặc đóng ")" cho hàm "${t.value}".`);
        }
        consume();

        switch (t.value) {
          case "sin":
            return (x) => Math.sin(arg(x));
          case "cos":
            return (x) => Math.cos(arg(x));
          case "tan":
            return (x) => Math.tan(arg(x));
          case "asin":
            return (x) => Math.asin(arg(x));
          case "acos":
            return (x) => Math.acos(arg(x));
          case "atan":
            return (x) => Math.atan(arg(x));
          case "abs":
            return (x) => Math.abs(arg(x));
          case "sqrt":
            return (x) => Math.sqrt(arg(x));
          case "ln":
            return (x) => Math.log(arg(x));
          case "log":
            return (x) => Math.log10(arg(x));
          case "exp":
            return (x) => Math.exp(arg(x));
          case "floor":
            return (x) => Math.floor(arg(x));
          case "ceil":
            return (x) => Math.ceil(arg(x));
        }
      }
    }

    if (t.type === "lparen") {
      consume();
      const inner = parseAddSub();
      if (peek()?.type !== "rparen") {
        throw new Error('Thiếu dấu ngoặc đóng ")".');
      }
      consume();
      return inner;
    }

    throw new Error("Cú pháp biểu thức không hợp lệ.");
  }

  const root = parseAddSub();
  if (pos < tokens.length) {
    throw new Error("Biểu thức có ký tự thừa không hợp lệ.");
  }
  return root;
}

function parseRange(raw: string): [number, number] | null {
  const m = raw.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:\.\.|,|to)\s*(-?\d+(?:\.\d+)?)$/i);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b) return null;
  if (b - a > 10_000) return null;
  return [a, b];
}

export function parseGraphBlock(source: string): ParsedGraphSpec {
  let xMin = -6;
  let xMax = 6;
  let yMin = -4;
  let yMax = 6;
  const curves: GraphCurveSpec[] = [];
  const points: GraphPointSpec[] = [];

  const lines = source
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  for (const line of lines) {
    const xMatch = line.match(/^x\s*:\s*(.+)$/i);
    if (xMatch) {
      const range = parseRange(xMatch[1]);
      if (range) {
        [xMin, xMax] = range;
      }
      continue;
    }

    const yMatch = line.match(/^y\s*:\s*(.+)$/i);
    if (yMatch) {
      const range = parseRange(yMatch[1]);
      if (range) {
        [yMin, yMax] = range;
      }
      continue;
    }

    const ptMatch = line.match(
      /^point\s*:\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)\s*(.*)$/i
    );
    if (ptMatch) {
      const px = Number(ptMatch[1]);
      const py = Number(ptMatch[2]);
      if (Number.isFinite(px) && Number.isFinite(py)) {
        points.push({
          x: px,
          y: py,
          label: ptMatch[3].trim().slice(0, 24),
        });
      }
      continue;
    }

    // Curve lines: "f(x) = x^2 - 1", "y = sin(x)", or bare expression "x^2"
    const fnMatch = line.match(/^([a-zA-Z]\s*\(\s*x\s*\)|y)\s*=\s*(.+)$/);
    const label = fnMatch ? line : `y = ${line}`;
    const expr = fnMatch ? fnMatch[2].trim() : line;

    if (curves.length >= 6) continue;
    try {
      compileMathExpression(expr);
      curves.push({
        label,
        expr,
        colorIndex: curves.length,
      });
    } catch (err) {
      return {
        xMin,
        xMax,
        yMin,
        yMax,
        curves,
        points,
        error: `Lỗi công thức "${line}": ${err instanceof Error ? err.message : "không hợp lệ"}`,
      };
    }
  }

  if (curves.length === 0 && points.length === 0) {
    return {
      xMin,
      xMax,
      yMin,
      yMax,
      curves,
      points,
      error: "Chưa có hàm số hoặc điểm nào trong khối đồ thị.",
    };
  }

  return { xMin, xMax, yMin, yMax, curves, points };
}

export interface SafeMathEmbed {
  provider: "geogebra" | "desmos";
  embedUrl: string;
  externalUrl: string;
  title: string;
}

/**
 * Strictly allow only verified GeoGebra & Desmos HTTPS links to prevent arbitrary iframe injection.
 */
export function parseSafeMathEmbedUrl(
  kind: "geogebra" | "desmos",
  rawSource: string
): SafeMathEmbed | null {
  const firstLine = rawSource
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return null;

  // Support optional "url | title" or plain URL
  const [urlPart, titlePart] = firstLine.split("|").map((s) => s.trim());
  if (!urlPart) return null;

  let parsed: URL;
  try {
    parsed = new URL(urlPart);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();

  if (kind === "geogebra") {
    const allowed = host === "www.geogebra.org" || host === "geogebra.org";
    if (!allowed) return null;

    // Normalize /m/<id> or /classic/<id> or /material/iframe/id/<id>
    const mMatch = parsed.pathname.match(/^\/(?:m|classic|graphing|geometry|3d)\/([a-zA-Z0-9_-]+)/);
    const iframeMatch = parsed.pathname.match(/^\/material\/iframe\/id\/([a-zA-Z0-9_-]+)/);
    const id = iframeMatch?.[1] ?? mMatch?.[1];
    if (!id) return null;

    return {
      provider: "geogebra",
      embedUrl: `https://www.geogebra.org/material/iframe/id/${id}/border/e5e7eb/sfsb/true/smb/false/stb/false/stbh/false/ai/false/asb/false/sri/false/rc/false/ld/false/sdz/true/ctl/false`,
      externalUrl: `https://www.geogebra.org/m/${id}`,
      title: titlePart || "Hình vẽ tương tác GeoGebra",
    };
  }

  if (kind === "desmos") {
    const allowed = host === "www.desmos.com" || host === "desmos.com";
    if (!allowed) return null;

    const calcMatch = parsed.pathname.match(/^\/(calculator|geometry|3d)\/([a-zA-Z0-9_-]+)/);
    if (!calcMatch) return null;
    const mode = calcMatch[1];
    const id = calcMatch[2];

    return {
      provider: "desmos",
      embedUrl: `https://www.desmos.com/${mode}/${id}?embed`,
      externalUrl: `https://www.desmos.com/${mode}/${id}`,
      title: titlePart || "Đồ thị tương tác Desmos",
    };
  }

  return null;
}
