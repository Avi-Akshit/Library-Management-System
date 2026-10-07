"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Search, MessageCircle, CalendarDays } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/display";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const isStaff = user?.roles.some((role) => ["librarian", "branch_admin", "super_admin"].includes(role));
  const isAdmin = user?.roles.some((role) => ["branch_admin", "super_admin"].includes(role));
  const links = [
    ...(isStaff ? [{ href: "/librarian", label: "Desk" }] : []),
    { href: "/catalog", label: "Catalog" },
    { href: "/search", label: "Find a title", icon: Search },
    { href: "/assistant", label: "Ask the Librarian", icon: MessageCircle },
    { href: "/rooms", label: "Study rooms", icon: CalendarDays },
    { href: "/member", label: "My Card" },
    ...(isAdmin ? [{ href: "/admin", label: "Overview" }] : []),
  ];

  if (isLoading) {
    return <div className="min-h-screen bg-paper p-12 font-serif text-xl text-ink-muted">Consulting the catalog...</div>;
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[224px_minmax(0,1fr)]">
      <aside className="flex min-h-[auto] flex-col gap-1 bg-stacks px-3 py-5 lg:min-h-screen lg:px-4 lg:py-6">
        <Link href="/catalog" className="mb-4 px-2 font-serif text-[20px] text-stacks-text">
          Card Catalog
          <span className="mt-1 block font-sans text-[9px] text-[#B7AD96]">LIBRARY MANAGEMENT SYSTEM</span>
        </Link>
        <nav className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== "/catalog" && pathname.startsWith(link.href));
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 border-l-[3px] border-transparent bg-[#5A4630] px-3 py-2.5 font-sans text-[11px] text-[#B7AD96] transition-transform hover:bg-[#6B5539] hover:text-stacks-text",
                  active && "translate-x-[3px] border-l-[#9C7A2E] bg-[#6B5539] text-stacks-text",
                )}
              >
                {Icon ? <Icon size={13} strokeWidth={1.5} /> : <span className="h-2 w-2 shrink-0 rounded-full bg-brass" />}
                {link.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto hidden border-t border-[#6B5539] px-2 pt-3 text-[10px] leading-relaxed text-[#B7AD96] lg:block">
          Signed in as {user?.name || "member"}
          <br />
          {user?.roles?.[0] ? roleLabel(user.roles[0]) : "Member"}
          <button type="button" onClick={logout} className="mt-3 flex items-center gap-2 text-[#EDE6D3] hover:text-brass">
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-9 lg:px-11 lg:py-9">{children}</main>
    </div>
  );
}
