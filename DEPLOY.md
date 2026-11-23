# Hướng dẫn Đưa Diễn đàn lên Internet Miễn phí 100% (Vercel + Supabase)

Hệ thống của bạn hiện **đã được kết nối và khởi tạo thành công 100%** với Supabase (bao gồm 9 bảng PostgreSQL, 5 chuyên mục Toán học, 4 mốc quà tặng mẫu và kho lưu trữ ảnh WebP `math-forum-media` giới hạn 1MB/ảnh).

---

## Bước 1: Thiết lập nhanh trên Supabase để học sinh đăng ký vào dùng ngay (1 phút)

Mặc định Supabase yêu cầu xác thực email khi đăng ký (gói Free giới hạn số lượng email xác thực gửi mỗi giờ). Để `< 100` học sinh tạo tài khoản xong vào hỏi bài ngay lập tức:

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → chọn Project của bạn.
2. Ở menu bên trái, chọn **Authentication** → **Providers** → bấm vào **Email**.
3. Tắt công tắc **Confirm email** (chuyển sang OFF) → bấm **Save**.
4. Đăng ký tài khoản đầu tiên của bạn trên web bằng đúng email đã khai báo ở `ADMIN_EMAIL` — hệ thống sẽ **tự động nâng tài khoản của bạn lên quyền Admin** để mở khóa nút **Admin Portal** trên thanh menu!

---

## Bước 2: Đưa Web lên mạng miễn phí với Vercel (3 phút — 0đ, không cần mua Domain)

> **Lưu ý quan trọng:** File `.env.local` trong thư mục dự án đã được chuẩn hóa sẵn toàn bộ khóa mới của Supabase kèm cổng kết nối **IPv4 Pooler** (`aws-1-ap-northeast-1.pooler.supabase.com`). Khi đưa lên Vercel, hãy dùng file `.env.local` này thay vì chép thủ công từ `key.txt`.

1. **Đẩy mã nguồn lên GitHub:**
   - Tạo 1 repository mới (chế độ **Private** hoặc **Public** đều được, vì `.gitignore` đã khóa chặt `key.txt` và `.env.local` không cho đẩy lên mạng) tại https://github.com/new.
   - Mở Terminal tại thư mục dự án và chạy:
     ```bash
     git init
     git add .
     git commit -m "Initial commit: CMC — CMA MATHS CLUB blog"
     git branch -M main
     git remote add origin https://github.com/<ten-github-cua-ban>/<ten-repo>.git
     git push -u origin main
     ```

2. **Deploy trên Vercel:**
   - Truy cập https://vercel.com → bấm **Continue with GitHub**.
   - Bấm **Add New...** → **Project** → bấm **Import** bên cạnh repository bạn vừa tạo.
   - Mở mục **Environment Variables** → bấm nút **Import `.env`** → chọn file **`.env.local`** trong thư mục máy tính của bạn (Vercel sẽ tự điền đủ cả 9 biến cấu hình trong 1 giây!).
   - Bấm nút **Deploy** và đợi khoảng 60 giây.

3. **Hoàn tất!**
   - Vercel sẽ cấp miễn phí cho bạn địa chỉ `https://<ten-du-an>.vercel.app` (có sẵn chứng chỉ bảo mật HTTPS và tự động chạy Cron Job mỗi ngày giữ Supabase luôn thức 24/7).
   - Bạn có thể đổi tên subdomain miễn phí tùy thích trong **Vercel Project → Settings → Domains** (ví dụ `https://diendantoan-hai.vercel.app`) và gửi link cho học sinh tham gia ngay!
