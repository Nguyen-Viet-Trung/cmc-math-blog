import { redirect } from "next/navigation";
import { isSupabaseAuthConfigured } from "@/lib/env";
import { getCurrentUserId } from "@/lib/forum-service";
import { sanitizeRedirectPath } from "@/lib/rules";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [userId, params] = await Promise.all([
    getCurrentUserId(),
    searchParams,
  ]);
  const safeNext = sanitizeRedirectPath(params.next);

  if (userId) {
    redirect(safeNext);
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <LoginForm
        isConfigured={isSupabaseAuthConfigured()}
        nextPath={safeNext}
      />
    </div>
  );
}
