"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useMemo,
} from "react";
import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/nextjs";
import {
  getMockUserEmail,
  getMockUserId,
  getMockUserTier,
  isClerkClientConfigured,
  isMockAuthClientEnabled,
} from "@/lib/runtime-mode";

export type AppAuthMode = "clerk" | "mock" | "none";

export interface AppAuthState {
  mode: AppAuthMode;
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | null;
  email: string;
  tier: "free" | "pro";
  isPro: boolean;
}

const SIGNED_OUT_STATE: AppAuthState = {
  mode: "none",
  isLoaded: true,
  isSignedIn: false,
  userId: null,
  email: "",
  tier: "free",
  isPro: false,
};

const AppAuthContext = createContext<AppAuthState>(SIGNED_OUT_STATE);

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useClerkAuth();

  const state = useMemo<AppAuthState>(
    () => ({
      mode: "clerk",
      isLoaded,
      isSignedIn: Boolean(isSignedIn),
      userId: userId ?? null,
      email: "",
      tier: "free",
      isPro: false,
    }),
    [isLoaded, isSignedIn, userId]
  );

  return <AppAuthContext.Provider value={state}>{children}</AppAuthContext.Provider>;
}

export function AppAuthProvider({ children }: { children: ReactNode }) {
  const useMock = isMockAuthClientEnabled();

  if (useMock) {
    const tier = getMockUserTier();
    const state: AppAuthState = {
      mode: "mock",
      isLoaded: true,
      isSignedIn: true,
      userId: getMockUserId(),
      email: getMockUserEmail(),
      tier,
      isPro: tier === "pro",
    };

    return <AppAuthContext.Provider value={state}>{children}</AppAuthContext.Provider>;
  }

  if (isClerkClientConfigured()) {
    return (
      <ClerkProvider>
        <ClerkAuthBridge>{children}</ClerkAuthBridge>
      </ClerkProvider>
    );
  }

  return <AppAuthContext.Provider value={SIGNED_OUT_STATE}>{children}</AppAuthContext.Provider>;
}

export function useAppAuth(): AppAuthState {
  return useContext(AppAuthContext);
}
