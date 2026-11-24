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
  console.error("❌ Thiếu DIRECT_URL / DATABASE_URL");
  process.exit(1);
}

const sql = postgres(dbUrl, { prepare: false, max: 1, connect_timeout: 10 });

const statements = [
  `CREATE INDEX IF NOT EXISTS idx_threads_content_trgm ON public.threads USING GIN (content extensions.gin_trgm_ops)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_cat_pinned_created ON public.threads(category_id, is_pinned DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_status_pinned_created ON public.threads(status, is_pinned DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_type_pinned_created ON public.threads(thread_type, is_pinned DESC, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_threads_created_desc ON public.threads(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_lower_display_name ON public.profiles(LOWER(display_name)) WHERE is_banned = FALSE`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_lower_nickname ON public.profiles(LOWER(nickname)) WHERE is_banned = FALSE AND nickname <> ''`,
  `CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard_active ON public.profiles(total_earned_points DESC, solved_count DESC, created_at ASC) WHERE is_banned = FALSE AND (total_earned_points > 0 OR solved_count > 0)`,
  `CREATE INDEX IF NOT EXISTS idx_rewards_active_cost ON public.rewards(points_cost ASC, created_at ASC) WHERE is_active = TRUE`,
  `DROP INDEX IF EXISTS public.idx_threads_author_id`,
  `DROP INDEX IF EXISTS public.idx_redemptions_user_id`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
  console.log(`✅ Đã áp dụng thành công ${statements.length} tối ưu index PostgreSQL.`);
} finally {
  await sql.end();
}
