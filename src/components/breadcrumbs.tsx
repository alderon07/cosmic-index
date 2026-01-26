"use client";

import { ChevronRight, Home } from "lucide-react";

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

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  const jsonLd = generateBreadcrumbJsonLd(items);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={`flex items-center text-sm text-muted-foreground ${className}`}
      >
        <ol className="flex items-center flex-wrap gap-1">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
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
