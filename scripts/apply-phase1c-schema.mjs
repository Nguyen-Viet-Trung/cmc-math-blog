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
  // 1. Mở rộng profiles cho Onboarding Checklist & theo dõi hoạt động ngày (DAU)
  `ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{"favoriteCategories":[],"dismissed":false}'::jsonb,
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ`,

  // 2. Bảng Activity Feed (Denormalized public events + Cursor Pagination)
  `CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('new_question', 'new_solution', 'accepted_solution', 'badge_earned', 'campaign_launched')),
    target_type TEXT NOT NULL CHECK (target_type IN ('thread', 'reply', 'campaign', 'award')),
    target_id UUID NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    href TEXT NOT NULL DEFAULT '/',
    category_slug TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // 3. Cursor indexes cho Discover & Following tabs + index dọn dẹp TTL/orphan
  `CREATE INDEX IF NOT EXISTS idx_activities_created_id
    ON public.activities(created_at DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_activities_actor_created
    ON public.activities(actor_id, created_at DESC, id DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_activities_target
    ON public.activities(target_type, target_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_read_created
    ON public.notifications(is_read, created_at ASC)`,
  `CREATE INDEX IF NOT EXISTS idx_content_reports_resolved_prune
    ON public.content_reports((COALESCE(resolved_at, created_at)) ASC)
    WHERE status IN ('resolved', 'dismissed')`,

  // 4. Bật Row Level Security (RLS) bắt buộc trên bảng mới
  `ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
  console.log(
    `✅ Đã áp dụng thành công schema Sprint 1C (${statements.length} câu lệnh SQL additive & idempotent).`
  );
} finally {
  await sql.end();
}
