import {
  Bookmark,
  BookOpen,
  Bug,
  Gift,
  Layers,
  Trophy,
  type LucideIcon,
} from "lucide-react";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV_ITEMS: NavItemConfig[] = [
  { href: "/", label: "Diễn đàn", icon: BookOpen },
  { href: "/collections", label: "Chuyên đề", icon: Layers },
  { href: "/bookmarks", label: "Sổ tay", icon: Bookmark },
  { href: "/rewards", label: "Đổi quà", icon: Gift },
  { href: "/leaderboard", label: "Bảng vàng", icon: Trophy },
  { href: "/feedback", label: "Góp ý & Báo lỗi", icon: Bug },
];

export const SIDEBAR_STORAGE_KEY = "cmc-sidebar-collapsed";

export function getRoutePageTitle(pathname: string): string {
  if (pathname === "/") return "Diễn đàn";
  if (pathname === "/threads/new") return "Đăng bài viết mới";
  if (pathname.startsWith("/threads/")) return "Thảo luận bài toán";
  if (pathname.startsWith("/collections")) return "Bộ sưu tập Chuyên đề";
  if (pathname.startsWith("/bookmarks")) return "Sổ tay bài toán";
  if (pathname.startsWith("/rewards")) return "Đổi quà";
  if (pathname.startsWith("/leaderboard")) return "Bảng vàng";
  if (pathname.startsWith("/feedback")) return "Góp ý & Báo lỗi";
  if (pathname.startsWith("/profile")) return "Hồ sơ học sinh";
  if (pathname.startsWith("/members/")) return "Hồ sơ thành viên";
  if (pathname.startsWith("/login")) return "Đăng nhập";
  if (pathname.startsWith("/admin")) return "Admin Portal";
  return "CMC";
}

export function isNavRouteActive(effectivePath: string, href: string): boolean {
  if (href === "/") {
    return effectivePath === "/" || effectivePath.startsWith("/threads");
  }
  return effectivePath === href || effectivePath.startsWith(`${href}/`);
}
