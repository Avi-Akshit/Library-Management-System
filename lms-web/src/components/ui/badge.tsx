import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "available" | "reserved" | "overdue" | "checked_out";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block border px-2 py-0.5 font-sans text-[10px] leading-5",
        {
          "border-ink-muted text-ink-muted": variant === "default",
          "border-[#35507A] text-[#35507A]": variant === "checked_out" || variant === "reserved",
          "border-[#3E6B4A] text-[#3E6B4A]": variant === "available",
          "border-[#9C3B2E] text-[#9C3B2E]": variant === "overdue",
        },
        className,
      )}
      {...props}
    />
  );
}
