import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import api from "./axios";
import { queryKeys } from "./keys-helper";

// Hook to check if we're on client side (for SSR compatibility)
export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

// Generic query hook for authenticated endpoints
export const useAuthQuery = <T = any>(
  queryKey: readonly string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) => {
  const isClient = useIsClient();

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: isClient && (typeof window !== "undefined" && !!localStorage.getItem("gorillaz_token")),
    ...options,
  });
};

// Generic query hook for public endpoints
export const usePublicQuery = <T = any>(
  queryKey: readonly string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">
) => {
  const isClient = useIsClient();

  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await api.get(endpoint);
      return response.data;
    },
    enabled: isClient,
    ...options,
  });
};

// Specific query hooks
export const useStats = () => {
  return useAuthQuery(queryKeys.stats.user(), "/stats/me");
};

export const useGlobalStats = () => {
  return useAuthQuery(queryKeys.stats.global(), "/stats/global");
};

export const useAchievements = () => {
  return useAuthQuery(queryKeys.achievements.user(), "/achievements/me");
};

export const useQuests = (address?: string) => {
  return useAuthQuery(
    queryKeys.quests.byUser(address || ""),
    `/quests/${address}`,
    {
      enabled: !!address,
    }
  );
};

export const useReferral = () => {
  return useAuthQuery(queryKeys.referrals.user(), "/referrals/me");
};

export const useFlipHistory = () => {
  return useAuthQuery(queryKeys.flips.userHistory(), "/stats/flip-history/me");
};

export const useGlobalFlipHistory = () => {
  return usePublicQuery(queryKeys.flips.globalHistory(), "/stats/flip-history/global");
};

export const useLeaderboard = () => {
  return usePublicQuery(queryKeys.leaderboard.global(), "/leaderboard");
};