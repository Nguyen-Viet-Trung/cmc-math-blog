import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function FieldGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field-group"
      className={cn("flex flex-col gap-5", className)}
      {...props}
    />
  );
}

function Field({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="field"
      className={cn(
        "flex flex-col gap-1.5 data-[disabled=true]:opacity-60",
        className
      )}
      {...props}
    />
  );
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} data-slot="field-label" className={className} {...props} />
));
FieldLabel.displayName = "FieldLabel";

function FieldDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-[11px] leading-relaxed text-muted-foreground", className)}
      {...props}
    />
  );
}

function FieldError({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    />
  );
}

export { FieldGroup, Field, FieldLabel, FieldDescription, FieldError };
