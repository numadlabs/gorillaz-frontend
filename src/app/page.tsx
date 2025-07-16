"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import LoadingScreen from "@/components/screens/loading-screen";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import GlareButton from "@/components/ui/glare-button";
import Wallet from "@/components/icons/wallet";
import GlowButton from "@/components/ui/glow-button";
import { useConnect } from "wagmi";
import { Connector } from "wagmi";
import Image from "next/image";
import GorilakLanguage from "@/components/sections/gorillak-language";
import { useLogin } from "@/hooks/use-login";
import { useReferralCode } from "@/hooks/use-referral-code";

const FAQ_ITEMS = [
  {
    question: "Why Some Gorillas?",
    answer: "Because, We are.",
  },
  {
    question: "Why Banana?",
    answer: "Because, Gorilla eat banana.",
  },
  {
    question: "Coin flip for what?",
    answer: "I dunno. I guess, for bananas?",
  },
  {
    question: "Whats the road map?",
    answer: "OOH! OOH! AHH! AHH! AHHHHH!!!",
  },
  {
    question: "1 Gorilla vs 100 men?",
    answer: "OOH! OOH! AHH! AHH! AHHHHH!!!",
  },
  {
    question: "Have you ever made conversation with gorillas?",
    answer: "OOH! OOH! AHH! AHH! AHHHHH!!!",
  },
  {
    question: "English or Spanish?",
    answer: "OOH! OOH! AHH! AHH! AHHHHH!!!",
  },
];

function HomeContent() {
  const { isConnected, isAuthenticated, address, refreshToken } = useAuth();
  const router = useRouter();

  // Local wallet connection state
  const { connect, connectors, error: connectError } = useConnect();
  const { login } = useLogin();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { referralCode, submitReferral, isSubmitted } = useReferralCode();

  const performLogin = async () => {
    if (!address || !isConnected) {
      throw new Error("Wallet not properly connected");
    }

    try {
      await login(address);
      // Refresh auth context token
      refreshToken();
      router.push("/dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  };

  const handleWalletConnect = async (connector: Connector) => {
    try {
      setIsLoggingIn(true);
      setIsWalletModalOpen(false);

      // Connect wallet
      connect({ connector });

      // Wait for connection to be established
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Perform login
      await performLogin();
    } catch (error) {
      console.error("Connection failed:", error);
      setIsWalletModalOpen(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleMainButtonClick = () => {
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      setIsWalletModalOpen(true);
    }
  };

  // Auto-login if connected but not authenticated
  useEffect(() => {
    if (isConnected && !isAuthenticated && !isLoggingIn && address) {
      setIsLoggingIn(true);
      performLogin()
        .catch(console.error)
        .finally(() => setIsLoggingIn(false));
    }
  }, [isConnected, isAuthenticated, isLoggingIn, address]);

  // Submit referral after authentication
  useEffect(() => {
    if (isAuthenticated && referralCode && !isSubmitted) {
      submitReferral(referralCode);
    }
  }, [isAuthenticated, referralCode, isSubmitted, submitReferral]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col max-w-[1920px] items-center w-full relative z-10">
        {/* Hero Section */}
        <div className="flex flex-col gap-4 sm:gap-6 px-4 sm:px-6 md:px-8 items-center text-center py-[80px] lg:pt-[184px] lg:h-[80dvh]">
          <div className="text-light-primary text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-semibold font-['Clash_Display'] leading-tight sm:leading-[60px] md:leading-[80px] lg:leading-[90px] xl:leading-[100px]">
            &quot;Ooohaahahhaah&quot;
          </div>
          <div className="text-light-primary text-xl sm:text-2xl md:text-3xl font-semibold font-['Clash_Display'] leading-tight sm:leading-8 md:leading-10 tracking-tight">
            - Some Gorilla
          </div>

          {/* Image and Button Section */}
          <div
            className="flex flex-col justify-center items-center"
            onClick={handleMainButtonClick}
          >
            <Image
              src="/Monke.png"
              alt="Gorilla"
              width={240}
              height={240}
              className="h-40 sm:h-48 md:h-52 lg:h-60 -mb-[32px] sm:-mb-[40px] md:-mb-[48px] lg:-mb-[52px] xl:-mb-[56px] z-100 cursor-pointer"
              priority
            />
            <GlowButton
              background="#F5D020"
              borderRadius="16px"
              borderColor="rgba(var(--translucent-dark-16), 0.16)"
              className="px-8 sm:px-10 md:px-12 py-4 sm:py-5 md:py-6 relative z-20"
            >
              <p className="text-dark-primary text-xl sm:text-2xl md:text-3xl font-semibold font-['Clash_Display']">
                Let&apos;s Ape It!
              </p>
            </GlowButton>
          </div>
        </div>

        {/* Gorillaz Language Component */}
        <div className="mt-[20px] mb-[40px]">
          <GorilakLanguage />
        </div>

        {/* FAQ Section */}
        <div className="flex justify-center px-4 sm:px-6 md:px-8 mb-[20px]">
          <div className="backdrop-blur-[48px] rounded-[24px] p-6 bg-translucent-dark-12 border-2 border-translucent-light-8 max-w-[640px] w-full">
            <Accordion type="multiple" className="flex flex-col gap-y-5">
              {FAQ_ITEMS.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-none"
                >
                  <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                    <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                      <p className="text-light-primary text-h5 font-semibold text-start">
                        {item.question}
                      </p>
                    </AccordionTrigger>
                    <AccordionContent className="py-4 px-6">
                      <p className="text-light-primary text-body-1 font-pally">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </div>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Wallet Connection Modal */}
        <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
          <DialogContent className="sm:max-w-md bg-translucent-dark-12 border-translucent-light-4 backdrop-blur-3xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-h5 text-light-primary text-center">
                Connect your Wallet
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {referralCode && (
                <div className="bg-translucent-light-8 rounded-lg p-3 text-center">
                  <p className="text-light-primary text-sm">
                    🎉 Referral code:{" "}
                    <span className="font-semibold">{referralCode}</span>
                  </p>
                </div>
              )}

              <div className="px-8 py-16 rounded-2xl border-translucent-light-8 bg-translucent-light-8 flex items-center justify-center">
                <Wallet size={48} />
              </div>

              <div className="stroke-2 bg-translucent-light-8 self-stretch h-0.5" />

              <div className="space-y-2">
                {connectors.map((connector) => (
                  <GlareButton
                    key={connector.id}
                    onClick={() => handleWalletConnect(connector)}
                    background="#FAFAFA"
                    borderRadius="12px"
                    borderColor="transparent"
                    width="100%"
                    className="px-6 py-3 font-semibold text-dark-primary"
                    disabled={isLoggingIn}
                  >
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      {isLoggingIn ? "Connecting..." : connector.name}
                    </div>
                  </GlareButton>
                ))}

                {connectError && (
                  <p className="text-red-500 text-center mt-4">
                    {connectError.message}
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loading Overlay */}
        {isLoggingIn && (
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80">
            <LoadingScreen />
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <HomeContent />
    </Suspense>
  );
}
