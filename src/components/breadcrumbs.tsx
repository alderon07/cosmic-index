"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { getCategoryFromPath, getListUrl } from "@/lib/list-url-store";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  linkHoverClassName?: string;
}

// Resolve list URLs from sessionStorage
function resolveListUrls(items: BreadcrumbItem[]): BreadcrumbItem[] {
  return items.map((item) => {
    if (!item.href) return item;

    const category = getCategoryFromPath(item.href);
    if (category) {
      return { ...item, href: getListUrl(category) };
    }
    return item;
  });
}

export function Breadcrumbs({
  items,
  className = "",
  linkHoverClassName,
}: BreadcrumbsProps) {
  // Track mount state to avoid hydration mismatch (sessionStorage only available client-side)
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // This is a valid pattern for detecting client-side mount to access browser APIs
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  // Resolve list URLs only after mount to avoid hydration mismatch
  const resolvedItems = isMounted ? resolveListUrls(items) : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center text-sm text-muted-foreground ${className}`}
    >
      <ol className="flex items-center flex-wrap gap-1">
        {resolvedItems.map((item, index) => {
          const isLast = index === resolvedItems.length - 1;
          const isFirst = index === 0;
          const crumbKey = item.href
            ? `${item.href}:${item.label}`
            : `${item.label}:${isLast ? "current" : "node"}`;

          return (
            <li key={crumbKey} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className={`transition-colors flex items-center gap-1 ${
                    linkHoverClassName ?? "hover:text-primary"
                  }`}
                >
                  {isFirst && <Home className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={`flex items-center gap-1 ${
                    isLast ? "text-foreground font-medium" : ""
                  }`}
                  aria-current={isLast ? "page" : undefined}
                >
                  {isFirst && !item.href && <Home className="w-4 h-4" />}
                  <span
                    className={
                      isLast ? "truncate max-w-[200px] md:max-w-none" : ""
                    }
                  >
                    {item.label}
                  </span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
