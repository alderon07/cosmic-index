"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Home } from "lucide-react";
import { getCategoryFromPath, getListUrl } from "@/lib/list-url-store";

const BASE_URL = "https://cosmic-index.vercel.app";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

// Generate JSON-LD BreadcrumbList schema
// All content is static or from trusted sources, JSON.stringify escapes properly
function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  const itemListElement = items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.label,
    ...(item.href && { item: `${BASE_URL}${item.href}` }),
  }));

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  };
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

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  // JSON-LD uses original items (canonical URLs for SEO)
  const jsonLd = generateBreadcrumbJsonLd(items);

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
    <>
      {/* JSON-LD for SEO - uses canonical URLs, content from trusted sources */}
      <script
        type="application/ld+json"
        // Safe: jsonLd is generated from static labels/hrefs, JSON.stringify escapes special chars
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex items-center flex-wrap gap-1">
          {resolvedItems.map((item, index) => {
            const isLast = index === resolvedItems.length - 1;
            const isFirst = index === 0;

            return (
              <li key={index} className="flex items-center">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 mx-1 flex-shrink-0" />
                )}
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="hover:text-primary transition-colors flex items-center gap-1"
                  >
                    {isFirst && <Home className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <span
                    className={`flex items-center gap-1 ${
                      isLast ? "text-foreground font-medium" : ""
                    }`}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {isFirst && !item.href && <Home className="w-4 h-4" />}
                    <span className={isLast ? "truncate max-w-[200px] md:max-w-none" : ""}>
                      {item.label}
                    </span>
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
