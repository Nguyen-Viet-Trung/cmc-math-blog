# CMC — CMA MATHS CLUB blog

**CMA MATHS CLUB blog (CMC)** là ứng dụng web cộng đồng hỏi đáp, chia sẻ bài toán và thảo luận học thuật dành cho câu lạc bộ Toán học, xây dựng trên **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS + shadcn/ui** và **PostgreSQL / Supabase**.

---

## Tính năng nổi bật

### 1. Soạn thảo Toán học & Hiển thị Học thuật (`KaTeX` + Markdown)
- **Trình soạn thảo `MathEditor` & Tự động lưu nháp (`Draft Auto-save`):** Thanh công cụ chèn nhanh công thức LaTeX (phân số, căn thức, số mũ, hệ phương trình, tích phân, tổng Sigma, giới hạn, bất đẳng thức, ký hiệu hình học), xem trước trực tiếp và tự động lưu bản nháp vào `localStorage` kèm banner khôi phục / xóa nháp (tự dọn nháp cũ > 7 ngày, 0 truy vấn DB).
- **Khối nội dung tương tác & Hình vẽ Toán:** Hỗ trợ khối đóng/mở **Gợi ý (`:::hint`)**, **Lời giải ẩn (`:::solution`)**, **Nội dung ẩn (`:::spoiler`)**, vẽ **đồ thị hàm số SVG (`graph`)** và nhúng **GeoGebra (`geogebra`)**.
- **Tối ưu lưu trữ hình ảnh `WebP` tự động:** Chọn ảnh chụp đề/bài giải hoặc dán trực tiếp bằng `Ctrl + V` (tối đa `10MB`) -> trình duyệt tự thu phóng chuẩn `1600px` và nén sang `WebP` (`~80KB–180KB`); Backend & Supabase Storage kiểm tra chữ ký định dạng file (magic bytes) và khóa giới hạn an toàn `<= 1MB`, kèm xem phóng to **Lightbox**.

### 2. Diễn đàn Thảo luận Đa định dạng, Dòng hoạt động & Realtime
- **4 loại bài viết:**
  - **Hỏi bài (`question`):** Học sinh đăng bài, chủ bài viết đánh dấu **Lời giải đúng** để trao điểm thưởng tự động.
  - **Thử thách Tuần (`challenge`):** Hỗ trợ chế độ nộp bài ẩn (**Blind Submission**) kèm đồng hồ đếm ngược tới hạn chót; Admin chấm bài và trao thưởng cho một hoặc nhiều người thắng cuộc.
  - **Research (`research`)** & **News (`news`):** Chia sẻ chuyên đề nghiên cứu, tin tức Toán học và nhận thưởng điểm khuyến khích từ Ban Quản Trị.
- **Thảo luận sâu & Cập nhật tức thì:** Bình luận phân cấp (**Nested Replies**), nhắc tên thành viên (**`@mention`**), cảm ơn/bầu chọn lời giải hay (**Upvote**), và đồng bộ bình luận/trạng thái bài viết theo thời gian thực qua **Supabase Realtime Broadcast** (chỉ mở 1 channel duy nhất tại `/threads/[id]`).
- **Tìm kiếm & Bộ lọc Dropdown gọn gàng:** Tìm kiếm theo từ khóa (`pg_trgm`), lọc nhanh trên 1 hàng bằng menu Dropdown theo **Loại bài**, **Chuyên mục Toán** (bao gồm chuyên mục **Khác**), **Trạng thái** (`Chưa có lời giải` / `Chưa giải` / `Đã giải`) và phân trang linh hoạt.
- **Dòng hoạt động cộng đồng (`/activity`):** Cập nhật các câu hỏi mới, lời giải mới (tự động ẩn nội dung bài nộp Blind Submission), lời giải được chọn đúng, huy hiệu mới và giải đấu mới công bố theo **2 tab Khám phá *(cache 60s)* & Đang theo dõi *(JOIN `user_follows`, loại trừ tài khoản bị khóa/ẩn/chặn)*** với phân trang **Cursor Pagination `(created_at, id)`** (không dùng Realtime để bảo vệ hạn mức Free Tier).
- **Hướng dẫn khởi đầu (`Onboarding Checklist`):** Thẻ tiến độ 5 bước nhẹ nhàng trên trang chủ dành riêng cho thành viên mới đăng nhập (hoàn thiện hồ sơ, chọn chuyên mục Toán yêu thích, theo dõi thành viên, lưu bài toán vào Sổ tay, đăng bài hoặc gửi lời giải), tự đồng bộ tiến độ thực và có thể ẩn bất cứ lúc nào.

