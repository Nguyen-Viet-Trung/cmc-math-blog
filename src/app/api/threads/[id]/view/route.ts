import { after, NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/env";
import { incrementThreadViewCount } from "@/lib/forum-service";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }

  const { id } = await context.params;
  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
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

  after(async () => {
    try {
      await incrementThreadViewCount(id);
    } catch {
      // ignore non-critical view counter failure
    }
  });

  return NextResponse.json({ ok: true });
}
