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
  `CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    cover_color TEXT NOT NULL DEFAULT 'blue',
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_at > starts_at)
  )`,
  `CREATE TABLE IF NOT EXISTS public.campaign_threads (
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (campaign_id, thread_id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.campaign_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    required_completed_count INTEGER NOT NULL DEFAULT 1 CHECK (required_completed_count >= 1),
    bonus_points INTEGER NOT NULL DEFAULT 0 CHECK (bonus_points >= 0),
    reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
    badge_name TEXT NOT NULL,
    badge_icon TEXT NOT NULL DEFAULT 'trophy',
    badge_color TEXT NOT NULL DEFAULT 'amber',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS public.user_campaign_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    award_id UUID NOT NULL REFERENCES public.campaign_awards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    completed_count INTEGER NOT NULL DEFAULT 1 CHECK (completed_count >= 0),
    points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (points_awarded >= 0),
    reward_id UUID REFERENCES public.rewards(id) ON DELETE SET NULL,
    reward_status TEXT NOT NULL DEFAULT 'none' CHECK (reward_status IN ('none', 'pending', 'fulfilled')),
    awarded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (award_id, user_id)
  )`,
  `ALTER TABLE public.point_transactions DROP CONSTRAINT IF EXISTS point_transactions_type_check`,
  `ALTER TABLE public.point_transactions ADD CONSTRAINT point_transactions_type_check CHECK (type IN ('accepted_answer', 'admin_grant', 'admin_deduct', 'reward_redeem', 'reward_refund', 'challenge_reward', 'campaign_award'))`,
  `ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check`,
  `ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN ('new_reply', 'answer_accepted', 'author_reward', 'redemption_update', 'system', 'reply_mention', 'challenge_award', 'campaign_award'))`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_published_dates ON public.campaigns(is_published, starts_at DESC, ends_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_campaigns_created_by ON public.campaigns(created_by)`,
  `CREATE INDEX IF NOT EXISTS idx_campaign_threads_order ON public.campaign_threads(campaign_id, sort_order ASC, added_at ASC)`,
  `CREATE INDEX IF NOT EXISTS idx_campaign_threads_thread_id ON public.campaign_threads(thread_id)`,
  `CREATE INDEX IF NOT EXISTS idx_campaign_awards_campaign_order ON public.campaign_awards(campaign_id, required_completed_count ASC, sort_order ASC)`,
  `CREATE INDEX IF NOT EXISTS idx_campaign_awards_reward_id ON public.campaign_awards(reward_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_campaign_awards_user ON public.user_campaign_awards(user_id, awarded_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_user_campaign_awards_campaign ON public.user_campaign_awards(campaign_id, awarded_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_user_campaign_awards_reward ON public.user_campaign_awards(reward_id)`,
  `CREATE INDEX IF NOT EXISTS idx_user_campaign_awards_awarded_by ON public.user_campaign_awards(awarded_by)`,
  `ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.campaign_threads ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.campaign_awards ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.user_campaign_awards ENABLE ROW LEVEL SECURITY`,
];

try {
  for (const stmt of statements) {
    await sql.unsafe(stmt);
  }
  console.log(
    `✅ Đã áp dụng thành công schema Campaign–Award–Badge (${statements.length} câu lệnh SQL + RLS).`
  );
} finally {
  await sql.end();
}
