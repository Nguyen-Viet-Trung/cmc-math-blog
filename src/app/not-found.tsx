import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FileQuestion className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="heading-2">Không tìm thấy trang hoặc bài toán</h1>
          <p className="text-sm text-muted-foreground">
            Nội dung bạn tìm kiếm không tồn tại hoặc đã được quản trị viên gỡ
            bỏ.
          </p>
        </div>

        <div className="pt-2">
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Quay lại diễn đàn CMC
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
