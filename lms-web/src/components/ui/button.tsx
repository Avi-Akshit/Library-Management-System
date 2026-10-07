import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
}

/**
 * Card Catalog buttons use library-stamp outlines.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-sans text-sm transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-40",
          {
            "border border-[#35507A] bg-transparent text-[#35507A] hover:bg-[#35507A] hover:text-paper": variant === "primary",
            "border border-paper-line bg-transparent text-ink hover:border-ink-muted":
              variant === "secondary",
            "bg-transparent text-ink-muted hover:text-ink": variant === "ghost",
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-5 text-sm": size === "md",
            "h-12 px-7 text-base": size === "lg",
          },
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
