"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { ThemeConfig, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";

type ExportCategory = "exoplanets" | "stars" | "small-bodies";
type ExportFormat = "csv" | "json";

interface ExportButtonProps {
  category: ExportCategory;
  theme?: ThemeConfig;
}

export function ExportButton({
  category,
  theme = THEMES.exoplanets,
}: ExportButtonProps) {
  const auth = useAppAuth();
  const [format, setFormat] = useState<ExportFormat>("csv");
  const [isLoading, setIsLoading] = useState(false);

  if (!auth.isSignedIn || !auth.isPro) {
    return null;
  }

  const handleExport = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          category,
        }),
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const href = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().slice(0, 10);
      link.href = href;
      link.download = `cosmic-index-${category}-${date}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    } catch (error) {
      console.error("Export failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center gap-2 sm:w-auto sm:justify-start">
      <Select value={format} onValueChange={(value) => setFormat(value as ExportFormat)}>
        <SelectTrigger className={cn("h-8 w-[88px] flex-none text-xs font-mono", theme.sortSelect)}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="csv" className={theme.selectItemFocus}>
            CSV
          </SelectItem>
          <SelectItem value="json" className={theme.selectItemFocus}>
            JSON
          </SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={cn("h-8 gap-1.5 whitespace-nowrap", theme.sortSelect, theme.text)}
        onClick={() => {
          void handleExport();
        }}
        disabled={isLoading}
      >
        {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Export
      </Button>
    </div>
  );
}
