import postgres, { type Sql } from "postgres";
import { getDatabaseUrl } from "../env";

declare global {
  // eslint-disable-next-line no-var
  var __mathForumSqlClient: Sql | undefined;
}

export function getSql(): Sql {
  const rawUrl = getDatabaseUrl();
  if (!rawUrl) {
    throw new Error(
      "Chưa cấu hình DATABASE_URL trong key.txt. Vui lòng điền key và chạy `npm run setup`."
    );
  }

  // Gỡ tham số `?pgbouncer=true` của Prisma khỏi chuỗi khi truyền vào driver `postgres.js`
  let cleanUrl = rawUrl;
  try {
    const parsed = new URL(rawUrl);
    parsed.searchParams.delete("pgbouncer");
    cleanUrl = parsed.toString();
  } catch {
    cleanUrl = rawUrl
      .replace(/([?&])pgbouncer=true(&|$)/, "$1")
      .replace(/[?&]$/, "");
  }

  if (!globalThis.__mathForumSqlClient) {
    // Cấu hình tối ưu cho Supabase Supavisor Transaction Pooler (:6543):
    // - prepare: false & fetch_types: false -> bỏ round-trip truy vấn pg_type (~180ms mỗi lần kết nối mới)
    // - idle_timeout: 60 & keep_alive: 30 -> giữ socket TCP/TLS ấm giữa các lần chuyển trang, tránh reconnect 500ms liên tục
    globalThis.__mathForumSqlClient = postgres(cleanUrl, {
      prepare: false,
      fetch_types: false,
      max: 10,
      idle_timeout: 60,
      max_lifetime: 60 * 10,
      connect_timeout: 8,
      keep_alive: 30,
    });
  }

  return globalThis.__mathForumSqlClient;
}
