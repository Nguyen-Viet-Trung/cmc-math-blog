import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        subtle: "border-transparent bg-primary/10 text-primary",
        outline: "border-border bg-transparent text-muted-foreground",
        destructive:
          "border-destructive/30 bg-destructive/10 text-destructive",
        bounty:
          "border-bounty-border bg-bounty-surface text-bounty-foreground font-semibold",
        success:
          "border-success-border bg-success-surface text-success-foreground font-semibold",
        successSolid: "border-transparent bg-success text-white font-semibold",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
