// app/auth/discord/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { API_BASE_URL } from "@/lib/config";
// import { useAuth } from "@/contexts/auth-context";
import LoadingScreen from "@/components/screens/loading-screen";
import api from "@/lib/axios";
import axios from "axios";

export default function DiscordCallback() {
  const searchParams = useSearchParams();
  // const { token } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  //todo ene callback page discord s login success uyd butsaj irdeg page. UI g ni ynzlaad, type error zasaad oruulah heregtei bn

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get("code");
        const state = searchParams.get("state");
        const error = searchParams.get("error");

        // Handle OAuth errors
        if (error) {
          console.error("Discord OAuth error:", error);
          setStatus("error");
          setMessage("Discord authorization was denied or failed.");

          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "DISCORD_AUTH_ERROR",
                error: "Discord authorization was denied or failed.",
              },
              window.location.origin,
            );
          }

          // Close popup after delay
          setTimeout(() => {
            window.close();
          }, 3000);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          console.error("Missing code or state parameter");
          setStatus("error");
          setMessage("Invalid callback parameters.");

          // Send error message to parent window
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "DISCORD_AUTH_ERROR",
                error: "Invalid callback parameters.",
              },
              window.location.origin,
            );
          }

          // Close popup after delay
          setTimeout(() => {
            window.close();
          }, 3000);
          return;
        }

        // Send callback data to backend using axios
        const response = await api.get(`${API_BASE_URL}/discord/callback`, {
          params: {
            code: code,
            state: state,
          },

          // withCredentials: true, // Include cookies for auth
        });

        if (response.data.success) {
          setStatus("success");
          setMessage("Discord account verified successfully!");

          // Send success message to parent window
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "DISCORD_AUTH_SUCCESS",
                data: response.data.discordUser,
              },
              window.location.origin,
            );
          }
        } else {
          throw new Error("Verification failed");
        }
      } catch (error) {
        console.error("Discord callback error:", error);

        let errorMessage = "An unexpected error occurred";

        if (axios.isAxiosError(error)) {
          if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.response?.status === 401) {
            errorMessage = "Authentication required";
          } else if (error.response?.status === 403) {
            errorMessage = "Discord verification not allowed";
          } else if (error.response?.status === 429) {
            errorMessage = "Too many requests. Please try again later.";
          } else if (error.response?.status >= 500) {
            errorMessage = "Server error. Please try again.";
          } else if (error.message) {
            errorMessage = error.message;
          }
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        setStatus("error");
        setMessage(errorMessage);

        // Send error message to parent window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: "DISCORD_AUTH_ERROR",
              error: errorMessage,
            },
            window.location.origin,
          );
        }
      }

      // Close popup after delay (commented out for debugging)
      setTimeout(() => {
        window.close();
      }, 3000);
    };

    handleCallback();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center p-8">
        {status === "loading" && (
          <>
            <LoadingScreen />
            <p className="text-white mt-4">Verifying Discord account...</p>
          </>
        )}

        {status === "success" && (
          <div className="text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-green-400 mb-2">Success!</h1>
            <p className="text-white">{message}</p>
            <p className="text-gray-400 text-sm mt-4">
              This window will close automatically...
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-red-400 mb-2">Error</h1>
            <p className="text-white">{message}</p>
            <p className="text-gray-400 text-sm mt-4">
              This window will close automatically...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
