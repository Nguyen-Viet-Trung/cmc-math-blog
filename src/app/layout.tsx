import type { Metadata } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { QueryProvider } from "@/components/QueryProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-be-vietnam",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["vietnamese", "latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CMC — CMA MATHS CLUB blog",
    template: "%s | CMC",
  },
  icons: {
    icon: "/icon.svg",
  },
  description:
    "CMA MATHS CLUB blog (CMC) — Cộng đồng học sinh hỏi đáp bài tập Toán học, bài News & Research, gõ công thức LaTeX, chia sẻ lời giải hay và tích điểm đổi quà.",
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "CMC — CMA MATHS CLUB blog",
    title: "CMC — CMA MATHS CLUB blog",
    description:
      "Cộng đồng học sinh hỏi đáp Toán học, bài News & Research, hỗ trợ LaTeX và tích điểm đổi quà.",
  },
  twitter: {
    card: "summary",
    title: "CMC — CMA MATHS CLUB blog",
    description:
      "Cộng đồng học sinh hỏi đáp Toán học, bài News & Research, hỗ trợ LaTeX và tích điểm đổi quà.",
  },
};

/**
 * RootLayout hoàn toàn phi-chặn (không gọi `cookies()` hay truy vấn mạng tại đây)
 * Zero-runtime CSS + shadcn/ui + next-themes + AppShell (Header Bar + Sidebar song song).
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnamPro.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-background text-foreground font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AppShell>{children}</AppShell>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
