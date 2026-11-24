"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/useAppSession";

export function CampaignsAdminAction({
  label = "Quản lý Giải đấu",
  openCreate = false,
}: {
  label?: string;
  openCreate?: boolean;
}) {
  const { user } = useAppSession();
  if (user?.role !== "admin") return null;

  const href = openCreate
    ? "/admin?tab=campaigns&create=1"
    : "/admin?tab=campaigns";

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href} prefetch={false}>
        {label}
      </Link>
    </Button>
  );
}
