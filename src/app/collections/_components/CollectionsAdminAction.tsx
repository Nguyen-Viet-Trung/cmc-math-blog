"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/useAppSession";

export function CollectionsAdminAction({
  label = "Quản lý Chuyên đề",
}: {
  label?: string;
}) {
  const { user } = useAppSession();
  if (user?.role !== "admin") return null;

  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/admin" prefetch={false}>
        {label}
      </Link>
    </Button>
  );
}
