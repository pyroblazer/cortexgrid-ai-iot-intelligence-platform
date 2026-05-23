export default function DashboardLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        <p className="text-sm text-dark-500 dark:text-dark-400">Loading...</p>
      </div>
    </div>
  );
}
