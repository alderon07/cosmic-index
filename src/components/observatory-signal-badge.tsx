"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useAppAuth } from "@/components/auth/app-auth-provider";
import { fetchUnreadCount } from "@/components/observatory/api";
import { queryKeys } from "@/lib/query-keys";

export function formatUnreadCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

export function ObservatorySignalBadge() {
  const auth = useAppAuth();
  const userId = auth.userId;
  const { data: unreadCount = 0 } = useQuery({
    queryKey: queryKeys.observatoryUnreadCount(userId ?? "pending"),
    queryFn: fetchUnreadCount,
    enabled: auth.isLoaded && auth.isSignedIn && Boolean(userId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  if (!auth.isLoaded || !auth.isSignedIn || !userId) {
    return null;
  }

  return (
    <Link
      href="/user/observatory/signals"
      aria-label={unreadCount > 0 ? `${unreadCount} unread Signals` : "My Observatory Signals"}
      className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-orange-100/70 transition-colors hover:bg-orange-200/10 hover:text-orange-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300/70"
    >
      <Bell className="h-4 w-4" aria-hidden="true" />
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-[#160f0b] bg-aurora-violet px-1 text-center font-mono text-[9px] leading-4 text-white">
          {formatUnreadCount(unreadCount)}
        </span>
      ) : null}
    </Link>
  );
}
