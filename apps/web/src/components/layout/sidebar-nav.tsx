"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  FileQuestion,
  LayoutDashboard,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { href: "/dashboard/exams", label: "Editais", icon: BookOpen },
  { href: "/dashboard/questions", label: "Questões", icon: FileQuestion },
  { href: "/dashboard/analytics", label: "Performance", icon: BarChart3 },
  { href: "/dashboard/hermes", label: "Hermes (WhatsApp)", icon: MessageCircle },
] as const;

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="grid gap-1 px-4">
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/dashboard"
            ? pathname === href
            : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "group flex items-center justify-between border-l-2 px-3 py-2.5 font-mono text-xs transition-all duration-200 rounded-none",
              active
                ? "border-primary bg-primary/10 text-primary glow-cyan font-bold"
                : "border-transparent text-muted-foreground hover:border-muted hover:bg-muted/30 hover:text-foreground",
            )}
          >
            <div className="flex items-center gap-3">
              <Icon className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                active ? "text-primary drop-shadow-[0_0_2px_rgba(6,182,212,0.5)]" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span>{label}</span>
            </div>
            {active && (
              <span className="text-[10px] text-primary/70 animate-pulse select-none font-bold">
                ●
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