### 3. Giải đấu (Campaign), Giải thưởng (Award) & Bộ sưu tập Huy hiệu (Badge)
- **Trang Giải đấu (`/campaigns` & `/campaigns/[slug]`):** Hiển thị các giải đấu theo thời gian thực (*Đang diễn ra / Sắp mở / Đã kết thúc* chuẩn giờ Việt Nam `UTC+7`), danh sách bài thử thách, thanh tiến độ hoàn thành cá nhân, mốc mở khóa Award và bảng vinh danh thành viên đạt giải.
- **Tự động trao Award & Badge nguyên tử:** Khi Admin phê duyệt lời giải trong các thử thách thuộc giải đấu đang diễn ra, hệ thống tự động cộng tiến độ, mở khóa **Award**, gắn **Huy hiệu (Badge)**, cộng điểm thưởng vào cả 2 cột điểm, ghi nhận **quà Shop đi kèm** (trạng thái *Chờ trao / Đã trao*), chặn cấp trùng bằng `UNIQUE` và gửi thông báo tức thì.
- **Bộ sưu tập Huy hiệu (`/badges`):** Tổng hợp toàn bộ Huy hiệu & Giải thưởng đã công bố trong hệ thống, đánh dấu trạng thái *Đã sở hữu* cho người đang đăng nhập và hiển thị **Bảng vinh danh Top Sưu tầm Huy hiệu** dẫn trực tiếp tới hồ sơ công khai của từng thành viên.

### 4. Bộ sưu tập Chuyên đề (`/collections`) & Sổ tay cá nhân (`/bookmarks`)
- **Bộ sưu tập Chuyên đề (`/collections`):** Lộ trình ôn tập và tuyển tập các bài toán tiêu biểu được Admin biên tập theo chủ đề, hiển thị số lượng bài viết và tiến độ bài đã giải.
- **Sổ tay bài toán (`/bookmarks`):** Học sinh lưu nhanh các bài toán hay để xem lại và ôn luyện sau này.

### 5. Hệ thống Điểm số tách bạch, Bảng Vàng & Đổi quà
- **Phân tách rõ 2 loại điểm:**
  - **Điểm khả dụng (`points_balance`):** Dùng để đổi quà tại cửa hàng; tự động hoàn lại khi đơn đổi quà bị từ chối.
  - **Tổng điểm đạt được (`total_earned_points`):** Dùng để xếp hạng trên **Bảng Vàng**, giữ nguyên không bị tụt hạng khi học sinh đổi quà.
- **Giao dịch nguyên tử & Sổ cái minh bạch:** Mọi thao tác cộng/trừ/đổi/hoàn điểm đều chạy trong `PostgreSQL Transaction (FOR UPDATE)` và ghi vết đầy đủ tại `point_transactions`, chặn tự chọn lời giải của chính mình và chặn cộng điểm trùng lặp.
- **Bảng Vàng Cao Thủ (`/leaderboard`):** Vinh danh học sinh theo tổng điểm cống hiến và số lời giải đúng.
- **Cửa hàng Đổi quà (`/rewards`):** Hiển thị mốc điểm, tồn kho, lịch sử đơn đổi quà và trạng thái duyệt (*Chờ duyệt / Đã duyệt / Đã trao / Từ chối*).

