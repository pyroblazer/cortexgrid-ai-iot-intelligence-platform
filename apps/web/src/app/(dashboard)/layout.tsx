/**
 * Dashboard Layout (app/(dashboard)/layout.tsx)
 *
 * WHAT: This layout wraps all pages inside the "(dashboard)" route group.
 *       It provides the sidebar navigation and top bar that appear on every
 *       dashboard page (devices, alerts, billing, AI assistant, etc.).
 *
 * WHY IT EXISTS: Every dashboard page shares the same chrome (sidebar + topbar).
 *               Instead of repeating this UI in each page, we define it once here.
 *               The "(dashboard)" folder name with parentheses is a Next.js convention --
 *               it creates a route GROUP without adding "/dashboard" to the URL.
 *
 * Data flow:
 *   - sidebarCollapsed state lives here (the parent), so the sidebar and topbar
 *     can both toggle it without complicated state management.
 *   - children = the actual page content (dashboard page, devices page, etc.)
 *   - The <main> element is scrollable so long pages scroll while the sidebar stays fixed.
 *
 * "use client" is required because this component uses useState (a client-side hook).
 */

"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";

/**
 * DashboardLayout - The authenticated shell with sidebar and top navigation.
 *
 * Layout structure (visual):
 * +----------+---------------------------+
 * |          |       TopBar              |
 * | Sidebar  |---------------------------+
 * | (collaps.|                           |
 *  | ible)   |   main (page content)     |
 * |          |   scrollable area         |
 * +----------+---------------------------+
 *
 * @param children - The specific dashboard page to render (devices, alerts, etc.)
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Controls whether the sidebar is collapsed (icons only) or expanded (icons + labels).
  // Shared between Sidebar and TopBar so either one can toggle it.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    // Full-height flex container: sidebar on left, content on right
    <div className="flex h-screen overflow-hidden bg-dark-50 dark:bg-dark-950">
      {/* Sidebar: Navigation links like Dashboard, Devices, Alerts, etc.
          Receives the collapsed state and a callback to toggle it. */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      {/* Right side: top bar + scrollable page content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* TopBar: Shows page title, user avatar, notifications, and a hamburger menu
            to toggle the sidebar on smaller screens. */}
        <TopBar onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)} />
        {/* The page content area. flex-1 makes it fill remaining space.
            overflow-y-auto allows scrolling when content is taller than the viewport.
            scrollbar-thin gives it a slim, modern scrollbar style. */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}
