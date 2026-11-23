"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";
import { isDatabaseConfigured } from "@/lib/env";
import {
  getCurrentUserProfile,
  redeemRewardTransaction,
} from "@/lib/forum-service";

export async function redeemRewardAction(input: {
  rewardId: string;
  studentNote: string;
}): Promise<{ ok: boolean; message?: string; error?: string }> {
  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      error: "Hệ thống đang bảo trì kết nối cơ sở dữ liệu. Vui lòng thử lại sau.",
    };
  }

  const user = await getCurrentUserProfile();
  if (!user) {
    return { ok: false, error: "Vui lòng đăng nhập để đổi quà." };
  }

  const note = input.studentNote.trim();
  if (note.length < 3 || note.length > 300) {
    return {
      ok: false,
      error: "Vui lòng ghi chú thông tin nhận quà (Lớp / SĐT / lời nhắn từ 3–300 ký tự) để Admin trao quà cho bạn.",
    };
  }

  try {
    const res = await redeemRewardTransaction({
      caller: user,
      rewardId: input.rewardId,
      studentNote: note,
    });

    revalidateTag(CACHE_TAGS.rewards);
    revalidatePath("/rewards");
    revalidatePath("/admin");

    return {
      ok: true,
      message: `Đổi quà "${res.rewardName}" (-${res.pointsSpent} điểm) thành công! Admin sẽ sớm kiểm tra và trao quà cho bạn.`,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Không thể thực hiện đổi quà.",
    };
  }
}
