export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  nickname: string;
  avatarUrl: string | null;
  bio: string;
  gradeLevel: string;
  role: "student" | "admin";
  pointsBalance: number;
  totalEarnedPoints: number;
  solvedCount: number;
  isBanned: boolean;
  joinedAt: string;
  createdAt: string;
}

export interface Category {
  id: number;
  slug: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
}

export interface SiteSettings {
  siteName: string;
  defaultSolvedPoints: number;
  announcement: string;
}

export type ThreadType = "question" | "news" | "research";
export type ThreadStatus = "open" | "solved" | "closed";

export interface ThreadSummary {
  id: string;
  title: string;
  contentPreview: string;
  imageCount: number;
  gradeTag: string;
  threadType: ThreadType;
  bountyPoints: number;
  authorRewardPoints: number;
  status: "open" | "solved" | "closed";
  acceptedReplyId: string | null;
  isPinned: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    nickname?: string;
    avatarUrl: string | null;
    gradeLevel: string;
    role: "student" | "admin";
  };
  category: {
    id: number;
    slug: string;
    name: string;
    color: string;
  };
}

export interface ReplyItem {
  id: string;
  threadId: string;
  content: string;
  imageUrls: string[];
  isAccepted: boolean;
  upvotesCount: number;
  viewerHasUpvoted: boolean;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    nickname?: string;
    avatarUrl: string | null;
    gradeLevel: string;
    role: "student" | "admin";
    solvedCount: number;
  };
}

export interface ThreadDetail {
  id: string;
  title: string;
  content: string;
  imageUrls: string[];
  gradeTag: string;
  threadType: ThreadType;
  bountyPoints: number;
  authorRewardPoints: number;
  status: "open" | "solved" | "closed";
  acceptedReplyId: string | null;
  isPinned: boolean;
  viewCount: number;
  replyCount: number;
  createdAt: string;
  author: {
    id: string;
    displayName: string;
    nickname?: string;
    avatarUrl: string | null;
    gradeLevel: string;
    role: "student" | "admin";
  };
  category: {
    id: number;
    slug: string;
    name: string;
    color: string;
  };
  replies: ReplyItem[];
}

export interface ThreadDiscussionSnapshot {
  status: "open" | "solved" | "closed";
  threadType: ThreadType;
  acceptedReplyId: string | null;
  bountyPoints: number;
  authorRewardPoints: number;
  isPinned: boolean;
  replyCount: number;
  replies: ReplyItem[];
}

export interface AdminThreadManageItem {
  id: string;
  title: string;
  threadType: ThreadType;
  gradeTag: string;
  categoryName: string;
  status: "open" | "solved" | "closed";
  bountyPoints: number;
  authorRewardPoints: number;
  isPinned: boolean;
  replyCount: number;
  viewCount: number;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  authorBanned: boolean;
}

export interface RewardItem {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  pointsCost: number;
  stock: number;
  isActive: boolean;
  createdAt: string;
}

export interface RedemptionItem {
  id: string;
  userId: string;
  userDisplayName: string;
  userEmail: string;
  rewardId: string;
  rewardName: string;
  rewardImageUrl: string | null;
  pointsSpent: number;
  studentNote: string;
  adminNote: string;
  status: "pending" | "approved" | "fulfilled" | "rejected";
  createdAt: string;
}

export type FeedbackCategory = "bug" | "feature" | "ui_ux" | "other";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "closed";

export interface FeedbackItem {
  id: string;
  userId: string | null;
  authorName: string;
  contactEmail?: string;
  category: FeedbackCategory;
  title: string;
  description: string;
  pageUrl: string;
  imageUrls: string[];
  status: FeedbackStatus;
  adminReply: string;
  createdAt: string;
}

export interface PointTransactionItem {
  id: string;
  userId: string;
  userDisplayName?: string;
  amount: number;
  type:
    | "accepted_answer"
    | "admin_grant"
    | "admin_deduct"
    | "reward_redeem"
    | "reward_refund";
  reason: string;
  referenceId: string | null;
  createdAt: string;
}

export type ReplySuspicionCode =
  | "mutual_pair"
  | "repeated_pair"
  | "short_accepted"
  | "ultra_fast_reply";

export interface AdminReplyAuditItem {
  id: string;
  threadId: string;
  threadTitle: string;
  threadStatus: "open" | "solved" | "closed";
  threadBountyPoints: number;
  threadCreatedAt: string;
  threadAuthorId: string;
  threadAuthorName: string;
  threadAuthorEmail: string;
  replyAuthorId: string;
  replyAuthorName: string;
  replyAuthorEmail: string;
  replyAuthorGrade: string;
  replyAuthorPoints: number;
  replyAuthorSolvedCount: number;
  replyAuthorBanned: boolean;
  content: string;
  imageUrls: string[];
  isAccepted: boolean;
  upvotesCount: number;
  awardedPoints: number;
  acceptedByName: string | null;
  secondsAfterThread: number;
  createdAt: string;
}

export interface BuffPairSummary {
  pairKey: string;
  userAId: string;
  userAName: string;
  userAEmail: string;
  userBId: string;
  userBName: string;
  userBEmail: string;
  aAcceptedBCount: number;
  bAcceptedACount: number;
  totalAcceptedCount: number;
  totalPointsTransferred: number;
  isMutual: boolean;
}
