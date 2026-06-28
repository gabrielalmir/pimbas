"use client";

/* eslint-disable react-refresh/only-export-components */
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  fetchMe,
  getAuthSnapshot,
  login as storeLogin,
  logout as storeLogout,
  signup as storeSignup,
  subscribe,
} from "@/lib/auth";
import type { PlayerProfile, User } from "@/lib/domain";

export type AuthStatus = "anonymous" | "loading" | "needs-profile" | "ready";

export function deriveAuthStatus(params: {
  authenticated: boolean;
  isLoading: boolean;
  playerProfile: PlayerProfile | null | undefined;
}): AuthStatus {
  if (params.isLoading) return "loading";
  if (!params.authenticated) return "anonymous";
  if (!params.playerProfile) return "needs-profile";
  return "ready";
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  profile: PlayerProfile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  reloadMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const tokens = useSyncExternalStore(subscribe, getAuthSnapshot, getAuthSnapshot);
  const authenticated = Boolean(tokens?.accessToken);

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: fetchMe,
    enabled: authenticated,
    retry: false,
    staleTime: Infinity,
  });

  const login = useCallback(
    async (email: string, password: string) => {
      await storeLogin(email, password);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      await storeSignup(email, password, name);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const logout = useCallback(() => {
    storeLogout();
    queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const reloadMe = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }, [queryClient]);

  const status = deriveAuthStatus({
    authenticated,
    isLoading: meQuery.isLoading,
    playerProfile: meQuery.data?.playerProfile,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user: meQuery.data?.user ?? null,
      profile: meQuery.data?.playerProfile ?? null,
      login,
      signup,
      logout,
      reloadMe,
    }),
    [status, meQuery.data, login, signup, logout, reloadMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
