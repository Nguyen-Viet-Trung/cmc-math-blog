import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/env";
import { incrementThreadViewCount } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const { id } = await context.params;
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown";

  const rate = checkRateLimit(`thread-view:${clientIp}:${id}`, {
    maxRequests: 1,
    windowMs: 60 * 1000,
  });
  if (!rate.allowed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  try {
    const updated = await incrementThreadViewCount(id);
    return NextResponse.json({ ok: updated });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
