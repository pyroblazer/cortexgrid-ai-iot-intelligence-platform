import React, { useState, forwardRef, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactElement;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  title?: string;
  items: SidebarItem[];
  defaultOpen?: boolean;
}

export interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  sections: SidebarSection[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  activeItemId?: string;
}

/* -------------------------------------------------------------------------- */
/*  SidebarItem component                                                     */
/* -------------------------------------------------------------------------- */

interface SidebarItemProps {
  item: SidebarItem;
  depth?: number;
  collapsed?: boolean;
  activeItemId?: string;
}

function SidebarItemRow({ item, depth = 0, collapsed, activeItemId }: SidebarItemProps) {
  const [open, setOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = item.active ?? item.id === activeItemId;

  const handleClick = useCallback(() => {
    if (hasChildren) {
      setOpen((prev) => !prev);
    }
    item.onClick?.();
  }, [hasChildren, item]);

  const Tag = item.href ? "a" : "button";

  const sharedProps = {
    onClick: handleClick,
    className: cn(
      "group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
      "hover:bg-dark-100 dark:hover:bg-dark-800",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1",
      isActive
        ? "bg-primary-50 text-primary-700 dark:bg-primary-950/30 dark:text-primary-400"
        : "text-dark-600 dark:text-dark-400",
      depth > 0 && "ml-4 pl-3 text-xs"
    ),
    "aria-current": isActive ? "page" : undefined,
    ...(item.href ? { href: item.href } : {}),
  };

  return (
    <li role="none">
      <Tag {...sharedProps}>
        {item.icon &&
          React.cloneElement(item.icon, {
            className: cn(
              "h-5 w-5 shrink-0",
              isActive
                ? "text-primary-600 dark:text-primary-400"
                : "text-dark-400 group-hover:text-dark-600 dark:text-dark-500 dark:group-hover:text-dark-300",
              item.icon.props.className
            ),
            "aria-hidden": "true",
          })}
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{item.label}</span>
            {hasChildren && (
              <span aria-hidden="true" className="shrink-0">
                {open ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </span>
            )}
          </>
        )}
      </Tag>

      {/* Nested items */}
      {hasChildren && open && !collapsed && (
        <ul className="mt-1 space-y-0.5" role="group">
          {item.children!.map((child) => (
            <SidebarItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              collapsed={collapsed}
              activeItemId={activeItemId}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sidebar component                                                         */
/* -------------------------------------------------------------------------- */

const Sidebar = forwardRef<HTMLElement, SidebarProps>(
  (
    {
      className,
      sections,
      collapsed = false,
      onToggleCollapse,
      header,
      footer,
      activeItemId,
      ...props
    },
    ref
  ) => {
    return (
      <nav
        ref={ref}
        className={cn(
          "flex h-full flex-col border-r border-dark-200 bg-white dark:border-dark-700 dark:bg-dark-900",
          collapsed ? "w-16" : "w-64",
          "transition-all duration-200",
          className
        )}
        aria-label="Main navigation"
        {...props}
      >
        {/* Header */}
        {header && (
          <div className="flex items-center border-b border-dark-200 px-4 py-3 dark:border-dark-700">
            {header}
          </div>
        )}

        {/* Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-6" role="list">
            {sections.map((section) => (
              <li key={section.id} role="none">
                {section.title && !collapsed && (
                  <h4 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-dark-400 dark:text-dark-500">
                    {section.title}
                  </h4>
                )}
                <ul className="space-y-0.5" role="group">
                  {section.items.map((item) => (
                    <SidebarItemRow
                      key={item.id}
                      item={item}
                      collapsed={collapsed}
                      activeItemId={activeItemId}
                    />
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-dark-200 px-4 py-3 dark:border-dark-700">
            {footer}
          </div>
        )}
      </nav>
    );
  }
);

Sidebar.displayName = "Sidebar";

export { Sidebar };
