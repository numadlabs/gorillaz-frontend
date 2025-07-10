"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/contexts/auth-context";
import LoadingScreen from "@/components/screens/loading-screen";
import { useRouter, useSearchParams } from "next/navigation";
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
import axios from "@/lib/axios";
import { Connector } from "wagmi";
import Image from "next/image";
import GorilakLanguage from "@/components/sections/gorillak-language";

// Separate component that uses useSearchParams
function HomeContent() {
  const {
    isConnected,
    isAuthenticated,
    connect,
    connectors,
    connectError,
    login,
  } = useAuth();
  const router = useRouter();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  // const [isRedirecting, setIsRedirecting] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralSubmitted, setReferralSubmitted] = useState(false);

  const searchParams = useSearchParams();

  const handleLogin = async (connector: Connector) => {
    try {
      setIsLoggingIn(true);
      setIsWalletModalOpen(false);

      await connect({ connector });
      await new Promise((resolve) => setTimeout(resolve, 500));
      await login();
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("Login failed:", error);
      setIsWalletModalOpen(true);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    if (isConnected && !isAuthenticated) {
      login();
    }
  }, [isConnected, isAuthenticated, login]);

  // Extract referral code from URL on component mount
  useEffect(() => {
    const refParam = searchParams.get("ref");
    if (refParam) {
      setReferralCode(refParam);
      // Store in localStorage to persist across wallet connection
      localStorage.setItem("pending_referral", refParam);
    } else {
      // Check if there's a pending referral from previous session
      const pendingRef = localStorage.getItem("pending_referral");
      if (pendingRef) {
        setReferralCode(pendingRef);
      }
    }
  }, [searchParams]);

  // Submit referral after successful authentication
  const submitReferral = async (refCode: string) => {
    try {
      await axios.post(`/referrals`, { referralCode: refCode });
      console.log("Referral registered successfully!");
      setReferralSubmitted(true);
      // Clean up stored referral code
      localStorage.removeItem("pending_referral");
    } catch (error) {
      console.error("Failed to register referral:", error);
      // Don't throw error to avoid breaking the login flow
    }
  };

  useEffect(() => {
    if (isAuthenticated) {

      // Handle referral submission after authentication
      const handlePostAuthActions = async () => {
        // Submit referral if exists and not already submitted
        if (referralCode && !referralSubmitted) {
          await submitReferral(referralCode);
        }
      };

      handlePostAuthActions();
    }
  }, [isAuthenticated, router, referralCode, referralSubmitted]);

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
          <div className="flex flex-col justify-center items-center"
            onClick={
              () => {
                if (isConnected) {
                  router.push("/dashboard");
                } else {
                  setIsWalletModalOpen(true)
                }
              }
            }>
            <Image
              src="/Monke.png"
              alt=""
              width={240}
              height={240}
              className="h-40 sm:h-48 md:h-52 lg:h-60 -mb-[32px] sm:-mb-[40px] md:-mb-[48px] lg:-mb-[52px] z-100 cursor-pointer"

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

        {/* Gorillaz Language Component - Properly spaced */}
        <div className="mt-[20px] mb-[40px]">
          <GorilakLanguage />
        </div>

        {/* FAQ Section - Updated with Accordion */}
        <div className="flex justify-center px-4 sm:px-6 md:px-8 mb-[20px]">
          <div className="backdrop-blur-[48px] rounded-[24px] p-6 bg-translucent-dark-12 border-2 border-translucent-light-8 max-w-[640px] w-full">
            <Accordion type="multiple" className="flex flex-col gap-y-5">
              <AccordionItem value="item-1" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      Why Some Gorillas?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      Because, We are.
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>

              <AccordionItem value="item-2" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      Why Banana?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      Because, Gorilla eat banana.
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>

              <AccordionItem value="item-3" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      Coin flip for what?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      I dunno. I guess, for bananas?
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>

              <AccordionItem value="item-4" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      Whats the road map?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      OOH! OOH! AHH! AHH! AHHHHH!!!
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>

              <AccordionItem value="item-5" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      1 Gorilla vs 100 men?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      OOH! OOH! AHH! AHH! AHHHHH!!!
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>

              <AccordionItem value="item-6" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      Have you ever made conversation with gorillas?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      OOH! OOH! AHH! AHH! AHHHHH!!!
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>

              <AccordionItem value="item-7" className="border-none">
                <div className="flex flex-col outline-2 outline-translucent-light-8 rounded-2xl">
                  <AccordionTrigger className="py-4 px-6 rounded-2xl outline-2 outline-translucent-light-8 bg-translucent-light-8 hover:no-underline [&>svg]:hidden">
                    <p className="text-light-primary text-h5 font-semibold text-start">
                      English or Spanish?
                    </p>
                  </AccordionTrigger>
                  <AccordionContent className="py-4 px-6">
                    <p className="text-light-primary text-body-1 font-pally">
                      OOH! OOH! AHH! AHH! AHHHHH!!!
                    </p>
                  </AccordionContent>
                </div>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {!isConnected && (
          <Dialog open={isWalletModalOpen} onOpenChange={setIsWalletModalOpen}>
            <DialogContent className="sm:max-w-md bg-translucent-dark-12 border-translucent-light-4 backdrop-blur-3xl rounded-3xl">
              <DialogHeader>
                <DialogTitle className="text-h5  text-light-primary text-center">
                  Connect your Wallet
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 ">
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
                <div className="stroke-2 bg-translucent-light-8 self-stretch h-0.5"></div>
                <div className="space-y-2">
                  {connectors.map((connector) => (
                    <GlareButton
                      key={connector.id}
                      onClick={() => handleLogin(connector)}
                      background="#FAFAFA"
                      borderRadius="12px"
                      borderColor="transparent"
                      width="100%"
                      className="px-6 py-3 font-semibold text-dark-primary"
                      disabled={isLoggingIn}
                    >
                      <div className="flex items-center justify-center gap-2 whitespace-nowrap ">
                        {/* {connector.icon && ( */}
                        {/*   <img */}
                        {/*     src={encodeURIComponent(connector.icon)} */}
                        {/*     height={24} */}
                        {/*     width={24} */}
                        {/*     alt={connector.id} */}
                        {/*   /> */}
                        {/* )} */}

                        {isLoggingIn ? "Connecting..." : ` ${connector.name}`}
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
        )}

        {(isLoggingIn) && (
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80">
            <LoadingScreen />
          </div>
        )}
      </div>
    </div>
  );
}

// Main component with Suspense wrapper
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingScreen />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
