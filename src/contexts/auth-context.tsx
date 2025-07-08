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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API = "http://localhost:3001/api";

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
  connect: any;
  connectors: any[];
  connectError: any;
  isConnecting: boolean;
  pendingConnector: any;

  // Auth headers helper
  authHeaders: { Authorization?: string };

  // Query client for invalidation
  queryClient: any;
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
    connect,
    connectors,
    error: connectError,
    isLoading: isConnecting,
    pendingConnector,
  } = useConnect();

  const [token, setToken] = useState<string | null>(null);
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
  const userQuery = useQuery({
    queryKey: ["user"],
    queryFn: async () =>
      (await axios.get(`${API}/stats/me`, { headers: authHeaders })).data,
    enabled: !!token && isClient,
  });

  const login = useCallback(async () => {
    if (!address) throw new Error("No wallet connected");

    const message = `Sign this message to login: ${address}`;
    const signature = await signMessageAsync({ message });
    const { data } = await axios.post(`${API}/auth/login`, {
      address,
      signature,
    });

    localStorage.setItem("gorillaz_token", data.token);
    setToken(data.token);
    queryClient.invalidateQueries();
  }, [address, signMessageAsync, queryClient]);

  const logout = useCallback(() => {
    localStorage.removeItem("gorillaz_token");
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
    isLoading: userQuery.isLoading,

    // Actions
    login,
    logout,

    // Wallet connection
    connect,
    connectors,
    connectError,
    isConnecting,
    pendingConnector,

    // Helpers
    authHeaders,
    queryClient,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
