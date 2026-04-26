"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Menu,
  Search,
  Bell,
  ChevronRight,
  Settings,
  LogOut,
  X,
  User,
} from "lucide-react";

interface TopBarProps {
  onToggleSidebar: () => void;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

const ROUTE_BREADCRUMBS: Record<string, BreadcrumbItem[]> = {
  "/dashboard": [{ label: "Dashboard" }],
  "/devices": [{ label: "Devices" }],
  "/devices/new": [
    { label: "Devices", href: "/devices" },
    { label: "New Device" },
  ],
  "/alerts": [{ label: "Alerts" }],
  "/alerts/rules": [
    { label: "Alerts", href: "/alerts" },
    { label: "Rules" },
  ],
  "/ai": [{ label: "AI Assistant" }],
  "/billing": [{ label: "Billing" }],
  "/settings": [{ label: "Settings" }],
};

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount] = useState(3);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const breadcrumbs = useMemo(() => {
    const exactMatch = ROUTE_BREADCRUMBS[pathname];
    if (exactMatch) return exactMatch;

    if (pathname.startsWith("/devices/") && pathname !== "/devices") {
      return [
        { label: "Devices", href: "/devices" },
        { label: "Device Details" },
      ];
    }

    return [{ label: "Dashboard" }];
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target as Node)
      ) {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/devices?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchExpanded(false);
      setSearchQuery("");
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-dark-200 bg-white px-4 dark:border-dark-700 dark:bg-dark-900 sm:px-6">
      <button
        onClick={onToggleSidebar}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-100 lg:hidden dark:hover:bg-dark-800"
        aria-label="Toggle sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-dark-400" />
            )}
            {item.href ? (
              <a
                href={item.href}
                className="text-dark-500 transition-colors hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
              >
                {item.label}
              </a>
            ) : (
              <span className="font-medium text-dark-900 dark:text-dark-100">
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {searchExpanded ? (
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search devices..."
              className="h-9 w-64 rounded-lg border border-dark-300 bg-white pl-9 pr-8 text-sm text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 dark:placeholder:text-dark-500"
              autoFocus
            />
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <button
              type="button"
              onClick={() => {
                setSearchExpanded(false);
                setSearchQuery("");
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setSearchExpanded(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
            aria-label="Search"
          >
            <Search className="h-4 w-4" />
          </button>
        )}

        <div className="relative" ref={notificationsRef}>
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger-600 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-dark-200 bg-white shadow-overlay dark:border-dark-700 dark:bg-dark-900">
              <div className="border-b border-dark-200 px-4 py-3 dark:border-dark-700">
                <h3 className="text-sm font-semibold text-dark-900 dark:text-dark-100">
                  Notifications
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                <div className="rounded-lg bg-primary-50 px-3 py-2 dark:bg-primary-900/20">
                  <p className="text-sm font-medium text-dark-800 dark:text-dark-200">
                    High Temperature Alert
                  </p>
                  <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">
                    Sensor A1 exceeded 30C threshold
                  </p>
                </div>
                <div className="mt-1 rounded-lg bg-warning-50 px-3 py-2 dark:bg-warning-900/20">
                  <p className="text-sm font-medium text-dark-800 dark:text-dark-200">
                    Device Offline
                  </p>
                  <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">
                    Motion Detector C1 is offline
                  </p>
                </div>
                <div className="mt-1 rounded-lg bg-dark-50 px-3 py-2 dark:bg-dark-800">
                  <p className="text-sm font-medium text-dark-800 dark:text-dark-200">
                    Firmware Update
                  </p>
                  <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">
                    New version available for Sensor A1
                  </p>
                </div>
              </div>
              <div className="border-t border-dark-200 px-4 py-2 dark:border-dark-700">
                <button className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
            aria-label="User menu"
          >
            U
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-dark-200 bg-white shadow-overlay dark:border-dark-700 dark:bg-dark-900">
              <div className="border-b border-dark-200 px-4 py-3 dark:border-dark-700">
                <p className="text-sm font-medium text-dark-900 dark:text-dark-100">
                  John Doe
                </p>
                <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">
                  john@example.com
                </p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-dark-700 hover:bg-dark-50 dark:text-dark-300 dark:hover:bg-dark-800"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-dark-700 hover:bg-dark-50 dark:text-dark-300 dark:hover:bg-dark-800"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
                <div className="my-1 border-t border-dark-200 dark:border-dark-700" />
                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    router.push("/login");
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
