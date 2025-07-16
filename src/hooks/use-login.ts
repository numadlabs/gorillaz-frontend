// hooks/useLogin.ts
import { useCallback } from "react";
import { useSignMessage } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { API_BASE_URL } from "@/lib/config";

export const useLogin = () => {
  const { signMessageAsync } = useSignMessage();
  const queryClient = useQueryClient();

  const login = useCallback(
    async (address: string) => {
      if (!address) {
        throw new Error("Address is required");
      }

      try {
        const message = `Sign this message to login: ${address}`;
        const signature = await signMessageAsync({ message });

        const { data } = await axios.post(`${API_BASE_URL}/auth/login`, {
          address,
          signature,
        });

        // Update localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("gorillaz_token", data.token);
        }

        // Trigger auth context to re-read token
        queryClient.invalidateQueries({ queryKey: ["user"] });

        // Force a small delay to ensure token is updated
        await new Promise((resolve) => setTimeout(resolve, 100));

        return data.token;
      } catch (error) {
        console.error("Login failed:", error);
        throw error;
      }
    },
    [signMessageAsync, queryClient],
  );

  return { login };
};
