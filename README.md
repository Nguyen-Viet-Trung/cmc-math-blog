# CMC — CMA MATHS CLUB blog

**CMA MATHS CLUB blog (CMC)** là ứng dụng web cộng đồng hỏi đáp & thảo luận Toán học, tích hợp cơ chế học sinh tự đánh dấu **Lời giải đúng** để cộng điểm tự động và đổi quà theo các mốc điểm do Admin thiết lập.

## Tính năng nổi bật

1. **Soạn thảo Toán học chuyên dụng (`KaTeX` + Markdown):**
   - Thanh công cụ chèn nhanh phân số, căn thức, hệ phương trình, tích phân, tổng Sigma, bất đẳng thức, ký hiệu hình học...
   - Xem trước trực tiếp công thức Toán trước khi đăng.
2. **Tối ưu lưu trữ hình ảnh chuẩn `WebP` tự động:**
   - Học sinh chọn ảnh chụp vở bài tập (hoặc bấm `Ctrl + V` dán thẳng ảnh chụp màn hình) nặng tới `10MB` -> trình duyệt tự động thu phóng chuẩn `1600px` và nén sang `WebP` (`~80KB–180KB`) trước khi gửi lên mạng.
   - Backend & Supabase Storage khóa cứng giới hạn an toàn `<= 1MB` và kiểm tra chữ ký định dạng file (magic bytes).
3. **Tích điểm giải bài & Chống gian lận:**
   - Học sinh đăng câu hỏi bấm chọn **"Lời giải đúng"** để hệ thống cộng điểm tự động trong một giao dịch cơ sở dữ liệu nguyên tử (`PostgreSQL FOR UPDATE`).
   - Chặn tự chọn câu trả lời của chính mình, chặn cộng điểm trùng lặp, lưu đầy đủ sổ cái biến động điểm (`point_transactions`).
4. **Cửa hàng Đổi quà & Admin Portal:**
   - Admin tùy chỉnh các phần quà theo mốc điểm bất kỳ, tải ảnh quà tặng, quản lý tồn kho.
   - Duyệt đơn đổi quà (nếu từ chối đơn, hệ thống tự động hoàn điểm & hoàn kho cho học sinh).
   - Quản lý danh sách học sinh, cộng thưởng/trừ điểm trực tiếp và tùy chỉnh mức điểm thưởng mặc định.
5. **Tự động giữ Database Free hoạt động 24/7:**
   - Tích hợp sẵn Vercel Cron (`/api/cron/keep-alive`) trong `vercel.json` ping mỗi ngày 1 lần để Supabase Free không bị tạm dừng sau 7 ngày.

---

## Hướng dẫn chạy ở máy cá nhân (Local)

1. Điền các thông số Supabase miễn phí của bạn vào file `key.txt`.
2. Chạy lệnh khởi tạo tự động (tự động đồng bộ `.env.local`, tạo bảng PostgreSQL, tạo dữ liệu mẫu & tạo kho lưu ảnh `math-forum-media`):
   ```bash
   npm run setup
   ```
3. Chạy máy chủ phát triển:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt tại `http://localhost:3000`.
   - *Mẹo nhỏ trên Supabase:* Để học sinh đăng ký xong vào dùng ngay không cần mở email bấm xác nhận, trong Supabase Dashboard bạn vào **Authentication → Providers → Email** và tắt mục **Confirm email**.

---

## Hướng dẫn đưa lên Internet miễn phí 100% với Vercel (0đ, không cần mua tên miền)

1. Tạo một repository mới trên https://github.com và đẩy code lên (file `key.txt` và `.env.local` đã được `.gitignore` khóa an toàn, không bị lộ lên GitHub).
2. Truy cập https://vercel.com → Đăng nhập bằng **GitHub** → bấm **Add New... → Project** → chọn repository vừa đẩy lên.
3. Ở mục **Environment Variables** trên Vercel, dán các biến từ file `.env.local` (hoặc `key.txt`) sang, rồi bấm **Deploy**.
4. Chờ ~1 phút, Vercel sẽ cấp sẵn cho bạn đường link `https://<ten-du-an>.vercel.app` chạy bảo mật HTTPS để gửi cho học sinh sử dụng ngay!
