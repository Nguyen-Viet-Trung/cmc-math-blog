import { redirect } from "next/navigation";
import { isSupabaseAuthConfigured } from "@/lib/env";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUserProfile();
  if (user) {
    redirect("/");
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <LoginForm isConfigured={isSupabaseAuthConfigured()} />
    </div>
  );
}
