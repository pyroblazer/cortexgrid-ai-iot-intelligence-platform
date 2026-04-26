"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { cn } from "@cortexgrid/ui";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Devices",
    href: "/devices",
    icon: Cpu,
  },
  {
    label: "Alerts",
    href: "/alerts",
    icon: AlertTriangle,
  },
  {
    label: "AI Assistant",
    href: "/ai",
    icon: Sparkles,
  },
  {
    label: "Billing",
    href: "/billing",
    icon: CreditCard,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={cn(
        "relative flex h-full flex-col border-r border-dark-200 bg-white transition-all duration-300 dark:border-dark-700 dark:bg-dark-900",
        collapsed ? "w-[4.5rem]" : "w-64"
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex h-16 items-center justify-between border-b border-dark-200 px-4 dark:border-dark-700">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-3 transition-opacity",
            collapsed && "justify-center"
          )}
          aria-label="CortexGrid Home"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
            <span className="text-sm font-bold text-white">CG</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold text-dark-900 dark:text-white">
              CortexGrid
            </span>
          )}
        </Link>
        <button
          onClick={onToggle}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md text-dark-400 hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-800 dark:hover:text-dark-300",
            collapsed &&
              "absolute -right-3 top-5 z-10 rounded-full border border-dark-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-800"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Sidebar navigation">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                  : "text-dark-600 hover:bg-dark-50 hover:text-dark-900 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-dark-200",
                collapsed && "justify-center px-2"
              )}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-dark-400 dark:text-dark-500"
                )}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-dark-200 px-4 py-3 dark:border-dark-700">
          <div className="rounded-lg bg-dark-50 px-3 py-2 dark:bg-dark-800">
            <p className="truncate text-xs font-medium text-dark-700 dark:text-dark-300">
              My Organization
            </p>
            <p className="truncate text-[11px] text-dark-400 dark:text-dark-500">
              Free Plan
            </p>
          </div>
        </div>
      )}

      <div
        className={cn(
          "border-t border-dark-200 px-3 py-3 dark:border-dark-700",
          collapsed && "flex justify-center"
        )}
      >
        <button
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-dark-500 transition-colors hover:bg-danger-50 hover:text-danger-600 dark:hover:bg-danger-900/20 dark:hover:text-danger-400",
            collapsed && "px-0"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
