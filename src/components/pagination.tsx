"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingsCount?: number;
}

function generatePagination(
  currentPage: number,
  totalPages: number,
  siblingsCount: number = 1
): (number | "ellipsis")[] {
  const pages: (number | "ellipsis")[] = [];

  // Always show first page
  pages.push(1);

  // Calculate range around current page
  const leftSibling = Math.max(2, currentPage - siblingsCount);
  const rightSibling = Math.min(totalPages - 1, currentPage + siblingsCount);

  // Add ellipsis after first page if needed
  if (leftSibling > 2) {
    pages.push("ellipsis");
  }

  // Add pages around current page
  for (let i = leftSibling; i <= rightSibling; i++) {
    if (i !== 1 && i !== totalPages) {
      pages.push(i);
    }
  }

  // Add ellipsis before last page if needed
  if (rightSibling < totalPages - 1) {
    pages.push("ellipsis");
  }

  // Always show last page if more than 1 page
  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingsCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = generatePagination(currentPage, totalPages, siblingsCount);

  return (
    <nav
      className="flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="gap-1"
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="hidden sm:inline">Prev</span>
      </Button>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="px-2 py-1 text-muted-foreground"
              >
                <MoreHorizontal className="w-4 h-4" />
              </span>
            );
          }

          const isActive = page === currentPage;

          return (
            <Button
              key={page}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`w-9 h-9 p-0 font-mono ${
                isActive ? "glow-orange" : ""
              }`}
              aria-label={`Go to page ${page}`}
              aria-current={isActive ? "page" : undefined}
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="gap-1"
        aria-label="Go to next page"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </nav>
  );
}

// Items per page selector
interface PageSizeSelectorProps {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
}

export function PageSizeSelector({
  value,
  onChange,
  options = [10, 20, 50],
}: PageSizeSelectorProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Show</span>
      <select
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="px-2 py-1 bg-input border border-border rounded-md text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">per page</span>
    </div>
  );
}

// Pagination info component
interface PaginationInfoProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export function PaginationInfo({
  currentPage,
  pageSize,
  totalItems,
}: PaginationInfoProps) {
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  return (
    <p className="text-sm text-muted-foreground">
      Showing{" "}
      <span className="font-mono text-foreground">
        {start}-{end}
      </span>{" "}
      of <span className="font-mono text-foreground">{totalItems}</span> objects
    </p>
  );
}
