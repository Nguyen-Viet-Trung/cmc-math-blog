"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppSession } from "@/hooks/useAppSession";

export function RulesAdminAction() {
  const { user } = useAppSession();
  if (user?.role !== "admin") return null;

  return (
    <Button asChild size="sm" variant="outline">
      <Link href="/admin?tab=rules" prefetch={false}>
        <Pencil className="h-3.5 w-3.5" />
        Chỉnh sửa Nội quy
      </Link>
    </Button>
  );
}
