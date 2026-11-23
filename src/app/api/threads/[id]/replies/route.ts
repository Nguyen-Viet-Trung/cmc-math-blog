import { NextResponse } from "next/server";
import {
  getCurrentUserProfile,
  getThreadDiscussionSnapshot,
} from "@/lib/forum-service";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const viewer = await getCurrentUserProfile();
    const snapshot = await getThreadDiscussionSnapshot(id, viewer?.id);

    if (!snapshot) {
      return NextResponse.json(
        { error: "Không tìm thấy chủ đề bài toán." },
        { status: 404 }
      );
    }

    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Không thể tải danh sách bình luận.",
      },
      { status: 500 }
    );
  }
}
