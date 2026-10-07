import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, children, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn("w-full bg-paper-alt text-sm font-sans", className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props}>{children}</thead>;
}

export function TableBody({ children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props}>{children}</tbody>;
}

export function TableRow({ className, children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-[#EAE3D0] last:border-0", className)}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className, children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-paper-line px-4 py-2.5 text-left text-[10px] font-sans text-ink-muted font-normal",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 text-ink", className)} {...props}>
      {children}
    </td>
  );
}
