import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isDatabaseConfigured } from "@/lib/env";
import {
  getCategories,
  getCurrentUserProfile,
  getSiteSettings,
} from "@/lib/forum-service";
import { NewThreadForm } from "./NewThreadForm";

export default async function NewThreadPage() {
  const [user, categories, settings] = await Promise.all([
    getCurrentUserProfile(),
    getCategories(),
    getSiteSettings(),
  ]);

  const dbReady = isDatabaseConfigured();

  return (
    <div className="mx-auto max-w-[840px] space-y-5">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách bài toán
          </Link>
        </Button>
      </div>

      {dbReady && !user ? (
        <Card className="p-8 text-center sm:p-10">
          <h1 className="heading-2 mb-2">
            Bạn cần đăng nhập để đặt câu hỏi
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Hãy đăng nhập tài khoản học sinh để đăng bài toán và chọn lời giải
            đúng cộng điểm cho bạn bè nhé.
          </p>
          <Button asChild>
            <Link href="/login?next=/threads/new">Đi tới trang Đăng nhập</Link>
          </Button>
        </Card>
      ) : (
        <NewThreadForm
          categories={categories}
          defaultPoints={settings.defaultSolvedPoints}
          isAdmin={user?.role === "admin"}
        />
      )}
    </div>
  );
}
