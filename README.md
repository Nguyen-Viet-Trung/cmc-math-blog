# CMC — CMA MATHS CLUB blog

**CMA MATHS CLUB blog (CMC)** là ứng dụng web cộng đồng hỏi đáp, chia sẻ bài toán và thảo luận học thuật dành cho câu lạc bộ Toán học, xây dựng trên **Next.js 15 (App Router)**, **TypeScript**, **Tailwind CSS + shadcn/ui** và **PostgreSQL / Supabase**.

---

## Tính năng nổi bật

### 1. Soạn thảo Toán học & Hiển thị Học thuật (`KaTeX` + Markdown)
- **Trình soạn thảo `MathEditor`:** Thanh công cụ chèn nhanh công thức LaTeX (phân số, căn thức, số mũ, hệ phương trình, tích phân, tổng Sigma, giới hạn, bất đẳng thức, ký hiệu hình học) và xem trước trực tiếp.
- **Khối nội dung tương tác & Hình vẽ Toán:** Hỗ trợ khối đóng/mở **Gợi ý (`:::hint`)**, **Lời giải ẩn (`:::solution`)**, **Nội dung ẩn (`:::spoiler`)**, vẽ **đồ thị hàm số SVG (`graph`)** và nhúng **GeoGebra (`geogebra`)**.
- **Tối ưu lưu trữ hình ảnh `WebP` tự động:** Chọn ảnh chụp đề/bài giải hoặc dán trực tiếp bằng `Ctrl + V` (tối đa `10MB`) -> trình duyệt tự thu phóng chuẩn `1600px` và nén sang `WebP` (`~80KB–180KB`); Backend & Supabase Storage kiểm tra chữ ký định dạng file (magic bytes) và khóa giới hạn an toàn `<= 1MB`, kèm xem phóng to **Lightbox**.

### 2. Diễn đàn Thảo luận Đa định dạng & Realtime
- **4 loại bài viết:**
  - **Hỏi bài (`question`):** Học sinh đăng bài, chủ bài viết đánh dấu **Lời giải đúng** để trao điểm thưởng tự động.
  - **Thử thách Tuần (`challenge`):** Hỗ trợ chế độ nộp bài ẩn (**Blind Submission**) kèm đồng hồ đếm ngược tới hạn chót; Admin chấm bài và trao thưởng cho một hoặc nhiều người thắng cuộc.
  - **Research (`research`)** & **News (`news`):** Chia sẻ chuyên đề nghiên cứu, tin tức Toán học và nhận thưởng điểm khuyến khích từ Ban Quản Trị.
- **Thảo luận sâu & Cập nhật tức thì:** Bình luận phân cấp (**Nested Replies**), nhắc tên thành viên (**`@mention`**), cảm ơn/bầu chọn lời giải hay (**Upvote**), và đồng bộ bình luận/trạng thái bài viết theo thời gian thực qua **Supabase Realtime Broadcast**.
- **Tìm kiếm & Lọc nhanh:** Tìm kiếm theo từ khóa (`pg_trgm`), lọc theo chuyên mục Toán, loại bài viết, trạng thái (`Chưa giải` / `Đã giải`) và phân trang linh hoạt.

### 3. Bộ sưu tập Chuyên đề (`/collections`) & Sổ tay cá nhân (`/bookmarks`)
- **Bộ sưu tập Chuyên đề (`/collections`):** Lộ trình ôn tập và tuyển tập các bài toán tiêu biểu được Admin biên tập theo chủ đề, hiển thị số lượng bài viết và tiến độ bài đã giải.
- **Sổ tay bài toán (`/bookmarks`):** Học sinh lưu nhanh các bài toán hay để xem lại và ôn luyện sau này.

### 4. Hệ thống Điểm số tách bạch, Bảng Vàng & Đổi quà
- **Phân tách rõ 2 loại điểm:**
  - **Điểm khả dụng (`points_balance`):** Dùng để đổi quà tại cửa hàng; tự động hoàn lại khi đơn đổi quà bị từ chối.
  - **Tổng điểm đạt được (`total_earned_points`):** Dùng để xếp hạng trên **Bảng Vàng**, giữ nguyên không bị tụt hạng khi học sinh đổi quà.
- **Giao dịch nguyên tử & Sổ cái minh bạch:** Mọi thao tác cộng/trừ/đổi/hoàn điểm đều chạy trong `PostgreSQL Transaction (FOR UPDATE)` và ghi vết đầy đủ tại `point_transactions`, chặn tự chọn lời giải của chính mình và chặn cộng điểm trùng lặp.
- **Bảng Vàng Cao Thủ (`/leaderboard`):** Vinh danh học sinh theo tổng điểm cống hiến và số lời giải đúng.
- **Cửa hàng Đổi quà (`/rewards`):** Hiển thị mốc điểm, tồn kho, lịch sử đơn đổi quà và trạng thái duyệt (*Chờ duyệt / Đã duyệt / Đã trao / Từ chối*).

