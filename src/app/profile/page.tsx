import { redirect } from "next/navigation";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUserProfile();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ProfileForm user={user} />
    </div>
  );
}
