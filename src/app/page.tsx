"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import LoadingScreen from "@/components/screens/loading-screen";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function Home() {
  const {
    isConnected,
    isAuthenticated,
    connect,
    connectors,
    connectError,
    isConnecting,
    pendingConnector,
    login,
    logout,
  } = useAuth();
  const router = useRouter();

  const handleLogin = async (connector: any) => {
    try {
      // Connect wallet
      await connect({ connector });
      
      // Use the login function from auth context
      await login();
      
      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  // Auto-login when wallet connects
  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      login();
    }
  }, [isConnected, isAuthenticated, login]);

  // Show loading during hydration
  if (typeof window === "undefined") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingScreen />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">🍌 Gorillaz</h1>

        {!isConnected && (
          <div>
            <h2 className="text-xl mb-6">Connect your wallet to start</h2>
            <div className="space-y-3">
              {connectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleLogin(connector)}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
                  disabled={isConnecting}
                >
                  {connector.name}
                  {isConnecting &&
                    connector.id === pendingConnector?.id &&
                    " (Connecting...)"}
                </button>
              ))}
            </div>
            {connectError && (
              <p className="text-red-500 mt-4">{connectError.message}</p>
            )}
          </div>
        )}

        {isAuthenticated && (
          <div>
            <h2 className="text-xl text-green-600 mb-4">
              ✅ Connected & Authenticated
            </h2>
            <p className="text-gray-600">Ready to redirect to dashboard...</p>

            <button
              onClick={() => logout()}
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
              disabled={isConnecting}
            >
              {"Disconnect"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
