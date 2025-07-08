"use client";

import { useEffect, useState } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { ethers } from "ethers";
import GlareButton from "@/components/ui/glare-button";
import CoinFlip from "@/components/animations/coin-flip";
import FlipResultModal from "@/components/modals/flip-result-modal";
import Activity from "@/components/dashboard/activity";
import Head from "@/components/icons/head";
import Butt from "@/components/icons/butt";

const API = "http://localhost:3001/api";
const COINFLIP_ABI = [
  {
    name: "flipCoin",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
];

const COINFLIP_ADDRESS = "0x990c54Df5208D09cB667d2c057a1906cB45aDa07";
const COINFLIP_FEE = "0.0001";

export default function FlipPage() {
  const {
    data: hash,
    error: writeError,
    writeContract,
    isPending: isWritePending,
  } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const queryClient = useQueryClient();
  const [prediction, setPrediction] = useState<"heads" | "tails" | null>(null);
  const [lastFlipResult, setLastFlipResult] = useState<{
    result: string;
    prediction: string;
    isWin: boolean;
  } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const stored = localStorage.getItem("gorillaz_token");
    if (stored) setToken(stored);
  }, []);

  // Start animation when transaction hash exists (processing state)
  useEffect(() => {
    if (hash && !isConfirmed) {
      // Start animation when transaction is processing
      setIsFlipping(true);
    }
  }, [hash, isConfirmed]);

  // Handle confirmed transaction
  useEffect(() => {
    if (isConfirmed) {
      const refreshAllData = () => {
        queryClient.invalidateQueries({ queryKey: ["stats"] });
        queryClient.invalidateQueries({ queryKey: ["myFlips"] });
        queryClient.invalidateQueries({ queryKey: ["flipCount"] });
      };

      refreshAllData();

      // Keep checking for result until we get it
      const checkInterval = setInterval(async () => {
        refreshAllData();
        const foundResult = await checkFlipResult();
        if (foundResult) {
          clearInterval(checkInterval);
        }
      }, 2000); // Check every 2 seconds

      // Clear interval when component unmounts
      return () => clearInterval(checkInterval);
    }
  }, [isConfirmed, queryClient]);

  const checkFlipResult = async () => {
    if (!prediction || !token) return;

    try {
      const response = await axios.get(`${API}/stats/flip-history/me`, {
        headers: authHeaders,
      });
      const flips = response.data;

      if (flips && flips.length > 0) {
        const latestFlip = flips[0];
        const actualResult = latestFlip.result.toLowerCase();
        const userPrediction = prediction.toLowerCase();
        const isWin = actualResult === userPrediction;

        // Stop animation before showing result popup
        setIsFlipping(false);

        // Small delay to let animation finish current loop, then show result modal
        setTimeout(() => {
          setLastFlipResult({
            result: latestFlip.result,
            prediction: prediction,
            isWin: isWin,
          });
          setShowResultModal(true);
        }, 500);

        // Return true to indicate we found a result
        return true;
      }
    } catch (error) {
      console.error("Error checking flip result:", error);
    }

    // Return false to indicate no result yet
    return false;
  };

  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

  const statsQuery = useQuery({
    queryKey: ["stats"],
    queryFn: async () =>
      (await axios.get(`${API}/stats/me`, { headers: authHeaders })).data,
    enabled: !!token && isClient,
  });

  const startCoinFlip = async () => {
    try {
      if (!prediction) {
        alert("Please make your prediction first!");
        return;
      }

      console.log("Starting coin flip...");
      console.log("Contract address:", COINFLIP_ADDRESS);
      console.log("Fee amount:", COINFLIP_FEE, "ETH");
      console.log("User prediction:", prediction);

      writeContract({
        address: COINFLIP_ADDRESS as `0x${string}`,
        abi: COINFLIP_ABI,
        functionName: "flipCoin",
        value: ethers.parseEther(COINFLIP_FEE),
      });
    } catch (error) {
      console.error("Error in startCoinFlip:", error);
    }
  };

  const handleCloseResultModal = () => {
    setShowResultModal(false);
    setLastFlipResult(null);
    setPrediction(null);
  };

  return (
    <div className="p-6 max-w-[600px] mx-auto space-y-6">
      <div className="backdrop-blur-[60px] bg-translucent-dark-12 border-2 rounded-3xl border-translucent-light-4 px-6 pb-6 pt-10 flex flex-col gap-10">
        <div className="flex justify-center ">
          <CoinFlip
            isFlipping={isFlipping}
            result={
              lastFlipResult
                ? (lastFlipResult.result.toLowerCase() as "head" | "tail")
                : null
            }
            onAnimationComplete={() => {}}
            size={240}
          />
        </div>

        {statsQuery.data && (
          <div className=" justify-center flex flex-col">
            <div className="flex my-10  justify-center">
              <GlareButton
                onClick={startCoinFlip}
                disabled={
                  !prediction || isWritePending || (!!hash && !isConfirmed)
                }
                background={
                  !prediction || isWritePending || (hash && !isConfirmed)
                    ? "rgba(255, 255, 255, 0.08)"
                    : "#FFD700"
                }
                borderRadius="16px"
                borderColor="transparent"
                glareColor="#ffffff"
                glareOpacity={0.3}
                className={`px-6 py-3 text-h5 font-semibold ${
                  !prediction || isWritePending || (hash && !isConfirmed)
                    ? "text-gray-200 cursor-not-allowed"
                    : "text-dark-primary"
                }`}
              >
                {isWritePending
                  ? "Waiting for wallet..."
                  : hash && !isConfirmed
                    ? "Flipping..."
                    : !prediction
                      ? "Flip a Coin!"
                      : `Flip a Coin!`}
              </GlareButton>
            </div>
            <div className="flex flex-col gap-5  ">
              <div className="flex gap-4">
                <GlareButton
                  onClick={() => setPrediction("heads")}
                  background={
                    prediction === "heads"
                      ? "#F5BA31"
                      : "rgba(255, 255, 255, 0.12)"
                  }
                  borderRadius="20px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  className={`px-4 flex-1 text-h5 font-semibold py-2 ${
                    prediction === "heads" ? "text-dark-primary" : "text-white"
                  }`}
                >
                  <Head size={64} />
                  Head
                </GlareButton>
                <GlareButton
                  onClick={() => setPrediction("tails")}
                  background={
                    prediction === "tails"
                      ? "#F5BA31"
                      : "rgba(255, 255, 255, 0.12)"
                  }
                  borderRadius="20px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  className={`px-4 flex-1 text-h5 font-semibold  py-2 ${
                    prediction === "tails" ? "text-dark-primary" : "text-white"
                  }`}
                >
                  <Butt size={64} />
                  Butt
                </GlareButton>
              </div>

              <p className="text-center font-pally text-translucent-light-64">
                Choose coin side before flipping
              </p>
            </div>
            {/* {writeError && (
              <div className="mt-2 text-sm">
                <p className="text-red-600">❌ Error: {writeError.message}</p>
              </div>
            )} */}

            {/* {hash && (
              <div className="mt-2 text-sm">
                <p className="text-blue-600">
                  Transaction: {hash.slice(0, 10)}...
                </p>
                {!isConfirmed && (
                  <p className="text-yellow-600">
                    ⏳ Waiting for confirmation...
                  </p>
                )}
                {isConfirmed && (
                  <p className="text-green-600">
                    ✅ Transaction confirmed! Data will update shortly.
                  </p>
                )}
              </div>
            )} */}
          </div>
        )}
      </div>

      {/* Activity Component */}
      <Activity />

      {/* Result Modal */}
      <FlipResultModal
        isOpen={showResultModal}
        onClose={handleCloseResultModal}
        result={lastFlipResult}
      />
    </div>
  );
}
