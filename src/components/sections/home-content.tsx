"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import LoadingScreen from "@/components/screens/loading-screen";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import GlareButton from "@/components/ui/glare-button";
import Wallet from "@/components/icons/wallet";
import GlowButton from "@/components/ui/glow-button";
import { useConnect } from "wagmi";
import { Connector } from "wagmi";
import Image from "next/image";
import GorilakLanguage from "@/components/sections/gorillak-language";
import { useLogin } from "@/hooks/use-login";
import { useReferralCode } from "@/hooks/use-referral-code";
import HomeFaq from "./home-faq";

export default function HomeContent() {
  const {
    isConnected,
    isAuthenticated,
    address,
    refreshToken,
    token,
    discordStatus,
    isDiscordVerified,
    checkDiscordStatus,
    getDiscordAuthUrl,
  } = useAuth();
  const router = useRouter();

  // Local wallet connection state
  const { connect, connectors, error: connectError } = useConnect();
  const { login } = useLogin();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showDiscordModal, setShowDiscordModal] = useState(false);
  const [pendingReferralSubmission, setPendingReferralSubmission] =
    useState(false);

  const {
    referralCode,
    submitReferral,
    isSubmitted,
    isSubmitting,
    error: referralError,
    clearError,
  } = useReferralCode();

  const performLogin = async () => {
    if (!address || !isConnected) {
      throw new Error("Wallet not properly connected");
    }

    try {
      await login(address);
      // Refresh auth context token
      refreshToken();
      // router.push("/dashboard");
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

  const handleDiscordVerification = async () => {
    try {
      const authUrl = await getDiscordAuthUrl();
      // Open Discord auth in popup
      const popup = window.open(
        authUrl,
        "discord-auth",
        "width=500,height=700,scrollbars=yes,resizable=yes",
      );

      // Listen for popup close or message
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          // Check Discord status after popup closes
          setTimeout(() => {
            checkDiscordStatus().then(() => {
              if (pendingReferralSubmission && referralCode) {
                submitReferral(referralCode);
                setPendingReferralSubmission(false);
              }
            });
          }, 1000);
        }
      }, 1000);
    } catch (error) {
      console.error("Failed to start Discord verification:", error);
    }
  };

  // // Auto-login if connected but not authenticated
  // useEffect(() => {
  //   if (isConnected && !isAuthenticated && !isLoggingIn && address) {
  //     setIsLoggingIn(true);
  //     performLogin()
  //       .catch(console.error)
  //       .finally(() => setIsLoggingIn(false));
  //   }
  // }, [isConnected, isAuthenticated, isLoggingIn, address]);

  // Enhanced referral submission with Discord verification check
  useEffect(() => {
    if (isAuthenticated && referralCode && !isSubmitted && !isSubmitting) {
      // Check if Discord verification is required
      if (!discordStatus?.verified) {
        setShowDiscordModal(true);
        return;
      }

      // Submit referral if Discord is verified
      submitReferral(referralCode);
    }
  }, [isAuthenticated, referralCode, isSubmitted, isSubmitting, discordStatus]);

  // Handle referral errors
  useEffect(() => {
    if (referralError?.requiresDiscordVerification) {
      setShowDiscordModal(true);
    }
  }, [referralError]);

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
        <HomeFaq />

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

        <Dialog
          open={showDiscordModal}
          onOpenChange={(open) => {
            // Don't allow closing if user has token but isn't verified
            if (!open && token && !isDiscordVerified) {
              return; // Prevent closing
            }
            setShowDiscordModal(open);
          }}
        >
          <DialogContent className="sm:max-w-md bg-translucent-dark-12 border-translucent-light-4 backdrop-blur-3xl rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-h5 text-light-primary text-center">
                Discord Verification Required
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-light-primary text-sm mb-2">
                  Discord verification is required to access the platform and
                  prevent spam accounts.
                </p>
                {referralCode && (
                  <p className="text-purple-400 text-xs">
                    Your referral code{" "}
                    <span className="font-semibold">{referralCode}</span> will
                    be applied after verification.
                  </p>
                )}
              </div>

              {referralError?.type === "discord_required" && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm text-center">
                    {referralError.message}
                  </p>
                  {referralError.referrerNotVerified && (
                    <p className="text-red-300 text-xs text-center mt-1">
                      The person who referred you also needs Discord
                      verification.
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <GlareButton
                  onClick={() => {
                    setPendingReferralSubmission(true);
                    handleDiscordVerification();
                  }}
                  background="#5865F2"
                  borderRadius="12px"
                  borderColor="transparent"
                  width="100%"
                  className="px-6 py-3 font-semibold text-white"
                >
                  <div className="flex items-center justify-center gap-2">
                    💬 Verify with Discord
                  </div>
                </GlareButton>

                {/* Only show skip button if user doesn't have a token (not logged in) */}
                {!token && (
                  <button
                    onClick={() => {
                      setShowDiscordModal(false);
                      clearError();
                      if (typeof window !== "undefined") {
                        localStorage.removeItem("pending_referral");
                      }
                    }}
                    className="w-full text-gray-400 text-sm hover:text-white transition-colors"
                  >
                    Skip for now
                  </button>
                )}
              </div>

              <div className="text-center">
                <p className="text-gray-400 text-xs">
                  Discord verification helps us prevent bot accounts and ensures
                  a fair gaming experience for everyone.
                </p>
                {token && !isDiscordVerified && (
                  <p className="text-yellow-400 text-xs mt-2 font-semibold">
                    This verification is required to proceed.
                  </p>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Loading Overlay */}
        {(isLoggingIn || isSubmitting) && (
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-80">
            <LoadingScreen />
            {isSubmitting && (
              <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-white text-center">
                <p>Processing referral...</p>
              </div>
            )}
          </div>
        )}

        {/* NEW: Success/Error Toast Notifications */}
        {isSubmitted && referralCode && (
          <div className="fixed top-4 right-4 z-[9999] bg-green-500/90 backdrop-blur-lg text-white p-4 rounded-lg border border-green-400/30">
            <div className="flex items-center gap-2">
              <span>✅</span>
              <span>Referral applied successfully!</span>
            </div>
          </div>
        )}

        {referralError && !showDiscordModal && (
          <div className="fixed top-4 right-4 z-[9999] bg-red-500/90 backdrop-blur-lg text-white p-4 rounded-lg border border-red-400/30">
            <div className="flex items-center gap-2 mb-2">
              <span>❌</span>
              <span>{referralError.message}</span>
            </div>
            {referralError.retryAfter && (
              <p className="text-red-200 text-xs">
                Try again in {referralError.retryAfter}{" "}
                {referralError.retryAfter === 1 ? "hour" : "hours"}
              </p>
            )}
            {referralError.type !== "discord_required" && (
              <button
                onClick={clearError}
                className="text-red-200 text-xs hover:text-white mt-1"
              >
                Dismiss
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
