"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/useAppSession";

export function CollectionsAdminAction({
  label = "Quản lý Chuyên đề",
  openCreate = false,
}: {
  label?: string;
  openCreate?: boolean;
}) {
  const { user } = useAppSession();
  if (user?.role !== "admin") return null;

  const href = openCreate
    ? "/admin?tab=collections&create=1"
    : "/admin?tab=collections";

  return (
    <Button asChild size="sm" variant="outline">
      <Link href={href} prefetch={false}>
        {label}
      </Link>
    </Button>
  );
}
