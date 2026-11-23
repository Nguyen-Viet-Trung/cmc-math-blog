import { listPublicFeedbacksPaginatedCached } from "@/lib/feedback-service";
import { FeedbackClient } from "./FeedbackClient";

export const metadata = {
  title: "Góp ý & Báo lỗi (Beta)",
  description:
    "Gửi báo cáo lỗi (bug report) hoặc đề xuất tính năng mới để hoàn thiện CMA MATHS CLUB blog (CMC).",
};

export default async function FeedbackPage() {
  const paginated = await listPublicFeedbacksPaginatedCached({
    page: 1,
    pageSize: 8,
  });

  return <FeedbackClient initialFeedbacks={paginated} />;
}
