.import { redirect } from "next/navigation";
import { ChangePasswordCard } from "@/app/profile/_components/ChangePasswordCard";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const user = await getCurrentUserProfile();
  if (!user) {
    redirect("/login?next=/profile");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <ProfileForm user={user} />
      <ChangePasswordCard />
    </div>
  );
}
