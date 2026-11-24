export type AdminTabId =
  | "rewards"
  | "redemptions"
  | "students"
  | "threads"
  | "collections"
  | "campaigns"
  | "replies"
  | "reports"
  | "feedbacks"
  | "rules"
  | "settings";

const VALID_ADMIN_TABS = new Set<AdminTabId>([
  "rewards",
  "redemptions",
  "students",
  "threads",
  "collections",
  "campaigns",
  "replies",
  "reports",
  "feedbacks",
  "rules",
  "settings",
]);

export function normalizeAdminTab(raw?: string | null): AdminTabId {
  if (raw && VALID_ADMIN_TABS.has(raw as AdminTabId)) {
    return raw as AdminTabId;
  }
  return "rewards";
}
