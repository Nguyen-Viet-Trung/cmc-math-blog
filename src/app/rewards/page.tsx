import {
  getCurrentUserProfile,
  listActiveRewards,
  listUserPointHistory,
  listUserRedemptions,
} from "@/lib/forum-service";
import { RewardsClient } from "./RewardsClient";

export default async function RewardsPage() {
  const user = await getCurrentUserProfile();
  const [rewards, redemptions, pointHistory] = await Promise.all([
    listActiveRewards(),
    user ? listUserRedemptions(user.id) : Promise.resolve([]),
    user ? listUserPointHistory(user.id) : Promise.resolve([]),
  ]);

  return (
    <RewardsClient
      user={user}
      rewards={rewards}
      redemptions={redemptions}
      pointHistory={pointHistory}
    />
  );
}
