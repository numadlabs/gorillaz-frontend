"use client";

import { useEffect, useState } from "react";
import { useAccount, useConnect, useSignMessage, useDisconnect } from "wagmi";
import { useAuth } from "@/contexts/auth-context";
import { useLogin, useRefreshData } from "@/lib/mutation-helper";
import GlareButton from "@/components/ui/glare-button";
import Rank from "@/components/dashboard/rank";
import Achievements from "@/components/dashboard/achievements";
import Tasks from "@/components/dashboard/tasks";
import Referral from "@/components/dashboard/referral";
import Activity from "@/components/dashboard/activity";

// TODO: Task claimed state is missing from backend
// - Add 'claimed' field to DailyProgress model in backend
// - Update /quests/claim endpoint to set claimed: true
// - Prevent multiple claims of same task
// - Include 'claimed' field in API response
export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { logout } = useAuth();

  const {
    connect,
    connectors,
    error: connectError,
    isLoading,
    pendingConnector,
  } = useConnect();

  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const loginMutation = useLogin();
  const refreshData = useRefreshData();

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("gorillaz_token");
    if (stored) setToken(stored);
  }, []);

  if (!isClient) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">🍌 Gorillaz XP Tester</h1>
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full">
      {token && (
        <div className="absolute top-4 right-4">
          <GlareButton
            onClick={logout}
            background="transparent"
            borderRadius="6px"
            borderColor="transparent"
            glareColor="#DC2626"
            glareOpacity={0.3}
            className="text-red-600 underline"
          >
            Logout
          </GlareButton>
        </div>
      )}

      {!isConnected && (
        <div className="p-6 max-w-xl mx-auto">
          <h2 className="font-semibold mb-4">Connect Wallet</h2>
          {connectors.map((connector) => (
            <GlareButton
              key={connector.id}
              onClick={() => connect({ connector })}
              background="#2563EB"
              borderRadius="6px"
              borderColor="transparent"
              glareColor="#ffffff"
              glareOpacity={0.3}
              className="text-white px-4 py-2 mr-2 mb-2"
            >
              {connector.name}
              {isLoading && connector.id === pendingConnector?.id && "…"}
            </GlareButton>
          ))}
          {connectError && (
            <p className="text-red-500">{connectError.message}</p>
          )}
        </div>
      )}

      {token && (
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 h-screen">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            <div className="lg:col-span-4 space-y-6 flex flex-col">
              <Rank />
              <div className="flex-1 min-h-0">
                <Achievements />
              </div>
            </div>
            <div className="lg:col-span-8 space-y-6 flex flex-col">
              <Tasks />
              <div className="flex-1 min-h-0">
                <Activity />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
