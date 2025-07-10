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
import {
  useAccount,
  useConnect,
  useSignMessage,
  useDisconnect,
  useConnectorClient,
} from "wagmi";
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
  const { address, isConnected, status, connector } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { data: connectorClient } = useConnectorClient();
  const router = useRouter();
  const {
    connect: wagmiConnect,
    connectors,
    error: connectError,
  } = useConnect();

  const [token, setToken] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Initialize client-side state
  useEffect(() => {
    const stored = localStorage.getItem("gorillaz_token");
    if (stored) setToken(stored);
  }, []);

  // Auth headers helper
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  // Fetch user stats
  const userQuery = useStats();

  const login = useCallback(async () => {
    if (!address) throw new Error("No wallet connected");

    // Enhanced connection checks
    if (!isConnected || status !== "connected") {
      throw new Error("Wallet is not properly connected");
    }

    if (!connector) {
      throw new Error("No connector available");
    }

    if (!connectorClient) {
      throw new Error("Connector client not ready");
    }

    try {
      // Wait for connector to be fully ready
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
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
          return; // Success, exit the retry loop
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
          retries++;

          if (error?.message?.includes("getChainId is not a function")) {
            if (retries < maxRetries) {
              // Wait a bit and try again
              await new Promise((resolve) => setTimeout(resolve, 500));
              continue;
            } else {
              // If we've exhausted retries, try reconnecting
              console.warn("Connector seems unstable, attempting reconnect...");
              await disconnect();
              await new Promise((resolve) => setTimeout(resolve, 1000));
              throw new Error(
                "Wallet connector is unstable. Please try reconnecting your wallet.",
              );
            }
          } else {
            throw error; // Re-throw other errors immediately
          }
        }
      }
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }, [
    address,
    signMessageAsync,
    queryClient,
    isConnected,
    status,
    connector,
    connectorClient,
    disconnect,
  ]);

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
