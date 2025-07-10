"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import Rank from "@/components/dashboard/rank";
import Achievements from "@/components/dashboard/achievements";
import Tasks from "@/components/dashboard/tasks";
import Activity from "@/components/dashboard/activity";
import LoadingScreen from "@/components/screens/loading-screen";

export default function Dashboard() {
  const { isConnected } = useAccount();

  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex-1 w-full pb-4">
      {isConnected && (
        <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 gap-[12px] flex flex-col ">
              <Rank />
              <div className="flex-1">
                <Achievements />
              </div>
            </div>
            <div className="lg:col-span-8 gap-[10px] flex flex-col">
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
