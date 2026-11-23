import {
  getCurrentUserProfile,
  listActiveRewards,
  listUserPointHistoryPaginated,
  listUserRedemptionsPaginated,
} from "@/lib/forum-service";
import { buildPaginatedResult } from "@/lib/pagination";
import { RewardsClient } from "./RewardsClient";

export default async function RewardsPage() {
  const user = await getCurrentUserProfile();
  const [rewards, redemptions, pointHistory] = await Promise.all([
    listActiveRewards(),
    user
      ? listUserRedemptionsPaginated(user.id, 1, 8)
      : Promise.resolve(buildPaginatedResult([], 0, 1, 8)),
    user
      ? listUserPointHistoryPaginated(user.id, 1, 10)
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
