"use client";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
          Authentication Error
        </h2>
        <p className="mt-2 text-sm text-dark-500 dark:text-dark-400">
          {error.message || "Something went wrong during authentication"}
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
