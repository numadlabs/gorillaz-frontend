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
import { useAccount, useConnect, useSignMessage, useDisconnect } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { Connector } from "wagmi";
import axios from "axios";
import { QueryClient } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/config";
import { useStats } from "@/lib/query-helper";

const API = API_BASE_URL;

interface User {
  walletAddress: string;
  xp: number;
  totalFlips: number;
  totalHeads: number;
  totalTails: number;
}

interface AuthContextType {
  // Wallet state
  address: string | undefined;
  isConnected: boolean;

  // Auth state
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: () => Promise<void>;
  logout: () => void;

  // Wallet connection
  connect: (parameters: { connector: Connector }) => void;
  connectors: readonly Connector[];
  connectError: Error | null;

  // Auth headers helper
  authHeaders: { Authorization?: string };

  // Query client for invalidation
  queryClient: QueryClient;
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
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const {
    connect: wagmiConnect,
    connectors,
    error: connectError,
  } = useConnect();

  const [token, setToken] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isClient, setIsClient] = useState(false);
  const queryClient = useQueryClient();

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("gorillaz_token");
    if (stored) setToken(stored);
  }, []);

  // Auth headers helper
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch user stats
  const userQuery = useStats();

  const login = useCallback(async () => {
    if (!address) throw new Error("No wallet connected");

    try {
      const message = `Sign this message to login: ${address}`;
      const signature = await signMessageAsync({ message });

      const { data } = await axios.post(`${API}/auth/login`, {
        address,
        signature,
      });

      localStorage.setItem("gorillaz_token", data.token);
      setToken(data.token);
      queryClient.invalidateQueries({ queryKey: ["user"] });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, [address, signMessageAsync, queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem("gorillaz_token");
    setToken(null);
    queryClient.clear();
    disconnect();
    router.push("/");
  }, [queryClient, disconnect, router]);

  // Wrapper for wagmi connect to match expected interface
  const connect = useCallback(
    ({ connector }: { connector: Connector }) => {
      wagmiConnect({ connector });
    },
    [wagmiConnect],
  );

  const value: AuthContextType = {
    // Wallet state
    address,
    isConnected,

    // Auth state
    token,
    user: userQuery.data || null,
    isAuthenticated: !!token && !!userQuery.data,
    isLoading: userQuery.isLoading,

    // Actions
    login,
    logout,

    // Wallet connection
    connect,
    connectors,
    connectError,

    // Helpers
    authHeaders,
    queryClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
