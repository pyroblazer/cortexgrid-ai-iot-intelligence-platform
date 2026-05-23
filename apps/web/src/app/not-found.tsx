"use client";

import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark-50 dark:bg-dark-950">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-dark-900 dark:text-white">404</h1>
        <p className="mt-4 text-lg text-dark-500 dark:text-dark-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
