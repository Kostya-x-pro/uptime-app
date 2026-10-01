"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import * as authApi from "@/features/auth/api";
import type { UserProfile } from "@/features/auth/api";

type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  status: AuthStatus;
  accessToken: string | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile | null) => void;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: { email: string; name: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  authorizedFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const setAuthenticated = useCallback((token: string) => {
    setAccessToken(token);
    setProfile(null);
    setStatus("authenticated");
  }, []);

  useEffect(() => {
    let active = true;

    void authApi
      .refresh()
      .then((response) => {
        if (active) {
          setAuthenticated(response.accessToken);
        }
      })
      .catch(() => {
        if (active) {
          setAccessToken(null);
          setProfile(null);
          setStatus("anonymous");
        }
      });

    return () => {
      active = false;
    };
  }, [setAuthenticated]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let active = true;
    void authApi.getProfile(accessToken)
      .then((response) => {
        if (active) {
          setProfile(response);
        }
      })
      .catch(() => {
        if (active) {
          setProfile(null);
        }
      });

    return () => {
      active = false;
    };
  }, [accessToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      accessToken,
      profile,
      setProfile,
      login: async (input) => {
        const response = await authApi.login(input);
        setAuthenticated(response.accessToken);
      },
      register: async (input) => {
        const response = await authApi.register(input);
        setAuthenticated(response.accessToken);
      },
      logout: async () => {
        try {
          await authApi.logout();
        } finally {
          setAccessToken(null);
          setProfile(null);
          setStatus("anonymous");
        }
      },
      authorizedFetch: (input, init = {}) => {
        if (!accessToken) {
          return Promise.reject(new Error("Authentication is required"));
        }
        const headers = new Headers(init.headers);
        headers.set("Authorization", `Bearer ${accessToken}`);
        return fetch(input, { ...init, headers, credentials: "include" });
      },
    }),
    [accessToken, profile, setAuthenticated, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
