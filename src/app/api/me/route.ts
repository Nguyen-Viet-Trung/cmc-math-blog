import { NextResponse } from "next/server";
import { isDatabaseConfigured, isSupabaseAuthConfigured } from "@/lib/env";
import { getCurrentUserProfile, getSiteSettings } from "@/lib/forum-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, user] = await Promise.all([
    getSiteSettings(),
    getCurrentUserProfile(),
  ]);

  return NextResponse.json(
    {
      siteName: settings.siteName,
      user,
      isDemoMode: !isDatabaseConfigured() || !isSupabaseAuthConfigured(),
    },
    {
      headers: {
        "Cache-Control": "private, no-cache",
      },
    }
  );
}
