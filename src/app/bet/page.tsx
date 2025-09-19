"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "sonner";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { COINFLIP_BETTING_ABI } from "@/lib/config";
import { usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";

// Types
interface FlipGameBet {
  blokchainBetId: string;
  playerAddress: string;
  amount: string;
  winBp: number;
  userChoice: string;
  status: string;
  isWin?: boolean;
  winAmount?: string;
  resolvedAt?: string;
  betTxHash: string;
}

const CONTRACT_ADDRESS = "0xd70FC2D17aE50eE7D0E3Af2A8326dE8704b90910";

const BET_EVENT_ABI = {
  anonymous: false,
  inputs: [
    {
      indexed: false,
      internalType: "uint256",
      name: "betId",
      type: "uint256",
    },
    {
      indexed: true,
      internalType: "address",
      name: "owner",
      type: "address",
    },
    {
      indexed: false,
      internalType: "uint256",
      name: "amount",
      type: "uint256",
    },
  ],
  name: "Bet",
  type: "event",
};

export default function CoinflipGame() {
  const publicClient = usePublicClient();
  const { address, isConnected } = useAccount();
  const [betAmount, setBetAmount] = useState("0.01");
  const [multiplier, setMultiplier] = useState(15000); // 1.5x
  const [userChoice, setUserChoice] = useState<"heads" | "tails">("heads");
  const [loading, setLoading] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [gameHistory, setGameHistory] = useState<FlipGameBet[]>([]);
  const [activeTab, setActiveTab] = useState<"game" | "history">("game");

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

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      handleBetSubmission();
    }
  }, [isConfirmed, hash]);

  const handleBetSubmission = async () => {
    try {
      if (!hash || !publicClient) return;
      // Get transaction receipt
      const receipt = await publicClient.getTransactionReceipt({ hash });

      // Parse logs to find bet ID
      let betId: string | null = null;

      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [BET_EVENT_ABI],
            data: log.data,
            topics: log.topics,
          });
          if (!decoded || !decoded.args) {
            throw new Error("No decoded found");
          }
          console.log(decoded);

          if (decoded.eventName === "Bet") {
            betId = decoded.args.betId.toString();
            break;
          }
        } catch (error) {
          console.log(error);
          // Skip logs that don't match our event
          continue;
        }
      }

      if (!betId) {
        throw new Error("Bet ID not found in transaction logs");
      }

      const response = await fetch("http://localhost:3001/api/game/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          betId,
          txHash: hash,
          player: address,
          amount: ethers.parseEther(betAmount).toString(),
          winBp: multiplier,
          userChoice,
        }),
      });

      if (response.ok) {
        setIsFlipping(true);
        toast.success("Bet placed successfully!");

        // Simulate coin flip animation
        setTimeout(() => {
          setIsFlipping(false);
          setLoading(false);
          loadGameHistory();
        }, 3000);
      }
    } catch (error) {
      console.error("Bet submission failed:", error);
      toast.error("Failed to place bet");
      setLoading(false);
    }
  };

  const placeBet = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet");
      return;
    }

    setLoading(true);

    try {
      // Replace with your actual contract details
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: COINFLIP_BETTING_ABI, // Your GameRouter ABI
        functionName: "bet",
        args: [BigInt(multiplier)],
        value: ethers.parseEther(betAmount),
      });
    } catch (error) {
      setLoading(false);
      toast.error("Transaction failed");
    }
  };

  const loadGameHistory = async () => {
    // Mock history loading
    const mockHistory: FlipGameBet[] = [
      {
        blokchainBetId: "1",
        playerAddress: address || "",
        amount: "10000000000000000",
        winBp: 15000,
        userChoice: "heads",
        status: "RESOLVED",
        isWin: true,
        winAmount: "25000000000000000",
        betTxHash: "0x123...",
      },
    ];
    setGameHistory(mockHistory);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8">
          Coin Flip Game
        </h1>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-6">
          <div className="bg-white/10 rounded-lg p-1 backdrop-blur-sm">
            {["game", "history"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as "game" | "history")}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-white text-purple-900"
                    : "text-white hover:bg-white/20"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "game" ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            {/* Game Controls */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Bet Amount (ETH)
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-white/20 text-white placeholder-white/60 border border-white/30 focus:border-white/60 focus:outline-none"
                    placeholder="0.01"
                  />
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Multiplier
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[15000, 20000].map((mult) => (
                      <button
                        key={mult}
                        onClick={() => setMultiplier(mult)}
                        className={`py-2 rounded-lg font-medium transition-colors ${
                          multiplier === mult
                            ? "bg-yellow-500 text-black"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {mult / 10000}x
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-white text-sm font-medium mb-2">
                    Your Choice
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["heads", "tails"] as const).map((choice) => (
                      <button
                        key={choice}
                        onClick={() => setUserChoice(choice)}
                        className={`py-3 rounded-lg font-medium transition-colors ${
                          userChoice === choice
                            ? "bg-blue-500 text-white"
                            : "bg-white/20 text-white hover:bg-white/30"
                        }`}
                      >
                        {choice.charAt(0).toUpperCase() + choice.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Coin Animation */}
              <div className="flex flex-col items-center justify-center">
                <div
                  className={`w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl font-bold text-yellow-900 shadow-lg ${
                    isFlipping ? "animate-spin" : ""
                  }`}
                  style={{
                    animationDuration: isFlipping ? "0.1s" : "0s",
                  }}
                >
                  {isFlipping ? "?" : userChoice === "heads" ? "H" : "T"}
                </div>
                <p className="text-white/80 mt-4 text-center">
                  {isFlipping ? "Flipping..." : `Betting on ${userChoice}`}
                </p>
              </div>
            </div>

            {/* Bet Button */}
            <button
              onClick={placeBet}
              disabled={loading || isFlipping}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-lg text-lg transition-all hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Processing..."
                : isFlipping
                  ? "Flipping..."
                  : "Place Bet"}
            </button>

            {/* Potential Win Display */}
            <div className="mt-6 p-4 bg-white/10 rounded-lg">
              <div className="flex justify-between text-white">
                <span>Bet Amount:</span>
                <span>{betAmount} ETH</span>
              </div>
              <div className="flex justify-between text-white">
                <span>Potential Win:</span>
                <span>
                  {(parseFloat(betAmount) * (multiplier / 10000)).toFixed(4)}{" "}
                  ETH
                </span>
              </div>
              <div className="flex justify-between text-green-400 font-bold">
                <span>Total if Win:</span>
                <span>
                  {(parseFloat(betAmount) * (1 + multiplier / 10000)).toFixed(
                    4,
                  )}{" "}
                  ETH
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6">Game History</h2>
            <div className="space-y-3">
              {gameHistory.length === 0 ? (
                <p className="text-white/60 text-center py-8">
                  No games played yet
                </p>
              ) : (
                gameHistory.map((bet) => (
                  <div
                    key={bet.blokchainBetId}
                    className="bg-white/10 rounded-lg p-4 flex justify-between items-center"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {bet.userChoice} - {ethers.formatEther(bet.amount)} ETH
                      </p>
                      <p className="text-white/60 text-sm">
                        Multiplier: {bet.winBp / 10000}x
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-bold ${
                          bet.isWin ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {bet.isWin ? "WIN" : "LOSS"}
                      </p>
                      {bet.isWin && bet.winAmount && (
                        <p className="text-green-400 text-sm">
                          +{ethers.formatEther(bet.winAmount)} ETH
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
