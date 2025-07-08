import { useMutation, useQueryClient, UseMutationOptions } from "@tanstack/react-query";
import api from "./axios";
import { queryKeys, cacheHelpers } from "./keys-helper";

// Generic mutation hook
export const useApiMutation = <TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: UseMutationOptions<TData, Error, TVariables>
) => {
  return useMutation({
    mutationFn,
    onError: (error, variables, context) => {
      console.error("Mutation error:", error);
      // Call custom onError if provided
      options?.onError?.(error, variables, context);
    },
    ...options,
  });
};

// Authentication mutations
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useApiMutation(
    async ({ address, signature }: { address: string; signature: string }) => {
      const response = await api.post("/auth/login", { address, signature });
      const token = response.data.token;
      localStorage.setItem("gorillaz_token", token);
      return response.data;
    },
    {
      onSuccess: () => {
        cacheHelpers.invalidateAllData(queryClient);
      },
    }
  );
};

// Achievement mutations
export const useClaimAchievement = (options?: UseMutationOptions<any, Error, string>) => {
  const queryClient = useQueryClient();

  return useApiMutation(
    async (achievementId: string) => {
      const response = await api.post(`/achievements/claim/${achievementId}`);
      return response.data;
    },
    {
      onSuccess: (data, variables, context) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.achievements.user() });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.user() });
        options?.onSuccess?.(data, variables, context);
      },
      ...options,
    }
  );
};

// Quest/Task mutations
export const useClaimTask = () => {
  const queryClient = useQueryClient();

  return useApiMutation(
    async (questId: string) => {
      // Use the correct endpoint from backend
      const response = await api.post(`/quests/claim/${questId}`);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.quests.all });
        queryClient.invalidateQueries({ queryKey: queryKeys.stats.user() });
      },
    }
  );
};

// Referral mutations
export const useSubmitReferral = () => {
  const queryClient = useQueryClient();

  return useApiMutation(
    async (referralCode: string) => {
      const response = await api.post("/referrals", { referralCode });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.referrals.user() });
      },
    }
  );
};

// Logout helper
export const useLogout = () => {
  const queryClient = useQueryClient();

  return () => {
    localStorage.removeItem("gorillaz_token");
    cacheHelpers.removeUserData(queryClient);
  };
};

// Data refresh helper
export const useRefreshData = () => {
  const queryClient = useQueryClient();

  return () => {
    cacheHelpers.invalidateUserData(queryClient);
    cacheHelpers.invalidateGlobalData(queryClient);
  };
};