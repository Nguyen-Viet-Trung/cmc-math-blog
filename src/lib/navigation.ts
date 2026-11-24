import {
  Activity,
  Award,
  Bookmark,
  BookOpen,
  Bug,
  Gift,
  Layers,
  Medal,
  ScrollText,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { FEATURE_FLAGS } from "./feature-flags";

export type NavGroupPriority = "primary" | "secondary" | "supporting";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroupConfig {
  id: NavGroupPriority;
  priority: NavGroupPriority;
  label: string;
  description: string;
  items: NavItemConfig[];
}

export const NAV_GROUPS: NavGroupConfig[] = [
  {
    id: "primary",
    priority: "primary",
    label: "Thảo luận Toán",
    description: "Câu hỏi, lời giải, thử thách và dòng hoạt động cộng đồng",
    items: [
      { href: "/", label: "Diễn đàn", icon: BookOpen },
      ...(FEATURE_FLAGS.activityFeed
        ? [{ href: "/activity", label: "Hoạt động", icon: Activity }]
        : []),
    ],
  },
  {
    id: "secondary",
    priority: "secondary",
    label: "Học tập & Giải đấu",
    description: "Chuyên đề, giải đấu, bảng xếp hạng và sổ tay cá nhân",
    items: [
      { href: "/collections", label: "Chuyên đề", icon: Layers },
      { href: "/campaigns", label: "Giải đấu", icon: Medal },
      { href: "/leaderboard", label: "Bảng vàng", icon: Trophy },
      { href: "/bookmarks", label: "Sổ tay", icon: Bookmark },
    ],
  },
  {
    id: "supporting",
    priority: "supporting",
    label: "Phần thưởng & Cộng đồng",
    description: "Cửa hàng quà, bộ sưu tập huy hiệu, nội quy và góp ý",
    items: [
      { href: "/rewards", label: "Cửa hàng quà", icon: Gift },
      { href: "/badges", label: "Bộ sưu tập Huy hiệu", icon: Award },
      { href: "/rules", label: "Nội quy", icon: ScrollText },
      { href: "/feedback", label: "Góp ý & Báo lỗi", icon: Bug },
    ],
  },
];

export const MAIN_NAV_ITEMS: NavItemConfig[] = NAV_GROUPS.flatMap(
  (group) => group.items
);

export const SIDEBAR_STORAGE_KEY = "cmc-sidebar-collapsed";

export function getRoutePageTitle(pathname: string): string {
  if (pathname === "/") return "Diễn đàn";
  if (pathname.startsWith("/activity")) return "Hoạt động cộng đồng";
  if (pathname === "/threads/new") return "Đăng bài viết mới";
  if (pathname.startsWith("/threads/")) return "Thảo luận bài toán";
  if (pathname.startsWith("/collections")) return "Bộ sưu tập Chuyên đề";
  if (pathname.startsWith("/campaigns")) return "Giải đấu & Huy hiệu";
  if (pathname.startsWith("/bookmarks")) return "Sổ tay bài toán";
  if (pathname.startsWith("/rewards")) return "Cửa hàng quà";
  if (pathname.startsWith("/badges")) return "Bộ sưu tập Huy hiệu";
  if (pathname.startsWith("/leaderboard")) return "Bảng vàng";
  if (pathname.startsWith("/rules")) return "Nội quy diễn đàn";
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
