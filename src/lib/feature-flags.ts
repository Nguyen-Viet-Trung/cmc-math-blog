export type FeatureFlagKey =
  | "draftAutoSave"
  | "unansweredFilter"
  | "notificationPrefs"
  | "followSystem"
  | "communitySafety"
  | "activityFeed"
  | "onboarding";

export type FeatureFlagEnvKey =
  | "NEXT_PUBLIC_FF_DRAFT_AUTO_SAVE"
  | "NEXT_PUBLIC_FF_UNANSWERED_FILTER"
  | "NEXT_PUBLIC_FF_NOTIFICATION_PREFS"
  | "NEXT_PUBLIC_FF_FOLLOW_SYSTEM"
  | "NEXT_PUBLIC_FF_COMMUNITY_SAFETY"
  | "NEXT_PUBLIC_FF_ACTIVITY_FEED"
  | "NEXT_PUBLIC_FF_ONBOARDING";

export type FeatureFlags = Record<FeatureFlagKey, boolean>;

export const FEATURE_FLAG_ENV_MAP: Record<FeatureFlagKey, FeatureFlagEnvKey> = {
  draftAutoSave: "NEXT_PUBLIC_FF_DRAFT_AUTO_SAVE",
  unansweredFilter: "NEXT_PUBLIC_FF_UNANSWERED_FILTER",
  notificationPrefs: "NEXT_PUBLIC_FF_NOTIFICATION_PREFS",
  followSystem: "NEXT_PUBLIC_FF_FOLLOW_SYSTEM",
  communitySafety: "NEXT_PUBLIC_FF_COMMUNITY_SAFETY",
  activityFeed: "NEXT_PUBLIC_FF_ACTIVITY_FEED",
  onboarding: "NEXT_PUBLIC_FF_ONBOARDING",
};

export const DEFAULT_FEATURE_FLAGS: Readonly<FeatureFlags> = {
  draftAutoSave: true,
  unansweredFilter: true,
  notificationPrefs: true,
  followSystem: true,
  communitySafety: true,
  activityFeed: true,
  onboarding: true,
};

const FALSY_VALUES = new Set(["0", "false", "off", "no", "disabled"]);
const TRUTHY_VALUES = new Set(["1", "true", "on", "yes", "enabled"]);

export function parseFeatureFlagEnv(
  raw: string | undefined | null,
  defaultValue = true
): boolean {
  if (raw == null) return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (!normalized) return defaultValue;
  if (FALSY_VALUES.has(normalized)) return false;
  if (TRUTHY_VALUES.has(normalized)) return true;
  return defaultValue;
}

export function resolveFeatureFlags(
  env: Partial<Record<FeatureFlagEnvKey, string | undefined>>
): FeatureFlags {
  return {
    draftAutoSave: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_DRAFT_AUTO_SAVE,
      DEFAULT_FEATURE_FLAGS.draftAutoSave
    ),
    unansweredFilter: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_UNANSWERED_FILTER,
      DEFAULT_FEATURE_FLAGS.unansweredFilter
    ),
    notificationPrefs: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_NOTIFICATION_PREFS,
      DEFAULT_FEATURE_FLAGS.notificationPrefs
    ),
    followSystem: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_FOLLOW_SYSTEM,
      DEFAULT_FEATURE_FLAGS.followSystem
    ),
    communitySafety: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_COMMUNITY_SAFETY,
      DEFAULT_FEATURE_FLAGS.communitySafety
    ),
    activityFeed: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_ACTIVITY_FEED,
      DEFAULT_FEATURE_FLAGS.activityFeed
    ),
    onboarding: parseFeatureFlagEnv(
      env.NEXT_PUBLIC_FF_ONBOARDING,
      DEFAULT_FEATURE_FLAGS.onboarding
    ),
  };
}

/**
 * Đọc tĩnh từng biến `NEXT_PUBLIC_FF_*` để Next.js inline đúng ở cả Server & Client bundle.
 */
export function getFeatureFlags(): FeatureFlags {
  return resolveFeatureFlags({
    NEXT_PUBLIC_FF_DRAFT_AUTO_SAVE: process.env.NEXT_PUBLIC_FF_DRAFT_AUTO_SAVE,
    NEXT_PUBLIC_FF_UNANSWERED_FILTER:
      process.env.NEXT_PUBLIC_FF_UNANSWERED_FILTER,
    NEXT_PUBLIC_FF_NOTIFICATION_PREFS:
      process.env.NEXT_PUBLIC_FF_NOTIFICATION_PREFS,
    NEXT_PUBLIC_FF_FOLLOW_SYSTEM: process.env.NEXT_PUBLIC_FF_FOLLOW_SYSTEM,
    NEXT_PUBLIC_FF_COMMUNITY_SAFETY:
      process.env.NEXT_PUBLIC_FF_COMMUNITY_SAFETY,
    NEXT_PUBLIC_FF_ACTIVITY_FEED: process.env.NEXT_PUBLIC_FF_ACTIVITY_FEED,
    NEXT_PUBLIC_FF_ONBOARDING: process.env.NEXT_PUBLIC_FF_ONBOARDING,
  });
}

export const FEATURE_FLAGS: Readonly<FeatureFlags> = getFeatureFlags();

export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return getFeatureFlags()[flag];
}
