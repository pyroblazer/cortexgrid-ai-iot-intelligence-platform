/**
 * Root Layout (app/layout.tsx)
 *
 * WHAT: This is the top-level layout that wraps EVERY page in the entire web app.
 *       Next.js requires this file -- it sets up the <html> and <body> tags.
 *
 * WHY IT EXISTS: Think of it like the foundation of a house. Every room (page) sits on
 *                top of this foundation. It provides things ALL pages need:
 *                - The font (Inter) used everywhere
 *                - SEO metadata (title, description for Google search results)
 *                - A dark mode script that runs BEFORE React loads (prevents flash of wrong theme)
 *                - React Query (for fetching data from the server)
 *                - WebSocket connection (for real-time device data)
 *                - Toast notifications (those little pop-up messages)
 *
 * Data flow: Providers wrap children like nested boxes.
 *   QueryProvider -> SocketProvider -> {children pages} -> Toaster
 *   The outer providers are available to all inner components.
 */

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/components/providers/query-provider";
import { SocketProvider } from "@/components/providers/socket-provider";
import "./globals.css";

// Load the Inter font from Google Fonts.
// "display: swap" means text shows immediately with a fallback font,
// then swaps to Inter once it finishes loading (prevents invisible text).
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// This metadata object controls what appears in the browser tab and Google search results.
// The "template" field means child pages can set their own title like "Devices | CortexGrid".
export const metadata: Metadata = {
  title: {
    default: "CortexGrid",
    template: "%s | CortexGrid",
  },
  description:
    "AI-powered IoT intelligence platform for real-time device management, telemetry analytics, and anomaly detection.",
  keywords: ["IoT", "AI", "telemetry", "device management", "anomaly detection"],
};

/**
 * RootLayout - The outermost shell of the entire application.
 *
 * @param children - Whatever page Next.js is currently showing (login, dashboard, etc.)
 *
 * Provider nesting order matters:
 * 1. QueryProvider: Gives all pages access to React Query for server data fetching
 * 2. SocketProvider: Establishes a WebSocket connection for real-time telemetry
 * 3. Toaster: Shows pop-up notifications anywhere in the app
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning prevents React warnings caused by the
    // dark mode script modifying the <html> class before React hydrates
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/* Inline script that runs BEFORE React loads.
            This prevents the "flash of wrong theme" problem.
            It checks localStorage for the user's theme preference,
            and falls back to the operating system's preference if none is set. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('cortexgrid-theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white font-sans antialiased dark:bg-dark-950">
        {/* QueryProvider: React Query context for caching and fetching server data */}
        <QueryProvider>
          {/* SocketProvider: Manages the WebSocket connection for real-time updates */}
          <SocketProvider>
            {/* The actual page content goes here */}
            {children}
            {/* Toaster: Global notification system for success/error popups */}
            <Toaster
              position="top-right"
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
              }}
            />
          </SocketProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
