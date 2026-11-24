import { after, NextResponse } from "next/server";
import { isDatabaseConfigured, isSupabaseAuthConfigured } from "@/lib/env";
import { getCurrentUserProfile, getSiteSettings } from "@/lib/forum-service";
import { shouldTouchLastActiveAt } from "@/lib/onboarding";
import { touchUserLastActiveAt } from "@/lib/social-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settings, user] = await Promise.all([
    getSiteSettings(),
    getCurrentUserProfile(),
  ]);

  if (user && shouldTouchLastActiveAt(user.lastActiveAt)) {
    after(async () => {
      await touchUserLastActiveAt(user.id, user.lastActiveAt);
    });
  }

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
