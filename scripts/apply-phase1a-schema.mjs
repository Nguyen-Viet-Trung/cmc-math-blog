import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  for (const rawLine of fs.readFileSync(envLocalPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

const dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ Thiếu DIRECT_URL / DATABASE_URL trong .env.local");
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false, max: 1, connect_timeout: 10 });

const statements = [
  `ALTER TABLE public.profiles
     ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL
     DEFAULT '{"replies":true,"mentions":true,"follows":true,"campaigns":true,"awards":true,"digest":true}'::jsonb`,
  `DROP INDEX IF EXISTS public.idx_threads_unanswered_created`,
  `CREATE INDEX idx_threads_unanswered_created
     ON public.threads(is_pinned DESC, created_at DESC)
     WHERE thread_type = 'question' AND status = 'open' AND reply_count = 0`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
  console.log(
    `✅ Đã áp dụng thành công schema Sprint 1A (${statements.length} câu lệnh SQL additive & idempotent).`
  );
} finally {
  await sql.end();
}