### 5. Hồ sơ Thành viên, Thông báo, Nội quy & Góp ý
- **Hồ sơ cá nhân (`/profile`) & Trang thành viên công khai (`/members/[id]`):** Cập nhật ảnh đại diện, biệt danh, cấp học, giới thiệu, đổi mật khẩu và theo dõi tổng quan điểm; trang công khai hiển thị thành tích và các bài viết gần đây (giữ riêng tư số dư đổi quà).
- **Thông báo trong ứng dụng (`NotificationBell`):** Báo tức thì khi có bình luận mới, được `@mention`, được chọn lời giải đúng, nhận thưởng bài viết/Thử thách Tuần hoặc cập nhật đơn đổi quà.
- **Nội quy Diễn đàn (`/rules`):** Trang Rich Text được cache tĩnh/ISR, tự động tạo **Mục lục nhanh** từ các tiêu đề mục và hỗ trợ Admin biên tập trực tiếp.
- **Góp ý & Báo lỗi (`/feedback`):** Học sinh gửi báo lỗi, góp ý UX hoặc đề xuất tính năng kèm ảnh chụp và theo dõi phản hồi công khai từ Ban Quản Trị.

### 6. Admin Portal Toàn diện (`/admin`)
- Giao diện quản trị phân nhóm theo Sub-Sidebar + Drawer/Action Menu gọn gàng:
  - **Học sinh:** Tìm kiếm, điều chỉnh điểm theo **3 phạm vi** (*Cả hai / Chỉ điểm khả dụng / Chỉ tổng điểm đạt được*), chỉnh ngày gia nhập CLB, đặt lại mật khẩu, khóa/mở khóa tài khoản.
  - **Bài viết & Thưởng:** Ghim/đóng/xóa bài, đổi loại bài & hạn Thử thách Tuần, tùy chỉnh điểm thưởng lời giải và thưởng điểm cho tác giả bài viết hay.
  - **Chuyên đề:** Tạo/sửa/xuất bản chuyên đề và sắp xếp thứ tự các bài toán bên trong.
  - **Kiểm duyệt Bình luận & Chống Buff Điểm:** Tự động phát hiện dấu hiệu trao điểm chéo/lặp lại, lời giải bất thường; hỗ trợ thu hồi điểm hoặc xóa bình luận kèm tự động trừ điểm & dọn ảnh mồ côi trên Storage.
  - **Quà tặng & Đơn đổi quà:** Quản lý danh mục quà, tồn kho và duyệt/hoàn tất/từ chối đơn (tự hoàn điểm + hoàn kho).
  - **Góp ý & Báo lỗi:** Phản hồi công khai và cập nhật tiến độ xử lý.
  - **Nội quy diễn đàn:** Trình biên tập **Rich Text Editor** (thanh công cụ định dạng, phím tắt `Ctrl+B/I/K`, chế độ **Soạn thảo / Chia đôi xem trước / Xem trước**, nút nạp lại mẫu gốc).
  - **Cài đặt chung:** Tùy chỉnh tên diễn đàn, điểm thưởng mặc định và thông báo ghim đầu trang chủ.

### 7. Trải nghiệm người dùng (UX), Hiệu năng & Bảo mật
- **Light / Dark Mode đồng bộ**, Sidebar thu gọn được + Mobile Drawer responsive, và **Hộp thoại xác nhận đăng xuất (`SignOutDialog`)** có hiệu ứng chuyển trạng thái mượt mà.
- **Bảo mật & Hiệu năng:** Bật **Row Level Security (RLS)** trên toàn bộ bảng `public`, xác thực JWT cục bộ tốc độ cao, phân tầng cache (`unstable_cache` + `revalidateTag`), tối ưu connection pooling và tự động giữ Supabase Free hoạt động 24/7 qua **Vercel Cron** (`/api/cron/keep-alive` trong `vercel.json`).

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
npm run build       # Build production Next.js
```

---

## Hướng dẫn đưa lên Internet miễn phí 100% với Vercel (0đ, không cần mua tên miền)

1. Tạo một repository mới trên https://github.com và đẩy code lên (các file `key.txt`, `DEPLOY.md` và `.env.local` đã được `.gitignore` khóa an toàn, không bị đẩy lên GitHub).
2. Truy cập https://vercel.com → Đăng nhập bằng **GitHub** → bấm **Add New... → Project** → chọn repository vừa đẩy lên.
3. Ở mục **Environment Variables** trên Vercel, dán các biến từ file `.env.local` (hoặc `key.txt`) sang, rồi bấm **Deploy**.
4. Chờ ~1 phút, Vercel sẽ cấp sẵn đường link `https://<ten-du-an>.vercel.app` chạy bảo mật HTTPS để gửi cho học sinh sử dụng ngay!
