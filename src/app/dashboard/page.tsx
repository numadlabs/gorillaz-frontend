"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useAuth } from "@/contexts/auth-context";
import GlareButton from "@/components/ui/glare-button";
import Rank from "@/components/dashboard/rank";
import Achievements from "@/components/dashboard/achievements";
import Tasks from "@/components/dashboard/tasks";
import Referral from "@/components/dashboard/referral";
import Activity from "@/components/dashboard/activity";
import LoadingScreen from "@/components/screens/loading-screen";

// TODO: Task claimed state is missing from backend
// - Add 'claimed' field to DailyProgress model in backend
// - Update /quests/claim endpoint to set claimed: true
// - Prevent multiple claims of same task
// - Include 'claimed' field in API response
export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { logout } = useAuth();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex-1 w-full">
      {isConnected && (
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

      {isConnected && (
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
