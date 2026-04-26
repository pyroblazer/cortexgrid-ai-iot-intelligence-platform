import React, { useState, useMemo, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";
import { LoadingSpinner } from "./LoadingSpinner";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
  render?: (row: T, rowIndex: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: "asc" | "desc" | null) => void;
  className?: string;
  stickyHeader?: boolean;
}

type SortState = {
  key: string;
  direction: "asc" | "desc";
} | null;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data available",
  pageSize = 10,
  pageSizeOptions,
  onPageChange,
  onSort,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Sorting ---- */
  const handleSort = useCallback(
    (key: string) => {
      let newSort: SortState;
      if (!sort || sort.key !== key) {
        newSort = { key, direction: "asc" };
      } else if (sort.direction === "asc") {
        newSort = { key, direction: "desc" };
      } else {
        newSort = null;
      }
      setSort(newSort);
      onSort?.(key, newSort?.direction ?? null);
      setCurrentPage(1);
    },
    [sort, onSort]
  );

  const sortedData = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.key];
      const bVal = (b as Record<string, unknown>)[sort.key];
      if (aVal === bVal) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pagedData = sortedData.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(1, Math.min(page, totalPages));
      setCurrentPage(clamped);
      onPageChange?.(clamped);
    },
    [totalPages, onPageChange]
  );

  /* ---- Render ---- */
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-dark-200 dark:border-dark-700", className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" role="table">
          <thead>
            <tr
              className={cn(
                "border-b border-dark-200 bg-dark-50 dark:border-dark-700 dark:bg-dark-800",
                stickyHeader && "sticky top-0 z-10"
              )}
            >
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-dark-600 dark:text-dark-400",
                    col.sortable && "cursor-pointer select-none hover:text-dark-900 dark:hover:text-dark-100",
                    col.headerClassName
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  aria-sort={
                    sort?.key === col.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                  scope="col"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span aria-hidden="true">
                        {sort?.key === col.key ? (
                          sort.direction === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-4 w-4 opacity-40" />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center"
                >
                  <LoadingSpinner size="md" text="Loading data..." />
                </td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-dark-500 dark:text-dark-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pagedData.map((row, rowIndex) => (
                <tr
                  key={keyExtractor(row)}
                  className="border-b border-dark-100 transition-colors hover:bg-dark-50/50 dark:border-dark-800 dark:hover:bg-dark-800/50"
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 py-3 text-dark-800 dark:text-dark-200",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row, rowIndex)
                        : String(
                            (row as Record<string, unknown>)[col.key] ?? ""
                          )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-dark-200 bg-dark-50 px-4 py-3 dark:border-dark-700 dark:bg-dark-800">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Showing{" "}
            <span className="font-medium text-dark-700 dark:text-dark-300">
              {(safeCurrentPage - 1) * pageSize + 1}
            </span>{" "}
            to{" "}
            <span className="font-medium text-dark-700 dark:text-dark-300">
              {Math.min(safeCurrentPage * pageSize, sortedData.length)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-dark-700 dark:text-dark-300">
              {sortedData.length}
            </span>{" "}
            results
          </p>
          <nav
            className="flex items-center gap-1"
            aria-label="Table pagination"
          >
            <button
              onClick={() => goToPage(safeCurrentPage - 1)}
              disabled={safeCurrentPage <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-600 hover:bg-dark-100 disabled:opacity-40 dark:text-dark-400 dark:hover:bg-dark-700"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => {
                if (totalPages <= 5) return true;
                if (p === 1 || p === totalPages) return true;
                return Math.abs(p - safeCurrentPage) <= 1;
              })
              .map((page, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev !== undefined && page - prev > 1;
                return (
                  <React.Fragment key={page}>
                    {showEllipsis && (
                      <span className="px-1 text-dark-400">...</span>
                    )}
                    <button
                      onClick={() => goToPage(page)}
                      className={cn(
                        "inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors",
                        page === safeCurrentPage
                          ? "bg-primary-600 text-white"
                          : "text-dark-600 hover:bg-dark-100 dark:text-dark-400 dark:hover:bg-dark-700"
                      )}
                      aria-current={
                        page === safeCurrentPage ? "page" : undefined
                      }
                      aria-label={`Page ${page}`}
                    >
                      {page}
                    </button>
                  </React.Fragment>
                );
              })}
            <button
              onClick={() => goToPage(safeCurrentPage + 1)}
              disabled={safeCurrentPage >= totalPages}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-600 hover:bg-dark-100 disabled:opacity-40 dark:text-dark-400 dark:hover:bg-dark-700"
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

DataTable.displayName = "DataTable";

export { DataTable };
