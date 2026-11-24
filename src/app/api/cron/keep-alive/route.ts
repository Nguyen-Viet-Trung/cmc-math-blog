import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";

/**
 * Endpoint Cron chạy tự động 1 lần/ngày trên Vercel Hobby (cấu hình trong vercel.json)
 * Giúp Database Supabase Free luôn hoạt động, không bao giờ bị tạm dừng sau 7 ngày vắng truy cập.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (
    process.env.NODE_ENV === "production" &&
    (!cronSecret || authHeader !== `Bearer ${cronSecret}`)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: true, status: "demo_mode" });
  }

  try {
    const sql = getSql();
    await sql`SELECT 1 AS alive`;
    return NextResponse.json({
      ok: true,
      pingedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Database ping failed",
      },
      { status: 500 }
    );
  }
}
