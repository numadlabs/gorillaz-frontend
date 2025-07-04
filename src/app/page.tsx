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
    <div className="min-h-screen flex items-center justify-center bg-[url(/Background.png)]">
      <div className="absolute w-full top-0 flex justify-between items-center px-6 py-5">
        <img src="logo/Logo.svg" alt="logo" className="h-12"/>
        <div className="flex flex-row gap-3">
          <button className="p-3 bg-translucent-light-16 outline-2 outline-translucent-light-4 outline-offset-[-2px] rounded-[12px] backdrop-blur-[40px]">
            <img src="/Twitter.svg" alt="Twitter"/>
          </button>
          <button className="p-3 bg-translucent-light-16 outline-2 outline-translucent-light-4 outline-offset-[-2px] rounded-[12px] backdrop-blur-[40px]">
            <img src="/Discord.svg" alt="Twitter"/>
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div className="justify-start text-light-primary text-9xl font-semibold font-['Clash_Display'] leading-[100px]">“Ooohaahahhaah”</div>
        <div className="text-center justify-start text-light-primary text-3xl font-semibold font-['Clash_Display'] leading-10 tracking-tight">- Some Gorilla</div>
        <div className="inline-flex flex-col justify-start items-center">
          <img src="/Monke.png" alt="" className="h-60 -mb-[52px] z-10"/>
          <button className="px-12 py-6 bg-accent-secondary rounded-2xl outline-2 outline-offset-[-2px] outline-translucent-dark-16">
            <p className="text-dark-primary text-3xl font-semibold font-['Clash_Display']">Let’s Ape It!</p>
          </button>
        </div>
      </div>
      {/* <div className="text-center">
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
      </div> */}
    </div>
  );
}
