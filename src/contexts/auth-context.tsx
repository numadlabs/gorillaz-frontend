"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { useStats } from "@/lib/query-helper";
import { UserStats } from "@/lib/types";

interface AuthContextType {
  // Wallet state
  address: string | undefined;
  isConnected: boolean;

  // Auth state
  token: string | null;
  user: UserStats | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  logout: () => void;
  refreshToken: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();

  const [token, setToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const queryClient = useQueryClient();
  // Fetch user stats only when we have a token
  const userQuery = useStats();

  // Function to read token from localStorage
  const refreshToken = useCallback(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("gorillaz_token");
      setToken(stored);
    }
  }, []);

  // Initialize token from localStorage on mount
  useEffect(() => {
    refreshToken();
    setIsInitialized(true);
  }, [refreshToken]);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gorillaz_token");
    }
    setToken(null);
    queryClient.clear();
    disconnect();
    router.push("/");
  }, [queryClient, disconnect, router]);

  const value: AuthContextType = {
    // Wallet state
    address,
    isConnected,

    // Auth state
    token,
    user: userQuery.data || null,
    isAuthenticated: !!token && !!userQuery.data,
    isLoading: !isInitialized || userQuery.isLoading,

    // Actions
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
