"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { useAuthStore } from "@/stores/auth-store";
import { apiClient } from "@/lib/api-client";

interface TopBarProps {
  onToggleSidebar: () => void;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  createdAt: string;
  isRead: boolean;
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
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationItem[]>([]);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const [countResult, listResult] = await Promise.all([
        apiClient.get<{ count: number }>("/notifications/unread-count").catch(() => null),
        apiClient.get<{ data: NotificationItem[] }>("/notifications?pageSize=5").catch(() => null),
      ]);
      if (countResult) setUnreadCount(countResult.count ?? 0);
      if (listResult?.data) setRecentNotifications(listResult.data.slice(0, 5));
    } catch {
      // Notifications unavailable
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const breadcrumbs = useMemo(() => {
    const exactMatch = ROUTE_BREADCRUMBS[pathname];
    if (exactMatch) return exactMatch;
    if (pathname.startsWith("/devices/") && pathname !== "/devices") {
      return [{ label: "Devices", href: "/devices" }, { label: "Device Details" }];
    }
    return [{ label: "Dashboard" }];
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setUserDropdownOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setNotificationsOpen(false);
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

  const getNotifBg = (type: string) => {
    switch (type?.toUpperCase()) {
      case "ALERT": return "bg-primary-50 dark:bg-primary-900/20";
      case "BILLING": return "bg-warning-50 dark:bg-warning-900/20";
      case "SYSTEM": return "bg-dark-50 dark:bg-dark-800";
      default: return "bg-dark-50 dark:bg-dark-800";
    }
  };

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-dark-200 bg-white px-4 dark:border-dark-700 dark:bg-dark-900 sm:px-6">
      <button onClick={onToggleSidebar} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-100 lg:hidden dark:hover:bg-dark-800" aria-label="Toggle sidebar">
        <Menu className="h-5 w-5" />
      </button>

      <nav className="flex items-center gap-1 text-sm">
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-dark-400" />}
            {item.href ? (
              <a href={item.href} className="text-dark-500 transition-colors hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200">{item.label}</a>
            ) : (
              <span className="font-medium text-dark-900 dark:text-dark-100">{item.label}</span>
            )}
          </div>
        ))}
      </nav>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {searchExpanded ? (
          <form onSubmit={handleSearch} className="relative">
            <input type="text" value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)} placeholder="Search devices..." className="h-9 w-64 rounded-lg border border-dark-300 bg-white pl-9 pr-8 text-sm text-dark-900 placeholder:text-dark-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-100 dark:placeholder:text-dark-500" autoFocus />
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-dark-400" />
            <button type="button" onClick={() => { setSearchExpanded(false); setSearchQuery(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600"><X className="h-4 w-4" /></button>
          </form>
        ) : (
          <button onClick={() => setSearchExpanded(true)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800" aria-label="Search"><Search className="h-4 w-4" /></button>
        )}

        <div className="relative" ref={notificationsRef}>
          <button onClick={() => setNotificationsOpen(!notificationsOpen)} className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800" aria-label="Notifications">
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
                <h3 className="text-sm font-semibold text-dark-900 dark:text-dark-100">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
                {recentNotifications.length === 0 ? (
                  <p className="py-6 text-center text-sm text-dark-400">No notifications</p>
                ) : (
                  recentNotifications.map((notif) => (
                    <div key={notif.id} className={`mt-1 first:mt-0 rounded-lg px-3 py-2 ${getNotifBg(notif.type)}`}>
                      <p className="text-sm font-medium text-dark-800 dark:text-dark-200">{notif.title}</p>
                      <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">{notif.message}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-dark-200 px-4 py-2 dark:border-dark-700">
                <button onClick={() => { setNotificationsOpen(false); router.push("/settings"); }} className="w-full text-center text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={dropdownRef}>
          <button onClick={() => setUserDropdownOpen(!userDropdownOpen)} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50" aria-label="User menu">
            {(user as any)?.firstName?.[0] ?? "U"}
          </button>

          {userDropdownOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-dark-200 bg-white shadow-overlay dark:border-dark-700 dark:bg-dark-900">
              <div className="border-b border-dark-200 px-4 py-3 dark:border-dark-700">
                <p className="text-sm font-medium text-dark-900 dark:text-dark-100">
                  {(user as any) ? `${(user as any).firstName ?? ""} ${(user as any).lastName ?? ""}`.trim() : "User"}
                </p>
                <p className="mt-0.5 text-xs text-dark-500 dark:text-dark-400">{(user as any)?.email ?? ""}</p>
              </div>
              <div className="p-1.5">
                <button onClick={() => { setUserDropdownOpen(false); router.push("/settings"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-dark-700 hover:bg-dark-50 dark:text-dark-300 dark:hover:bg-dark-800">
                  <User className="h-4 w-4" />Profile
                </button>
                <button onClick={() => { setUserDropdownOpen(false); router.push("/settings"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-dark-700 hover:bg-dark-50 dark:text-dark-300 dark:hover:bg-dark-800">
                  <Settings className="h-4 w-4" />Settings
                </button>
                <div className="my-1 border-t border-dark-200 dark:border-dark-700" />
                <button onClick={() => { setUserDropdownOpen(false); logout(); router.push("/login"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-danger-600 hover:bg-danger-50 dark:text-danger-400 dark:hover:bg-danger-900/20">
                  <LogOut className="h-4 w-4" />Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
