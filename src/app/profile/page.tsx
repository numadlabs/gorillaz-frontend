"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import GlareButton from "@/components/ui/glare-button";
import LoadingScreen from "@/components/screens/loading-screen";
import {
  useAchievements,
  useFlipHistory,
  useFlipRemaing,
  useGlobalStats,
  useReferral,
} from "@/lib/query-helper";
import { useClaimAchievement } from "@/lib/mutation-helper";
import { queryKeys } from "@/lib/keys-helper";
import { formatFlipSide, getGuessFromFlip } from "@/lib/utils";
import AchievementsSection from "@/components/sections/achievement-section";
import { useQueryClient } from "@tanstack/react-query";
import DiscordVerificationSection from "@/components/sections/discord-verification";

export default function Profile() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [claimingId, setClaimingId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<
    "overview" | "achievements" | "social"
  >("overview");

  const globalStatsQuery = useGlobalStats();

  const achievementsQuery = useAchievements();
  const flipsHistoryQuery = useFlipHistory();
  const referralQuery = useReferral();
  const flipLimitQuery = useFlipRemaing();

  // Sort achievements: claimable first, then completed, then in progress
  const sortedAchievements = useMemo(() => {
    if (!achievementsQuery.data) return [];

    return [...achievementsQuery.data].sort((a, b) => {
      // Claimable achievements first
      const aClaimable = a.progress >= a.goal && !a.claimed;
      const bClaimable = b.progress >= b.goal && !b.claimed;

      if (aClaimable && !bClaimable) return -1;
      if (!aClaimable && bClaimable) return 1;

      // Then claimed achievements
      if (a.claimed && !b.claimed) return -1;
      if (!a.claimed && b.claimed) return 1;

      // Then by progress percentage
      const aProgress = a.progress / a.goal;
      const bProgress = b.progress / b.goal;

      return bProgress - aProgress;
    });
  }, [achievementsQuery.data]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && !isAuthenticated && !isLoading) {
      router.push("/");
    }
  }, [isAuthenticated, isLoading, router, isClient]);

  const claimMutation = useClaimAchievement({
    onSuccess: (data, achievementId) => {
      // Find the achievement that was claimed
      const achievement = achievementsQuery.data?.find(
        (a) => a.id === achievementId,
      );
      if (achievement) {
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.user() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.achievements.user(),
        });
        setClaimingId(undefined);
      }
    },
  });

  if (!isClient || isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const getAvatarColor = (address: string) => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#96CEB4",
      "#FECA57",
      "#FF9FF3",
      "#54A0FF",
      "#5F27CD",
      "#00D2D3",
      "#FF9F43",
    ];
    if (!address) return colors[0];
    const hash = address.slice(2, 8);
    const index = parseInt(hash, 16) % colors.length;
    return colors[index];
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Add toast notification here if you have one
  };

  //todo : social achievement implementation. Bi eniig achievement bolgoj oruulhar holbono. Odoohondo coming soon bolgono social achievment hesgiig
  //todo: discord verified gdgiig haruulahda odoo zger l haruulj bga. Evteihneer verified ntr gsn yum haruulah heregtei bga. Ugaasa bugd metamask r orj irehdee discord holbotson orj ireh bolhor

  const socialAchievements = [
    {
      id: "twitter_connect",
      title: "Twitter Connected",
      description: "Connect your Twitter account",
      icon: "🐦",
      platform: "twitter",
      xpReward: 50,
      completed: false, // This should come from backend
    },
    {
      id: "discord_connect",
      title: "Discord Connected",
      description: "Join our Discord server",
      icon: "💬",
      platform: "discord",
      xpReward: 50,
      completed: false, // This should come from backend
    },
    {
      id: "twitter_follow",
      title: "Follow on Twitter",
      description: "Follow @GorillazCoin on Twitter",
      icon: "👥",
      platform: "twitter",
      xpReward: 25,
      completed: false,
    },
    {
      id: "twitter_retweet",
      title: "Retweet Announcement",
      description: "Retweet our latest announcement",
      icon: "🔄",
      platform: "twitter",
      xpReward: 25,
      completed: false,
    },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "achievements", label: "Achievements", icon: "🏅" },
    { id: "social", label: "Social", icon: "🌐" },
  ];

  const handleClaim = (id: string) => {
    setClaimingId(id);
    claimMutation.mutate(id);
  };

  if (!isClient || isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return null;
  }
  const getWinRate = () => {
    if (flipsHistoryQuery.data && flipsHistoryQuery.data.length > 0) {
      const wins = flipsHistoryQuery.data.filter((flip) => flip.isWin).length;
      return ((wins / flipsHistoryQuery.data.length) * 100).toFixed(1);
    }
    return user.totalFlips > 0
      ? (((user.totalHeads + user.totalTails) / user.totalFlips) * 100).toFixed(
          1,
        )
      : "0";
  };

  const winRate = getWinRate();

  return (
    <div className="w-full flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <GlareButton
            onClick={() => router.back()}
            background="rgba(255, 255, 255, 0.16)"
            borderRadius="12px"
            borderColor="rgba(255, 255, 255, 0.04)"
            className="p-3 backdrop-blur-[40px] flex items-center gap-2 text-white"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none  ">
              <path
                d="M19 12H5M12 19l-7-7 7-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Back
          </GlareButton>
        </div>
        <DiscordVerificationSection />

        {/* Profile Header */}
        <div className="bg-white/5 backdrop-blur-[40px] rounded-2xl border border-white/10 p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar & Basic Info */}
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: getAvatarColor(user.walletAddress) }}
              >
                {user.walletAddress.slice(2, 4).toUpperCase()}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Profile</h1>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-gray-300 font-mono text-sm">
                    {formatAddress(user.walletAddress)}
                  </span>
                  <button
                    onClick={() => copyToClipboard(user.walletAddress)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect
                        x="9"
                        y="9"
                        width="13"
                        height="13"
                        rx="2"
                        ry="2"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </button>
                </div>
                {globalStatsQuery.data && (
                  <div className="text-sm text-gray-400">
                    Rank #{globalStatsQuery.data.rank} of{" "}
                    {globalStatsQuery.data.totalUsers} players
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {user.xp.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">Bananas</div>
              </div>

              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">
                  {winRate}%
                </div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">
                  {user.totalFlips}
                </div>
                <div className="text-xs text-gray-400">Total Flips</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-1 mb-6">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 p-3 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-white/20 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Stats Grid - FIXED: Added missing closing div and moved Daily Flips inside */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="text-2xl font-bold text-white mb-1">
                  {user.totalFlips}
                </div>
                <div className="text-sm text-gray-400">Total Flips</div>
              </div>
              <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-2">🏆</div>
                <div className="text-2xl font-bold text-green-400 mb-1">
                  {flipsHistoryQuery.data
                    ? flipsHistoryQuery.data.filter((flip) => flip.isWin).length
                    : user.totalHeads + user.totalTails}
                </div>
                <div className="text-sm text-gray-400">Total Wins</div>
              </div>
              <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-2">💔</div>
                <div className="text-2xl font-bold text-red-400 mb-1">
                  {flipsHistoryQuery.data
                    ? flipsHistoryQuery.data.filter((flip) => !flip.isWin)
                        .length
                    : Math.max(
                        0,
                        user.totalFlips - (user.totalHeads + user.totalTails),
                      )}
                </div>
                <div className="text-sm text-gray-400">Total Losses</div>
              </div>
              <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-2">🔥</div>
                <div className="text-2xl font-bold text-orange-400 mb-1">
                  {user.totalHeads}
                </div>
                <div className="text-sm text-gray-400">Heads Won</div>
              </div>
              <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-2">🍑</div>
                <div className="text-2xl font-bold text-pink-400 mb-1">
                  {user.totalTails}
                </div>
                <div className="text-sm text-gray-400">Butt Won</div>
              </div>
              {/* FIXED: Moved Daily Flips card inside the grid */}
              <div className="bg-white/5 backdrop-blur-[40px] rounded-xl border border-white/10 p-4 text-center">
                <div className="text-2xl mb-2">⚡</div>
                <div className="text-2xl font-bold text-yellow-400 mb-1">
                  {flipLimitQuery.data
                    ? `${flipLimitQuery.data.count}/${flipLimitQuery.data.maxFlip}`
                    : "0/10"}
                </div>
                <div className="text-sm text-gray-400">Daily Flips</div>
              </div>
            </div>

            {/* Recent Activity & Referral */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Flips */}
              <div className="bg-white/5 backdrop-blur-[40px] rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  🪙 Recent Flips
                </h3>
                {flipsHistoryQuery.data && flipsHistoryQuery.data.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {flipsHistoryQuery.data.slice(0, 10).map((flip) => {
                      const userGuess = getGuessFromFlip(flip);
                      return (
                        <div
                          key={flip.id}
                          className="flex justify-between items-center p-2 bg-white/5 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${flip.isWin ? "text-green-400" : "text-red-400"}`}
                            >
                              {flip.isWin ? "✅ WIN" : "❌ LOSS"}
                            </span>
                            <span className="text-gray-300 text-sm">
                              {formatFlipSide(userGuess)} →{" "}
                              {formatFlipSide(flip.result)}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {new Date(flip.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">No flips yet</p>
                )}
              </div>

              {/* Referral System */}
              <div className="bg-white/5 backdrop-blur-[40px] rounded-2xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  👥 Referral System
                </h3>
                {referralQuery.data && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400">
                        Your Referral Code
                      </label>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-white/10 px-3 py-2 rounded text-yellow-400 font-mono text-sm flex-1">
                          {referralQuery.data.referralCode}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(referralQuery.data.referralCode)
                          }
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <rect
                              x="9"
                              y="9"
                              width="13"
                              height="13"
                              rx="2"
                              ry="2"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                            <path
                              d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
                              stroke="currentColor"
                              strokeWidth="2"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      Referred Users:{" "}
                      <span className="text-white font-medium">
                        {referralQuery.data.referredUsers.length}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "achievements" && (
          <div className="bg-white/5 backdrop-blur-[40px] rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              🏅 Achievements
            </h2>
            {achievementsQuery.data && (
              <AchievementsSection
                achievements={sortedAchievements}
                onClaim={(id) => handleClaim(id)}
                claimingId={claimingId}
                showTitle={false}
              />
            )}
          </div>
        )}

        {activeTab === "social" && (
          <div className="bg-white/5 backdrop-blur-[40px] rounded-2xl border border-white/10 p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              🌐 Social Integration
            </h2>
            <div className="grid gap-4">
              {socialAchievements.map((social) => (
                <div
                  key={social.id}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{social.icon}</div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {social.title}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {social.description}
                      </p>
                      <div className="text-xs text-purple-400 mt-1">
                        Reward: {social.xpReward} Bananas
                      </div>
                    </div>
                  </div>
                  <div>
                    {social.completed ? (
                      <span className="text-green-400 font-medium">
                        ✅ Connected
                      </span>
                    ) : (
                      <GlareButton
                        onClick={() => {
                          // Handle social connection
                          if (social.platform === "twitter") {
                            window.open("https://twitter.com/", "_blank");
                          } else if (social.platform === "discord") {
                            window.open("https://discord.gg/", "_blank");
                          }
                        }}
                        background={
                          social.platform === "twitter"
                            ? "rgba(29, 161, 242, 0.2)"
                            : "rgba(88, 101, 242, 0.2)"
                        }
                        borderRadius="8px"
                        borderColor={
                          social.platform === "twitter"
                            ? "rgba(29, 161, 242, 0.3)"
                            : "rgba(88, 101, 242, 0.3)"
                        }
                        className={`px-4 py-2 ${social.platform === "twitter" ? "text-blue-400" : "text-indigo-400"}`}
                      >
                        Connect
                      </GlareButton>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Social Stats */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-lg font-semibold text-white mb-4">
                Social Stats
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <div className="text-xl font-bold text-blue-400">0</div>
                  <div className="text-sm text-gray-400">
                    Twitter Connections
                  </div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <div className="text-xl font-bold text-indigo-400">0</div>
                  <div className="text-sm text-gray-400">
                    Discord Connections
                  </div>
                </div>
                <div className="text-center p-4 bg-white/5 rounded-xl">
                  <div className="text-xl font-bold text-purple-400">0</div>
                  <div className="text-sm text-gray-400">
                    Social Banana Earned
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 my-6">
          <GlareButton
            onClick={() => router.push("/dashboard/flip")}
            background="#FFD700"
            borderRadius="12px"
            borderColor="rgba(255, 255, 255, 0.04)"
            className="flex-1 p-4 backdrop-blur-[40px] text-black font-medium"
          >
            🎲 Start Playing
          </GlareButton>
          <GlareButton
            onClick={() => router.push("/dashboard")}
            background="rgba(255, 255, 255, 0.16)"
            borderRadius="12px"
            borderColor="rgba(255, 255, 255, 0.04)"
            className="flex-1 p-4 backdrop-blur-[40px] text-white font-medium"
          >
            📊 Dashboard
          </GlareButton>
        </div>
      </div>
    </div>
  );
}
