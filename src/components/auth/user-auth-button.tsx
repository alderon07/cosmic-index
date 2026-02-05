"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

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
