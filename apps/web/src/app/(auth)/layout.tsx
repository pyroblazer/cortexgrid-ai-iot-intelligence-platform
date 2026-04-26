export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div
        className="hidden flex-1 bg-gradient-to-br from-primary-600 via-accent-600 to-primary-800 lg:flex lg:flex-col lg:items-center lg:justify-center"
        aria-hidden="true"
      >
        <div className="relative px-12 text-center">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDJ2LTJoMzR6bTAtMzBWMkgydjJoMzR6TTIgMjJ2MmgzNHYtMkgyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
          <div className="relative">
            <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
              <svg
                width="40"
                height="40"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect width="40" height="40" rx="8" fill="white" fillOpacity="0.15" />
                <path
                  d="M12 28V12h4l4 8 4-8h4v16h-4V18l-4 8-4-8v10h-4z"
                  fill="white"
                  fillOpacity="0.9"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white">
              CortexGrid
            </h1>
            <p className="mt-4 text-lg text-white/80">
              AI-Powered IoT Intelligence Platform
            </p>
            <p className="mt-2 max-w-md text-sm text-white/60">
              Monitor, analyze, and manage your IoT devices with real-time
              telemetry, anomaly detection, and actionable insights.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center bg-white px-4 dark:bg-dark-950 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
