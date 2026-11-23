-- ============================================================================
-- SCHEMA CƠ SỞ DỮ LIỆU DIỄN ĐÀN TOÁN HỌC & TÍCH ĐIỂM ĐỔI QUÀ
-- Chạy tự động qua `npm run setup` hoặc dán vào SQL Editor của Supabase
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Hồ sơ người dùng (Học sinh & Admin)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  grade_level TEXT NOT NULL DEFAULT 'THPT',
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  points_balance INTEGER NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
  total_earned_points INTEGER NOT NULL DEFAULT 0 CHECK (total_earned_points >= 0),
  solved_count INTEGER NOT NULL DEFAULT 0 CHECK (solved_count >= 0),
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Chuyên mục Toán học
CREATE TABLE IF NOT EXISTS public.categories (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT 'blue',
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- 3. Cấu hình toàn diễn đàn (do Admin tùy chỉnh trên Admin Portal)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  site_name TEXT NOT NULL DEFAULT 'CMC',
  default_solved_points INTEGER NOT NULL DEFAULT 10 CHECK (default_solved_points > 0),
  announcement TEXT NOT NULL DEFAULT 'Chào mừng các bạn học sinh! Hãy đặt câu hỏi rõ ràng (hỗ trợ gõ công thức LaTeX hoặc đính kèm ảnh chụp đề) và giải bài giúp bạn bè để tích điểm đổi quà nhé.',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Chủ đề bài toán (Threads)
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  grade_tag TEXT NOT NULL DEFAULT 'Chung',
  thread_type TEXT NOT NULL DEFAULT 'question' CHECK (thread_type IN ('question', 'news', 'research')),
  bounty_points INTEGER NOT NULL DEFAULT 10 CHECK (bounty_points >= 0),
  author_reward_points INTEGER NOT NULL DEFAULT 0 CHECK (author_reward_points >= 0),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'solved', 'closed')),
  accepted_reply_id UUID,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  view_count INTEGER NOT NULL DEFAULT 0,
  reply_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Lời giải & Thảo luận (Replies)
CREATE TABLE IF NOT EXISTS public.replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  upvotes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Lượt cảm ơn / bầu chọn lời giải hay
CREATE TABLE IF NOT EXISTS public.reply_upvotes (
  reply_id UUID NOT NULL REFERENCES public.replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (reply_id, user_id)
);

-- 7. Sổ cái lịch sử biến động điểm (Point Ledger - chống gian lận & đối soát)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('accepted_answer', 'admin_grant', 'admin_deduct', 'reward_redeem', 'reward_refund')),
  reason TEXT NOT NULL,
  reference_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Danh mục Quà tặng theo mốc điểm do Admin thiết lập
CREATE TABLE IF NOT EXISTS public.rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_url TEXT,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Đơn yêu cầu đổi quà của học sinh
CREATE TABLE IF NOT EXISTS public.redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES public.rewards(id) ON DELETE RESTRICT,
  points_spent INTEGER NOT NULL CHECK (points_spent > 0),
  student_note TEXT NOT NULL DEFAULT '',
  admin_note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'fulfilled', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Góp ý, Báo lỗi & Đề xuất tính năng (Beta Feedback)
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'bug' CHECK (category IN ('bug', 'feature', 'ui_ux', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  page_url TEXT NOT NULL DEFAULT '',
  image_urls TEXT[] NOT NULL DEFAULT '{}',
  contact_name TEXT NOT NULL DEFAULT '',
  contact_email TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Thông báo trong ứng dụng (In-app Notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_reply', 'answer_accepted', 'author_reward', 'redemption_update', 'system')),
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  href TEXT NOT NULL DEFAULT '/',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes tối ưu tốc độ truy vấn
CREATE INDEX IF NOT EXISTS idx_threads_category_created ON public.threads(category_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_status_created ON public.threads(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_type_created ON public.threads(thread_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_thread_created ON public.replies(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_point_tx_user_created ON public.point_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status_created ON public.redemptions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_leaderboard ON public.profiles(total_earned_points DESC, solved_count DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_status_created ON public.feedbacks(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_threads_author_id ON public.threads(author_id);
CREATE INDEX IF NOT EXISTS idx_replies_author_id ON public.replies(author_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_user_id ON public.redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_redemptions_reward_id ON public.redemptions(reward_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON public.feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_reply_upvotes_user_id ON public.reply_upvotes(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_by ON public.point_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created ON public.notifications(user_id, is_read, created_at DESC);

-- Bật Row Level Security (RLS) trên toàn bộ bảng trong schema `public` (theo chuẩn bảo mật Supabase)
-- Ngăn chặn tuyệt đối việc dùng Publishable Key trên trình duyệt gọi thẳng PostgREST sửa điểm/quyền Admin.
-- Mọi truy vấn đọc/ghi hợp lệ đều đi qua tầng Next.js Server Actions & Database Transactions ở phía Backend.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Khởi tạo cấu hình mặc định
INSERT INTO public.site_settings (id, site_name, default_solved_points)
VALUES (1, 'CMC', 10)
ON CONFLICT (id) DO NOTHING;

-- Khởi tạo các chuyên mục Toán học mặc định (lấy cảm hứng từ Diễn đàn Toán học VMF)
INSERT INTO public.categories (slug, name, description, color, sort_order)
VALUES
  ('dai-so', 'Đại số & Bất đẳng thức', 'Phương trình, hệ phương trình, đa thức, bất đẳng thức & cực trị đại số', 'blue', 1),
  ('giai-tich', 'Giải tích & Hàm số', 'Giới hạn, đạo hàm, khảo sát hàm số, tích phân & phương trình vi phân', 'indigo', 2),
  ('hinh-hoc', 'Hình học phẳng & Không gian', 'Hình học cổ điển, tọa độ Oxy/Oxyz, lượng giác & phép biến hình', 'emerald', 3),
  ('so-hoc-to-hop', 'Số học & Tổ hợp - Xác suất', 'Chia hết, đồng dư, phương trình nghiệm nguyên, đếm, xác suất & đồ thị', 'amber', 4),
  ('de-thi-on-luyen', 'Đề thi & Ôn luyện', 'Thảo luận đề thi vào lớp 10 Chuyên, Học sinh giỏi, Đánh giá năng lực & Tốt nghiệp THPT', 'rose', 5)
ON CONFLICT (slug) DO NOTHING;
