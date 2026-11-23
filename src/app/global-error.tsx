"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="flex min-h-screen items-center justify-center bg-slate-950 p-6 font-sans text-slate-100 antialiased">
        <div className="w-full max-w-md space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6 text-center shadow-lg">
          <h1 className="text-lg font-bold text-white">
            Đã xảy ra sự cố không mong muốn
          </h1>
          <p className="text-sm leading-relaxed text-slate-400">
            {error?.message ||
              "Ứng dụng gặp lỗi tải trang tạm thời. Vui lòng thử tải lại."}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-md bg-blue-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-blue-400"
            >
              Thử lại ngay
            </button>
            <a
              href="/"
              className="rounded-md border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
            >
              Về trang chủ
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
