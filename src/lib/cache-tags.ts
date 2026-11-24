export const CACHE_TAGS = {
  siteSettings: "site-settings",
  categories: "categories",
  threads: "threads",
  leaderboard: "leaderboard",
  rewards: "rewards",
  feedbacks: "feedbacks",
  collections: "collections",
  forumRules: "forum-rules",
  campaigns: "campaigns",
  reports: "reports",
  userBlocks: "user-blocks",
  follows: "follows",
  activities: "activities",
} as const;

export function getUserBlocksCacheTag(userId: string): string {
  return `user-blocks:${userId}`;
}

export function getMemberFollowsCacheTag(memberId: string): string {
  return `member-follows:${memberId}`;
}
