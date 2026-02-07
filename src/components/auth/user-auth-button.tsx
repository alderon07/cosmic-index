"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { User, FolderHeart } from "lucide-react";
import { useAppAuth } from "./app-auth-provider";

/**
 * User Authentication Button
 *
 * Displays sign-in button when logged out, user avatar button when logged in.
 * Uses Clerk's modal sign-in for seamless UX without page navigation.
 *
 * The UserButton includes:
 * - User avatar/initials
 * - Dropdown with account management links
 * - Sign out option
 */
export function UserAuthButton() {
  const auth = useAppAuth();

  if (auth.mode === "mock") {
    return (
      <Link href="/user/saved-objects">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <FolderHeart className="w-4 h-4" />
          <span className="hidden sm:inline">Mock User</span>
        </Button>
      </Link>
    );
  }

  if (auth.mode === "none") {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-1.5 text-muted-foreground hover:text-foreground"
        disabled
        title="Authentication is not configured"
      >
        <User className="w-4 h-4" />
        <span className="hidden sm:inline">Auth Off</span>
      </Button>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
              userButtonTrigger:
                "focus:shadow-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-full",
            },
          }}
          afterSignOutUrl="/"
        />
      </SignedIn>
    </>
  );
}
