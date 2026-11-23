"use client";

import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg py-10">
      <Card className="space-y-4 p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h1 className="heading-2">Không thể tải dữ liệu lúc này</h1>
          <p className="text-sm text-muted-foreground">
            Kết nối tới cơ sở dữ liệu tạm thời bị gián đoạn hoặc đã xảy ra lỗi
            ngoài ý muốn. Vui lòng thử tải lại sau giây lát.
          </p>
          {error.digest && (
            <p className="font-mono text-[11px] text-muted-foreground">
              Mã lỗi: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          <Button type="button" onClick={() => reset()}>
            <RefreshCw className="h-4 w-4" />
            Thử tải lại
          </Button>
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="h-4 w-4" />
              Về trang chủ
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}
