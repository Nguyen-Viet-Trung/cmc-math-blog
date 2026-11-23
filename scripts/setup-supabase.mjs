import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";
import { createClient } from "@supabase/supabase-js";

const rootDir = process.cwd();
const envLocalPath = path.join(rootDir, ".env.local");

function loadEnvLocal() {
  if (!fs.existsSync(envLocalPath)) return;
  const content = fs.readFileSync(envLocalPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.endsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
let dbUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "CMC";
const defaultPoints = Number(process.env.DEFAULT_SOLVED_POINTS || "10") || 10;

const COMMON_SUPABASE_POOLER_HOSTS = [
  "aws-0-ap-southeast-1.pooler.supabase.com",
  "aws-1-ap-southeast-1.pooler.supabase.com",
  "aws-0-ap-northeast-1.pooler.supabase.com",
  "aws-1-ap-northeast-1.pooler.supabase.com",
  "aws-0-ap-southeast-2.pooler.supabase.com",
  "aws-0-us-east-1.pooler.supabase.com",
  "aws-1-us-east-1.pooler.supabase.com",
  "aws-0-us-west-1.pooler.supabase.com",
  "aws-0-eu-central-1.pooler.supabase.com",
  "aws-0-eu-west-1.pooler.supabase.com",
];

function extractProjectRef(urlStr) {
  const m = urlStr?.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/i);
  return m ? m[1] : null;
}

function extractPasswordFromPgUri(uri) {
  try {
    const parsed = new URL(uri);
    return decodeURIComponent(parsed.password || "");
  } catch {
    return null;
  }
}

function updateEnvLocalDbUrls(txPoolerUrl, sessionPoolerUrl) {
  if (!fs.existsSync(envLocalPath)) return;
  let content = fs.readFileSync(envLocalPath, "utf8");
  content = content
    .split(/\r?\n/)
    .filter((l) => !l.startsWith("DATABASE_URL=") && !l.startsWith("DIRECT_URL="))
    .join("\n")
    .trimEnd();
  content += `\nDATABASE_URL=${JSON.stringify(txPoolerUrl)}\nDIRECT_URL=${JSON.stringify(sessionPoolerUrl)}\n`;
  fs.writeFileSync(envLocalPath, content, "utf8");
}

async function resolveWorkingSqlClient(initialUri) {
  // Thử kết nối trực tiếp bằng chuỗi hiện tại trước
  try {
    const testSql = postgres(initialUri, {
      prepare: false,
      max: 1,
      connect_timeout: 6,
    });
    await testSql`SELECT 1`;
    return testSql;
  } catch (err) {
    const msg = String(err?.message || err);
    const isIpv6DirectHostIssue =
      msg.includes("ENOTFOUND") ||
      msg.includes("EHOSTUNREACH") ||
      msg.includes("ETIMEDOUT");

    if (!isIpv6DirectHostIssue) {
      throw err;
    }

    console.log(
      "ℹ️ Máy chủ kết nối trực tiếp db.<project>.supabase.co chỉ hỗ trợ IPv6. Đang tự động chuyển sang cổng IPv4 Supavisor Pooler..."
    );

    const projectRef = extractProjectRef(supabaseUrl);
    const password = extractPasswordFromPgUri(initialUri);
    if (!projectRef || !password) {
      throw err;
    }

    const encodedPass = encodeURIComponent(password);
    for (const host of COMMON_SUPABASE_POOLER_HOSTS) {
      const sessionUri = `postgresql://postgres.${projectRef}:${encodedPass}@${host}:5432/postgres`;
      const txUri = `postgresql://postgres.${projectRef}:${encodedPass}@${host}:6543/postgres?pgbouncer=true`;
      const probe = postgres(sessionUri, {
        prepare: false,
        max: 1,
        connect_timeout: 6,
      });
      try {
        await probe`SELECT 1`;
        console.log(`✅ Đã tự động tìm thấy IPv4 Pooler tại vùng: ${host}`);
        updateEnvLocalDbUrls(txUri, sessionUri);
        return probe;
      } catch {
        await probe.end().catch(() => {});
      }
    }

    throw new Error(
      "Không thể tự động dò vùng IPv4 Pooler. Hãy bấm nút Connect trên Supabase -> bật 'Session pooler' và dán chuỗi đó vào DATABASE_URL trong key.txt."
    );
  }
}

async function main() {
  if (!supabaseUrl || !serviceRoleKey || !dbUrl) {
    console.error(
      "\n❌ Thiếu cấu hình trong key.txt! Hãy điền NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY và DATABASE_URL rồi chạy lại `npm run setup`.\n"
    );
    process.exit(1);
  }

  console.log("🚀 Đang kết nối PostgreSQL trên Supabase để khởi tạo bảng dữ liệu...");
  const sql = await resolveWorkingSqlClient(dbUrl);

  try {
    // Dọn các kết nối bị treo (idle in transaction) nếu có từ phiên trước
    await sql`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE usename = current_user
        AND pid <> pg_backend_pid()
        AND state = 'idle in transaction'
    `.catch(() => {});

    const rawSchemaSql = fs.readFileSync(
      path.join(rootDir, "sql", "schema.sql"),
      "utf8"
    );
    const statements = rawSchemaSql
      .replace(/--.*$/gm, "")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await sql.unsafe(stmt);
    }

    await sql`
      UPDATE public.site_settings
      SET site_name = ${siteName}, default_solved_points = ${defaultPoints}
      WHERE id = 1
    `;

    const existingRewards = await sql`SELECT COUNT(*)::int AS count FROM public.rewards`;
    if (existingRewards[0].count === 0) {
      await sql`
        INSERT INTO public.rewards (name, description, points_cost, stock, is_active)
        VALUES
          ('Bút bi Thiên Long & Nhãn vở Toán học', 'Bộ 3 cây bút bi viết êm + sticker công thức Toán dành cho mốc khởi đầu.', 50, 20, true),
          ('Sổ tay Công thức & Tư duy Giải Toán', 'Sổ tay bìa cứng B5 ghi chú định lý Hình học & Bất đẳng thức.', 120, 10, true),
          ('Sách Chuyên đề Bất đẳng thức & Cực trị', 'Sách bồi dưỡng học sinh giỏi Toán chọn lọc có chữ ký tặng của thầy/admin.', 250, 5, true),
          ('Học bổng / Quà đặc biệt Vinh danh Tháng', 'Phần thưởng lớn dành cho học sinh tích cực giải bài giúp bạn bè nhất.', 500, 3, true)
      `;
      console.log("✅ Đã khởi tạo 4 mốc quà tặng mẫu trong cửa hàng đổi quà.");
    }

    if (adminEmail) {
      const updated = await sql`
        UPDATE public.profiles
        SET role = 'admin', updated_at = NOW()
        WHERE LOWER(email) = ${adminEmail}
        RETURNING email
      `;
      if (updated.length > 0) {
        console.log(`👑 Đã cấp quyền Admin cho tài khoản: ${adminEmail}`);
      } else {
        console.log(
          `ℹ️ Email Admin (${adminEmail}) đã được ghi nhận — ngay khi bạn đăng ký/đăng nhập trên web, hệ thống sẽ tự động nâng lên quyền Admin.`
        );
      }
    }

    console.log("✅ Khởi tạo cơ sở dữ liệu PostgreSQL thành công!");
  } finally {
    await sql.end();
  }

  console.log("📦 Đang kiểm tra & khởi tạo bucket lưu trữ ảnh WebP trên Supabase Storage...");
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const bucketName = "math-forum-media";
  const { data: buckets, error: listErr } = await supabaseAdmin.storage.listBuckets();
  if (listErr) {
    console.error("⚠️ Không thể liệt kê Storage Buckets:", listErr.message);
  } else {
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      const { error: createErr } = await supabaseAdmin.storage.createBucket(
        bucketName,
        {
          public: true,
          fileSizeLimit: 1048576,
          allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
        }
      );
      if (createErr) {
        console.error("⚠️ Lỗi tạo bucket:", createErr.message);
      } else {
        console.log(`✅ Đã tạo bucket công khai '${bucketName}' (giới hạn 1MB/ảnh, chuẩn WebP/PNG/JPG)!`);
      }
    } else {
      await supabaseAdmin.storage.updateBucket(bucketName, {
        public: true,
        fileSizeLimit: 1048576,
        allowedMimeTypes: ["image/webp", "image/jpeg", "image/png"],
      });
      console.log(`✅ Bucket '${bucketName}' đã sẵn sàng (giới hạn 1MB/ảnh)!`);
    }
  }

  console.log("\n🎉 HOÀN TẤT CÀI ĐẶT! Bạn có thể chạy `npm run dev` và truy cập http://localhost:3000\n");
}

main().catch((err) => {
  console.error("\n❌ Lỗi khi cài đặt Supabase:", err.message || err);
  process.exit(1);
});
