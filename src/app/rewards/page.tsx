import {
  getCurrentUserId,
  getCurrentUserProfile,
  listActiveRewards,
  listUserPointHistoryPaginated,
  listUserRedemptionsPaginated,
} from "@/lib/forum-service";
import { buildPaginatedResult } from "@/lib/pagination";
import { RewardsClient } from "./RewardsClient";

export default async function RewardsPage() {
  const userId = await getCurrentUserId();
  const [user, rewards, redemptions, pointHistory] = await Promise.all([
    userId ? getCurrentUserProfile() : Promise.resolve(null),
    listActiveRewards(),
    userId
      ? listUserRedemptionsPaginated(userId, 1, 8)
      : Promise.resolve(buildPaginatedResult([], 0, 1, 8)),
    userId
      ? listUserPointHistoryPaginated(userId, 1, 10)
      : Promise.resolve(buildPaginatedResult([], 0, 1, 10)),
  ]);

  return (
    <RewardsClient
      user={user}
      rewards={rewards}
      initialRedemptions={redemptions}
      initialPointHistory={pointHistory}
    />
  );
}