### 6. Hồ sơ Thành viên, Theo dõi, An toàn Cộng đồng, Thông báo, Nội quy & Góp ý
- **Hồ sơ cá nhân (`/profile`) & Trang thành viên công khai (`/members/[id]`):** Cập nhật ảnh đại diện, biệt danh, cấp học, giới thiệu, đổi mật khẩu, tùy chỉnh **Tùy chọn thông báo (`Notification Preferences`)** theo 6 nhóm sự kiện và xem trước hồ sơ công khai. Trang công khai hiển thị nút **Theo dõi (`Follow`)**, **Huy hiệu tiêu biểu**, thống kê 4 cột, **tủ Huy hiệu & Giải thưởng (Badge & Award)** chi tiết cùng các bài viết gần đây (giữ riêng tư số dư đổi quà).
- **An toàn Cộng đồng (`Community Safety v1`):** Học sinh có thể **báo cáo nội dung vi phạm** (bài viết, bình luận, tài khoản — tối đa 5 báo cáo/ngày, chống trùng lặp bằng `UNIQUE` index) và **ẩn/chặn người dùng (`Mute / Block`)** để lọc sạch nội dung khỏi diễn đàn, bình luận và dòng hoạt động; tích hợp **Rate Limiting** chống spam ở tầng Server Actions.
- **Thông báo trong ứng dụng (`NotificationBell`):** Báo tức thì khi có bình luận mới, được `@mention`, được chọn lời giải đúng, nhận thưởng bài viết/Thử thách Tuần, mở khóa Award/Badge từ Giải đấu hoặc cập nhật đơn đổi quà; hỗ trợ **gộp thông báo trùng loại trong 15 phút** và tôn trọng cài đặt nhận thông báo của từng người dùng.
- **Nội quy Diễn đàn (`/rules`):** Trang Rich Text được cache tĩnh/ISR, tự động tạo **Mục lục nhanh** từ các tiêu đề mục và hỗ trợ Admin biên tập trực tiếp.
- **Góp ý & Báo lỗi (`/feedback`):** Học sinh gửi báo lỗi, góp ý UX hoặc đề xuất tính năng kèm ảnh chụp và theo dõi phản hồi công khai từ Ban Quản Trị.

### 7. Admin Portal Toàn diện (`/admin`)
- Giao diện quản trị phân nhóm theo Sub-Sidebar + Drawer/Action Menu gọn gàng (code-splitting theo tab & modal):
  - **Giải đấu & Huy hiệu:** Thiết kế trọn gói Campaign (thời gian từ ngày X tới ngày Y, màu bìa, bản nháp/công bố, xem trước bản nháp cho Admin), gắn bài thử thách hợp lệ, thiết kế nhiều mốc **Award + Điểm thưởng + Quà Shop + Huy hiệu (Icon & Màu sắc)**, theo dõi lịch sử nhận giải và xác nhận/hoàn tác trao quà Shop.
  - **Học sinh:** Tìm kiếm, điều chỉnh điểm theo **3 phạm vi** (*Cả hai / Chỉ điểm khả dụng / Chỉ tổng điểm đạt được*), chỉnh ngày gia nhập CLB, đặt lại mật khẩu, khóa/mở khóa tài khoản.
  - **Bài viết & Thưởng:** Ghim/đóng/xóa bài, đổi loại bài & hạn Thử thách Tuần, tùy chỉnh điểm thưởng lời giải và thưởng điểm cho tác giả bài viết hay.
  - **Chuyên đề:** Tạo/sửa/xuất bản chuyên đề và sắp xếp thứ tự các bài toán bên trong.
  - **Kiểm duyệt Bình luận & Chống Buff Điểm:** Tự động phát hiện dấu hiệu trao điểm chéo/lặp lại, lời giải bất thường; hỗ trợ thu hồi điểm hoặc xóa bình luận kèm tự động trừ điểm & dọn ảnh mồ côi trên Storage.
  - **Báo cáo vi phạm (`Moderation Queue`):** Xử lý các báo cáo nội dung từ học sinh (*Đã xử lý / Bỏ qua*) kèm ghi chú minh bạch và liên kết trực tiếp tới nội dung bị báo cáo.
  - **Quà tặng & Đơn đổi quà:** Quản lý danh mục quà, tồn kho và duyệt/hoàn tất/từ chối đơn (tự hoàn điểm + hoàn kho).
  - **Góp ý & Báo lỗi:** Phản hồi công khai và cập nhật tiến độ xử lý.
  - **Nội quy diễn đàn:** Trình biên tập **Rich Text Editor** (thanh công cụ định dạng, phím tắt `Ctrl+B/I/K`, chế độ **Soạn thảo / Chia đôi xem trước / Xem trước**, nút nạp lại mẫu gốc).
  - **Cài đặt chung:** Tùy chỉnh tên diễn đàn, điểm thưởng mặc định và thông báo ghim đầu trang chủ.

