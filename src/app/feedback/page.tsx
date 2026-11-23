import { listPublicFeedbacksPaginated } from "@/app/actions/feedback";
import { getCurrentUserProfile } from "@/lib/forum-service";
import { FeedbackClient } from "./FeedbackClient";

export const metadata = {
  title: "Góp ý & Báo lỗi (Beta)",
  description:
    "Gửi báo cáo lỗi (bug report) hoặc đề xuất tính năng mới để hoàn thiện CMA MATHS CLUB blog (CMC).",
};

export default async function FeedbackPage() {
  const [user, paginated] = await Promise.all([
    getCurrentUserProfile(),
    listPublicFeedbacksPaginated({ page: 1, pageSize: 8 }),
  ]);

  return <FeedbackClient user={user} initialFeedbacks={paginated} />;
}
