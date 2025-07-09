import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import api from "./axios";
import { queryKeys } from "./keys-helper";

// Type definitions
// interface User {
//   id: string;
//   walletAddress: string;
//   createdAt: string;
//   xp: number;
//   totalFlips: number;
//   totalHeads: number;
//   totalTails: number;
//   referralCode: string;
//   referredBy: string | null;
// }

interface UserStats {
  id: string;
  walletAddress: string;
  xp: number;
  totalFlips: number;
  totalHeads: number;
  totalTails: number;
  winRate: number; // Calculated field
  referralCode: string;
  referredBy: string | null;
}

interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  xpReward: number;
  achievedAt?: string; // From AchievementOnUser
  claimed: boolean; // If tracking claimed status
  progress: number;
  goal: number;
}
export interface Quest {
  id: string;
  questId: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  completedAt?: string;
  rewardXp: number;
  condition: string;
  requirements: {
    type: string;
    target: number;
    current: number;
  };
  // Add other quest properties as needed
}

interface UserQuest {
  id: string;
  questId: string;

  completed: boolean;
  completedAt?: string;
  progressCount: number;
  claimed: boolean;
  quest: Quest;
  // Add other quest properties as needed
}

interface Referral {
  id: string;
  code: string;
  referredUsers: string[];
  totalRewards: number;
  referralCode: string;
  // Add other referral properties as needed
}

export interface FlipHistory {
  id: string;
  userAddress: string;
  amount: number;
  result: string;
  createdAt: string;
  isWin: boolean;
}

interface LeaderboardEntry {
  rank: number;
  address: string;
  totalFlips: number;
  wins: number;
  winRate: number;
  totalEarnings: number;
  walletAddress: string;
  xp: number;
  // Add other leaderboard properties as needed
}
interface GlobalStats {
  walletAddress: string;
  xp: number;
  totalFlips: number;
  totalHeads: number;
  totalTails: number;
  rank: number;
  totalXpGiven: number;
  totalUsers: number;
}

interface UserRemainingFlip {
  remaining: number;
}
// Hook to check if we're on client side (for SSR compatibility)
export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

// Generic query hook for authenticated endpoints
export const useAuthQuery = <T>(
  queryKey: readonly string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) => {
  const isClient = useIsClient();

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T> => {
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled:
      isClient &&
      typeof window !== "undefined" &&
      !!localStorage.getItem("gorillaz_token"),
    ...options,
  });
};

// Generic query hook for public endpoints
export const usePublicQuery = <T>(
  queryKey: readonly string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) => {
  const isClient = useIsClient();

  return useQuery({
    queryKey,
    queryFn: async (): Promise<T> => {
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: isClient,
    ...options,
  });
};

// Specific query hooks
export const useStats = () => {
  return useAuthQuery<UserStats>(queryKeys.stats.user(), "/stats/me");
};

export const useGlobalStats = () => {
  return useAuthQuery<GlobalStats>(queryKeys.stats.global(), "/stats/global");
};

export const useAchievements = () => {
  return useAuthQuery<Achievement[]>(
    queryKeys.achievements.user(),
    "/achievements/me",
  );
};

export const useQuests = (address?: string) => {
  return useAuthQuery<UserQuest[]>(
    queryKeys.quests.byUser(address || ""),
    `/quests/${address}`,
    {
      enabled: !!address,
    },
  );
};

export const useReferral = () => {
  return useAuthQuery<Referral>(queryKeys.referrals.user(), "/referrals/me");
};

export const useFlipHistory = () => {
  return useAuthQuery<FlipHistory[]>(
    queryKeys.flips.userHistory(),
    "/stats/flip-history/me",
  );
};

export const useFlipRemaing = () => {
  return useAuthQuery<UserRemainingFlip>(
    queryKeys.flips.userLimit(),
    "/stats/flip-count/me",
  );
};

export const useGlobalFlipHistory = () => {
  return usePublicQuery<FlipHistory[]>(
    queryKeys.flips.globalHistory(),
    "/stats/flip-history/global",
  );
};

export const useLeaderboard = () => {
  return usePublicQuery<LeaderboardEntry[]>(
    queryKeys.leaderboard.global(),
    "/leaderboard",
  );
};