### 8. Trải nghiệm người dùng (UX), Điều hướng 3 tầng, Hiệu năng & Bảo mật
- **Điều hướng Sidebar phân tầng ưu tiên kèm header chia khối** (đồng bộ Desktop Sidebar thu gọn được & Mobile Drawer):
  - **Thảo luận Toán *(Primary)*:** Diễn đàn (`/`), Hoạt động (`/activity`).
  - **Học tập & Giải đấu *(Secondary)*:** Chuyên đề, Giải đấu, Bảng vàng, Sổ tay.
  - **Phần thưởng & Cộng đồng *(Supporting)*:** Cửa hàng quà, Bộ sưu tập Huy hiệu, Nội quy, Góp ý & Báo lỗi.
- **Light / Dark Mode đồng bộ** và **Hộp thoại xác nhận đăng xuất (`SignOutDialog`)** có hiệu ứng chuyển trạng thái mượt mà kèm dọn cache phiên làm việc và bản nháp cục bộ.
- **Bảo mật, Hiệu năng & Bảo trì Tự động:** Bật **Row Level Security (RLS)** trên toàn bộ bảng `public`, xác thực JWT cục bộ tốc độ cao, phân tầng cache (`unstable_cache` + `revalidateTag`), tối ưu connection pooling và chạy 1 **Vercel Cron duy nhất hằng ngày (`0 3 * * *`)** tại `/api/cron/keep-alive` để giữ Supabase Free hoạt động 24/7 đồng thời tự động dọn rác định kỳ (*TTL Pruning*: xóa `activities > 90 ngày`, `notifications` đã đọc `> 60 ngày` / chưa đọc `> 180 ngày`, `content_reports` đã đóng `> 180 ngày`).

---

## Hướng dẫn chạy ở máy cá nhân (Local)

1. Điền các thông số Supabase miễn phí của bạn vào file `key.txt` (xem mẫu tại `.env.example`).
2. Chạy lệnh khởi tạo tự động (tự đồng bộ `.env.local`, tạo bảng PostgreSQL, bật RLS, khởi tạo dữ liệu mẫu, nội quy & tạo kho lưu ảnh `math-forum-media`):
   ```bash
   npm run setup
   ```
3. Chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại `http://localhost:3000`.
   - *Mẹo nhỏ trên Supabase:* Để học sinh đăng ký xong vào dùng ngay không cần mở email bấm xác nhận, trong Supabase Dashboard bạn vào **Authentication → Providers → Email** và tắt mục **Confirm email**.

## Kiểm thử & Kiểm tra chất lượng

```bash
npm run typecheck   # Kiểm tra kiểu TypeScript
npm test            # Chạy bộ unit test (Vitest)
npm run build       # Kiểm tra lint/types & Build production Next.js
```

---

## Hướng dẫn đưa lên Internet miễn phí 100% với Vercel (0đ, không cần mua tên miền)

1. Tạo một repository mới trên https://github.com và đẩy code lên (các file `key.txt`, `DEPLOY.md` và `.env.local` đã được `.gitignore` khóa an toàn, không bị đẩy lên GitHub).
2. Truy cập https://vercel.com → Đăng nhập bằng **GitHub** → bấm **Add New... → Project** → chọn repository vừa đẩy lên.
3. Ở mục **Environment Variables** trên Vercel, dán các biến từ file `.env.local` (hoặc `key.txt`) sang, rồi bấm **Deploy**.
4. Chờ ~1 phút, Vercel sẽ cấp sẵn đường link `https://<ten-du-an>.vercel.app` chạy bảo mật HTTPS để gửi cho học sinh sử dụng ngay!
