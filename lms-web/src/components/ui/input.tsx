import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Use 'boxed' for search bars and librarian desk forms; 'underline' for auth forms */
  inputStyle?: "boxed" | "underline";
}

/**
 * Reading Room input.
 * - underline: border-bottom only, paper background, brass focus (used in auth)
 * - boxed: hairline full-border, paper-alt background (used in app screens)
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputStyle = "boxed", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full font-sans text-ink placeholder:text-ink-muted/60 transition-colors focus:outline-none",
          inputStyle === "underline"
            ? "border-0 border-b border-paper-line bg-transparent px-0.5 py-2 text-base focus:border-brass"
            : "border-0 border-b-2 border-ink bg-transparent px-1 py-2 text-sm focus:border-[#35507A]",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
