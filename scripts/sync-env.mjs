import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const rootDir = process.cwd();
const keyFilePath = path.join(rootDir, "key.txt");
const envLocalPath = path.join(rootDir, ".env.local");
const envPrismaPath = path.join(rootDir, ".env");

const CANONICAL_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "ADMIN_EMAIL",
  "NEXT_PUBLIC_SITE_NAME",
  "DEFAULT_SOLVED_POINTS",
  "CRON_SECRET",
];

const REQUIRED_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "DATABASE_URL",
  "DIRECT_URL",
  "ADMIN_EMAIL",
];

function parseEnvText(text) {
  const result = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && /^[A-Z0-9_]+$/.test(key)) {
      result[key] = val;
    }
  }
  return result;
}

if (fs.existsSync(keyFilePath)) {
  const raw = parseEnvText(fs.readFileSync(keyFilePath, "utf8"));
  const normalized = {};

  normalized.NEXT_PUBLIC_SUPABASE_URL =
    raw.NEXT_PUBLIC_SUPABASE_URL || raw.SUPABASE_URL || "";

  normalized.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    raw.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    raw.SUPABASE_PUBLISHABLE_KEY ||
    raw.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  normalized.SUPABASE_SECRET_KEY =
    raw.SUPABASE_SECRET_KEY || raw.SUPABASE_SERVICE_ROLE_KEY || "";

  normalized.DATABASE_URL = raw.DATABASE_URL || "";
  normalized.DIRECT_URL = raw.DIRECT_URL || "";

  // Tự động suy ra DIRECT_URL (:5432) từ DATABASE_URL (:6543) nếu thiếu hoặc sai cú pháp
  if (
    normalized.DATABASE_URL.startsWith("postgres") &&
    !normalized.DIRECT_URL.startsWith("postgres")
  ) {
    normalized.DIRECT_URL = normalized.DATABASE_URL
      .replace(":6543/", ":5432/")
      .replace(/([?&])pgbouncer=true(&|$)/, "$1")
      .replace(/[?&]$/, "");
  }

  // Đảm bảo DATABASE_URL ở cổng :6543 luôn có ?pgbouncer=true cho Prisma
  if (
    normalized.DATABASE_URL.includes(":6543") &&
    !normalized.DATABASE_URL.includes("pgbouncer=true")
  ) {
    normalized.DATABASE_URL += normalized.DATABASE_URL.includes("?")
      ? "&pgbouncer=true"
      : "?pgbouncer=true";
  }

  // Đảm bảo DIRECT_URL ở cổng :5432 không bị gắn nhầm ?pgbouncer=true
  if (normalized.DIRECT_URL.includes(":5432")) {
    normalized.DIRECT_URL = normalized.DIRECT_URL
      .replace(/([?&])pgbouncer=true(&|$)/, "$1")
      .replace(/[?&]$/, "");
  }

  normalized.ADMIN_EMAIL = raw.ADMIN_EMAIL || "";
  normalized.NEXT_PUBLIC_SITE_NAME =
    raw.NEXT_PUBLIC_SITE_NAME || "CMC";
  normalized.DEFAULT_SOLVED_POINTS = raw.DEFAULT_SOLVED_POINTS || "10";
  normalized.CRON_SECRET =
    raw.CRON_SECRET || crypto.randomBytes(24).toString("hex");

  const entries = CANONICAL_KEYS.filter(
    (k) => normalized[k] !== undefined && normalized[k] !== ""
  ).map((k) => `${k}=${JSON.stringify(normalized[k])}`);

  const envContent = [
    "# Auto-generated from key.txt — DO NOT COMMIT",
    ...entries,
    "",
  ].join("\n");

  fs.writeFileSync(envLocalPath, envContent, "utf8");
  fs.writeFileSync(envPrismaPath, envContent, "utf8");

  const missing = REQUIRED_KEYS.filter((k) => !normalized[k]);
  if (missing.length > 0) {
    console.warn(
      `[sync-env] ⚠️ Còn thiếu biến bắt buộc trong key.txt: ${missing.join(", ")}`
    );
  } else {
    console.log(
      `[sync-env] ✅ Đã đồng bộ chuẩn ${entries.length}/${CANONICAL_KEYS.length} biến từ key.txt -> .env.local & .env`
    );
  }
}
