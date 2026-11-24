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
  // 1. Follow System (user_follows)
  `CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CHECK (follower_id <> following_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_follows_following
    ON public.user_follows(following_id, created_at DESC)`,

  // 2. Community Safety: Content Reports
  `CREATE TABLE IF NOT EXISTS public.content_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply', 'user')),
    target_id UUID NOT NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'off_topic', 'plagiarism', 'other')),
    detail TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'dismissed')),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution_note TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
  )`,
  `CREATE INDEX IF NOT EXISTS idx_content_reports_status_created
    ON public.content_reports(status, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_content_reports_reporter_created
    ON public.content_reports(reporter_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_content_reports_resolved_by
    ON public.content_reports(resolved_by)
    WHERE resolved_by IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_content_reports_unique_open
    ON public.content_reports(reporter_id, target_type, target_id)
    WHERE status = 'open'`,

  // 3. Community Safety: User Mute / Block
  `CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'mute' CHECK (mode IN ('mute', 'block')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked
    ON public.user_blocks(blocked_id)`,

  // 4. Composite index for DB-backed hourly reply rate limiter (drop redundant single-column index)
  `CREATE INDEX IF NOT EXISTS idx_replies_author_created
    ON public.replies(author_id, created_at DESC)`,
  `DROP INDEX IF EXISTS public.idx_replies_author_id`,

  // 5. Enable Row Level Security (RLS) on ALL new tables
  `ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
  console.log(
    `✅ Đã áp dụng thành công schema Sprint 1B (${statements.length} câu lệnh SQL additive & idempotent).`
  );
} finally {
  await sql.end();
}
