import React, { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeClasses: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-[90vw]",
};

function Modal({
  open,
  onClose,
  title,
  description,
  children,
  actions,
  className,
  size = "md",
  closeOnOverlayClick = true,
  closeOnEscape = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /* ---- Escape key ---- */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        onClose();
      }
      // Focus trap
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    },
    [onClose, closeOnEscape]
  );

  /* ---- Lifecycle ---- */
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
      // Delay focus so the dialog renders first
      requestAnimationFrame(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          '[data-modal-close], button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      });
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      aria-describedby={description ? "modal-description" : undefined}
    >
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        onClick={closeOnOverlayClick ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full animate-fade-in rounded-xl border border-dark-200 bg-white shadow-overlay dark:border-dark-700 dark:bg-dark-900",
          sizeClasses[size],
          className
        )}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-dark-200 p-6 dark:border-dark-700">
            <div>
              {title && (
                <h2
                  id="modal-title"
                  className="text-lg font-semibold text-dark-900 dark:text-dark-50"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id="modal-description"
                  className="mt-1 text-sm text-dark-500 dark:text-dark-400"
                >
                  {description}
                </p>
              )}
            </div>
            <button
              data-modal-close
              onClick={onClose}
              className="ml-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-400 hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-800 dark:hover:text-dark-300"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Close button when no header */}
        {!title && !description && (
          <button
            data-modal-close
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-dark-400 hover:bg-dark-100 hover:text-dark-600 dark:hover:bg-dark-800 dark:hover:text-dark-300"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Content */}
        <div className="p-6">{children}</div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center justify-end gap-3 border-t border-dark-200 px-6 py-4 dark:border-dark-700">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

Modal.displayName = "Modal";

export { Modal };
