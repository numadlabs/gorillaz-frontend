"use client";

import { useEffect, useState, useReducer, useRef, useCallback } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ethers } from "ethers";
import { decodeEventLog, Log } from "viem";
import { toast } from "sonner";
import GlareButton from "@/components/ui/glare-button";
import CoinFlip from "@/components/animations/coin-flip";
import FlipResultModal from "@/components/modals/flip-result-modal";
import Activity from "@/components/dashboard/activity";
import Head from "@/components/icons/head";
import Butt from "@/components/icons/butt";
import { COINFLIP_ABI, COINFLIP_ADDRESS, COINFLIP_FEE } from "@/lib/config";
import { useApiMutation } from "@/lib/mutation-helper";
import api from "@/lib/axios";
import {
  CoinFlippedEvent,
  FlipAction,
  FlipHistoryItem,
  FlipResult,
  FlipState,
  UserStats,
} from "@/lib/types";

// ========================================
// CONSTANTS
// ========================================

/** Maximum number of transactions to store in memory */
const MAX_STORED_TRANSACTIONS = 10;

/** Interval for memory cleanup in milliseconds (5 minutes) */
const CLEANUP_INTERVAL = 5 * 60 * 1000;

// ========================================
// STATE MANAGEMENT
// ========================================

/**
 * Reducer function to manage flip state and prevent race conditions
 * @param state Current state
 * @param action Action to perform
 * @returns New state
 */
const flipReducer = (state: FlipState, action: FlipAction): FlipState => {
  switch (action.type) {
    case "SET_PREDICTION":
      return { ...state, prediction: action.payload };

    case "START_FLIP":
      return {
        ...state,
        transactionPredictions: {
          ...state.transactionPredictions,
          [action.payload.hash]: action.payload.prediction,
        },
        toastShownForTx: null,
      };

    case "SET_FLIPPING":
      return { ...state, isFlipping: action.payload };

    case "SET_RESULT":
      return {
        ...state,
        lastFlipResult: action.payload.result,
        isFlipping: false,
      };

    case "SHOW_MODAL":
      return { ...state, showResultModal: action.payload };

    case "MARK_TX_PROCESSED":
      return { ...state, processedTxHash: action.payload };

    case "MARK_TOAST_SHOWN":
      return { ...state, toastShownForTx: action.payload };

    case "CLEANUP_TX":
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [action.payload]: removed, ...remainingTxs } =
        state.transactionPredictions;
      return {
        ...state,
        transactionPredictions: remainingTxs,
      };

    case "RESET_STATE":
      return {
        ...state,
        prediction: null,
        showResultModal: false,
        lastFlipResult: null,
        processedTxHash: null,
      };

    default:
      return state;
  }
};

/** Initial state for the flip component */
const initialState: FlipState = {
  prediction: null,
  isFlipping: false,
  showResultModal: false,
  lastFlipResult: null,
  transactionPredictions: {},
  processedTxHash: null,
  toastShownForTx: null,
};

// ========================================
// MAIN COMPONENT
// ========================================

/**
 * FlipPage Component
 *
 * A comprehensive coin flip interface that integrates with blockchain technology.
 * Handles user predictions, blockchain transactions, event parsing, and result display.
 *
 * Features:
 * - Blockchain integration with smart contract
 * - Real-time transaction monitoring
 * - Event parsing and fallback API checks
 * - Memory management and cleanup
 * - Toast notifications for user feedback
 * - Modal display for results
 * - Activity tracking
 *
 * @returns JSX.Element The rendered coin flip interface
 */

//todo: buh tails iig butt bolgoh. heads type iig Heads bolgoh
export default function FlipPage() {
  // ========================================
  // STATE HOOKS
  // ========================================

  const [state, dispatch] = useReducer(flipReducer, initialState);
  const [token, setToken] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);
  const queryClient = useQueryClient();
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ========================================
  // BLOCKCHAIN HOOKS
  // ========================================

  const {
    data: hash,
    error: writeError,
    writeContract,
    isPending: isWritePending,
  } = useWriteContract();

  const { isSuccess: isConfirmed, data: receipt } =
    useWaitForTransactionReceipt({
      hash,
      confirmations: 1,
    });

  // ========================================
  // MEMORY MANAGEMENT
  // ========================================

  /**
   * Performs memory cleanup to prevent memory leaks
   * Removes old transaction predictions when limit is exceeded
   */
  const performMemoryCleanup = useCallback(() => {
    const txHashes = Object.keys(state.transactionPredictions);

    if (txHashes.length > MAX_STORED_TRANSACTIONS) {
      // Keep only the most recent transactions
      const sortedHashes = txHashes.slice(-MAX_STORED_TRANSACTIONS);
      const hashesToKeep = new Set(sortedHashes);

      txHashes.forEach((hash) => {
        if (!hashesToKeep.has(hash)) {
          dispatch({ type: "CLEANUP_TX", payload: hash });
        }
      });
    }
  }, [state.transactionPredictions]);

  /**
   * Setup memory cleanup interval
   */
  useEffect(() => {
    if (isClient) {
      cleanupIntervalRef.current = setInterval(
        performMemoryCleanup,
        CLEANUP_INTERVAL,
      );

      return () => {
        if (cleanupIntervalRef.current) {
          clearInterval(cleanupIntervalRef.current);
        }
      };
    }
  }, [isClient, performMemoryCleanup]);

  // ========================================
  // CLIENT-SIDE INITIALIZATION
  // ========================================

  /**
   * Initialize client-side state and retrieve stored token
   */
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("gorillaz_token");
      if (stored) setToken(stored);
    }
  }, []);

  // ========================================
  // TRANSACTION HANDLING
  // ========================================

  /**
   * Store user prediction when transaction hash is received
   */
  useEffect(() => {
    if (hash && state.prediction && !state.transactionPredictions[hash]) {
      dispatch({
        type: "START_FLIP",
        payload: { hash, prediction: state.prediction },
      });
      console.log("Stored prediction for hash:", hash, "->", state.prediction);
    }
  }, [hash, state.prediction, state.transactionPredictions]);

  /**
   * Handle write contract errors with appropriate user feedback
   */
  useEffect(() => {
    if (writeError) {
      console.error("Write contract error:", writeError);
      dispatch({ type: "SET_FLIPPING", payload: false });

      // Provide specific error messages based on error type
      const errorMessage = writeError.message || writeError.toString();

      if (errorMessage.includes("User rejected")) {
        toast.error("Transaction cancelled", {
          description: "You cancelled the transaction in your wallet.",
        });
      } else if (errorMessage.includes("insufficient funds")) {
        toast.error("Insufficient funds", {
          description:
            "You don't have enough ETH to complete this transaction.",
        });
      } else if (errorMessage.includes("Insufficient flip fee")) {
        toast.error("Insufficient flip fee", {
          description: `You need at least ${COINFLIP_FEE} ETH to flip the coin.`,
        });
      } else {
        toast.error("Transaction failed", {
          description: "Something went wrong. Please try again.",
        });
      }
    }
  }, [writeError]);

  /**
   * Handle successful transaction submission
   */
  useEffect(() => {
    if (hash && !writeError) {
      toast.success("Transaction submitted", {
        description: "Your coin flip is being processed on the blockchain.",
      });
      dispatch({ type: "SET_FLIPPING", payload: true });
    }
  }, [hash, writeError]);

  // ========================================
  // BLOCKCHAIN EVENT PROCESSING
  // ========================================

  /**
   * Process confirmed transactions and extract flip results from events
   */
  useEffect(() => {
    if (isConfirmed && receipt && hash && hash !== state.processedTxHash) {
      const processFlipResult = async (): Promise<void> => {
        try {
          dispatch({ type: "MARK_TX_PROCESSED", payload: hash });

          const storedPrediction = state.transactionPredictions[hash];
          if (!storedPrediction) {
            console.error("No stored prediction found for hash:", hash);
            return;
          }

          console.log("Processing flip result for hash:", hash);
          console.log("Stored prediction:", storedPrediction);

          const logs: Log[] = receipt.logs;
          let flipResult: FlipResult | null = null;

          // Parse blockchain events to extract flip result
          for (const log of logs) {
            try {
              if (
                log.address.toLowerCase() === COINFLIP_ADDRESS.toLowerCase()
              ) {
                const decodedEvent = decodeEventLog({
                  abi: COINFLIP_ABI,
                  data: log.data,
                  topics: log.topics,
                  eventName: "CoinFlipped",
                });

                if (decodedEvent?.args) {
                  const { isHeads } =
                    decodedEvent.args as unknown as CoinFlippedEvent;
                  const actualResult = isHeads ? "heads" : "tails";
                  const userPrediction = storedPrediction;
                  const isWin = actualResult === userPrediction;

                  console.log("Actual result:", actualResult);
                  console.log("User prediction:", userPrediction);
                  console.log("Is win:", isWin);

                  flipResult = {
                    result: actualResult,
                    prediction: userPrediction,
                    isWin: isWin,
                  };
                  break;
                }
              }
            } catch (parseError) {
              console.log("Could not parse log:", parseError);
            }
          }

          if (flipResult) {
            // Update state with flip result
            dispatch({
              type: "SET_RESULT",
              payload: { result: flipResult, txHash: hash },
            });

            // Show result modal and toast notification
            setTimeout(() => {
              dispatch({ type: "SHOW_MODAL", payload: true });

              if (hash && hash !== state.toastShownForTx) {
                dispatch({ type: "MARK_TOAST_SHOWN", payload: hash });

                if (flipResult.isWin) {
                  toast.success("You won! 🎉", {
                    description: `The coin landed on ${flipResult.result}! You predicted ${flipResult.prediction}.`,
                  });
                } else {
                  toast.error("You lost 😢", {
                    description: `The coin landed on ${flipResult.result}. You predicted ${flipResult.prediction}. Better luck next time!`,
                  });
                }
              }
            }, 500);

            // Invalidate related queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["stats"] });
            queryClient.invalidateQueries({ queryKey: ["myFlips"] });
            queryClient.invalidateQueries({ queryKey: ["flipCount"] });
          } else {
            console.error(
              "Could not find CoinFlipped event in transaction receipt",
            );
            dispatch({ type: "SET_FLIPPING", payload: false });
            toast.error("Event parsing failed", {
              description:
                "Could not read the flip result from blockchain. Trying backup method...",
            });
            setTimeout(() => checkFlipResultFromAPI(hash), 2000);
          }
        } catch (error) {
          console.error("Error processing flip result from event:", error);
          dispatch({ type: "SET_FLIPPING", payload: false });
          toast.error("Processing error", {
            description:
              "Failed to process flip result. Trying backup method...",
          });
          setTimeout(() => checkFlipResultFromAPI(hash), 2000);
        }
      };

      processFlipResult();
    }
  }, [
    isConfirmed,
    receipt,
    hash,
    state.processedTxHash,
    state.transactionPredictions,
    state.toastShownForTx,
    queryClient,
  ]);

  // ========================================
  // API QUERIES AND MUTATIONS
  // ========================================

  /**
   * API mutation for checking flip results as fallback
   */
  const apiCheckMutation = useApiMutation<
    { flips: FlipHistoryItem[]; txHash: string },
    string
  >(
    async (txHash: string) => {
      const response = await api.get("/stats/flip-history/me");
      return { flips: response.data, txHash };
    },
    {
      onSuccess: ({ flips, txHash }) => {
        const storedPrediction = state.transactionPredictions[txHash];

        if (flips && flips.length > 0 && storedPrediction) {
          const latestFlip = flips[0];
          const actualResult = latestFlip.result.toLowerCase();
          const userPrediction = storedPrediction.toLowerCase();
          const isWin = actualResult === userPrediction;

          console.log("API fallback - Actual result:", actualResult);
          console.log("API fallback - User prediction:", userPrediction);
          console.log("API fallback - Is win:", isWin);

          const flipResult: FlipResult = {
            result: latestFlip.result,
            prediction: storedPrediction,
            isWin: isWin,
          };

          dispatch({
            type: "SET_RESULT",
            payload: { result: flipResult, txHash },
          });

          setTimeout(() => {
            dispatch({ type: "SHOW_MODAL", payload: true });

            if (txHash && txHash !== state.toastShownForTx) {
              dispatch({ type: "MARK_TOAST_SHOWN", payload: txHash });

              if (isWin) {
                toast.success("You won! 🎉", {
                  description: `The coin landed on ${latestFlip.result}! You predicted ${storedPrediction}.`,
                });
              } else {
                toast.error("You lost 😢", {
                  description: `The coin landed on ${latestFlip.result}. You predicted ${storedPrediction}. Better luck next time!`,
                });
              }
            }
          }, 500);
        }
      },
      onError: (error) => {
        console.error("Error checking flip result from API:", error);
        dispatch({ type: "SET_FLIPPING", payload: false });
        toast.error("Error checking flip result from API", {
          description: `${error}`,
        });
      },
    },
  );

  /**
   * Fallback function to check flip result from API
   */
  const checkFlipResultFromAPI = useCallback(
    (txHash: string): void => {
      return apiCheckMutation.mutate(txHash);
    },
    [apiCheckMutation],
  );

  /**
   * Query for user statistics
   */
  const statsQuery = useQuery<UserStats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const response = await api.get("/stats/me");
      return response.data;
    },
    enabled: !!token && isClient,
  });

  /**
   * Mutation for starting a coin flip
   */
  const flipMutation = useApiMutation<boolean, "heads" | "tails">(
    async (prediction: "heads" | "tails") => {
      if (!prediction) {
        throw new Error("No prediction selected");
      }

      console.log("Starting coin flip...");
      console.log("Contract address:", COINFLIP_ADDRESS);
      console.log("Fee amount:", COINFLIP_FEE, "ETH");
      console.log("User prediction:", prediction);

      const guessBool = prediction === "heads";

      return new Promise<boolean>((resolve, reject) => {
        try {
          writeContract({
            address: COINFLIP_ADDRESS as `0x${string}`,
            abi: COINFLIP_ABI,
            functionName: "flipCoin",
            args: [guessBool],
            value: ethers.parseEther(COINFLIP_FEE),
          });
          resolve(true);
        } catch (error) {
          reject(error);
        }
      });
    },
    {
      onError: (error) => {
        console.error("Error in startCoinFlip:", error);
        toast.error("Failed to start flip", {
          description: "Something went wrong while preparing the transaction.",
        });
      },
    },
  );

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Initiates a coin flip with the selected prediction
   */
  const startCoinFlip = useCallback((): void => {
    if (!state.prediction) {
      toast.error("No prediction selected", {
        description: "Please choose heads or tails before flipping!",
      });
      return;
    }

    flipMutation.mutate(state.prediction);
  }, [state.prediction, flipMutation]);

  /**
   * Handles closing the result modal and cleaning up state
   */
  const handleCloseResultModal = useCallback((): void => {
    dispatch({ type: "SHOW_MODAL", payload: false });
    dispatch({ type: "RESET_STATE" });

    // Clean up stored predictions
    if (hash) {
      dispatch({ type: "CLEANUP_TX", payload: hash });
    }
  }, [hash]);

  /**
   * Sets the user's prediction for the coin flip
   */
  const setPrediction = useCallback((prediction: "heads" | "tails"): void => {
    dispatch({ type: "SET_PREDICTION", payload: prediction });
  }, []);

  // ========================================
  // UI STATE CALCULATIONS
  // ========================================

  /**
   * Determines if the flip button should be disabled
   */
  const isButtonDisabled =
    !state.prediction ||
    isWritePending ||
    flipMutation.isPending ||
    (!!hash && !isConfirmed) ||
    state.isFlipping;

  /**
   * Gets the appropriate button text based on current state
   */
  const getButtonText = (): string => {
    if (isWritePending) return "Waiting for wallet...";
    if (flipMutation.isPending) return "Preparing...";
    if (hash && !isConfirmed) return "Flipping...";
    if (state.isFlipping) return "Flipping...";
    if (!state.prediction) return "Flip a Coin!";
    return "Flip a Coin!";
  };

  // ========================================
  // RENDER
  // ========================================

  return (
    <div className="p-6 max-w-[600px] mx-auto space-y-6">
      <div className="backdrop-blur-[60px] bg-translucent-dark-12 border-2 rounded-3xl border-translucent-light-4 px-6 pb-6 pt-10 flex flex-col gap-10">
        <div className="flex justify-center">
          <CoinFlip
            isFlipping={state.isFlipping}
            result={
              state.lastFlipResult
                ? (state.lastFlipResult.result.toLowerCase() as "head" | "tail")
                : null
            }
            onAnimationComplete={() => {}}
            size={240}
          />
        </div>

        {statsQuery.data && (
          <div className="flex flex-col justify-center">
            <div className="flex justify-center my-10">
              <GlareButton
                onClick={startCoinFlip}
                disabled={isButtonDisabled}
                background={
                  isButtonDisabled ? "rgba(255, 255, 255, 0.08)" : "#FFD700"
                }
                borderRadius="16px"
                borderColor="transparent"
                glareColor="#ffffff"
                glareOpacity={0.3}
                className={`px-6 py-3 text-h5 font-semibold ${
                  isButtonDisabled
                    ? "text-gray-200 cursor-not-allowed"
                    : "text-dark-primary"
                }`}
              >
                {getButtonText()}
              </GlareButton>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex gap-4">
                <GlareButton
                  onClick={() => setPrediction("heads")}
                  background={
                    state.prediction === "heads"
                      ? "#F5BA31"
                      : "rgba(255, 255, 255, 0.12)"
                  }
                  borderRadius="20px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  className={`px-4 flex-1 text-h5 font-semibold py-2 ${
                    state.prediction === "heads"
                      ? "text-dark-primary"
                      : "text-white"
                  }`}
                >
                  <Head size={64} />
                  Head
                </GlareButton>
                <GlareButton
                  onClick={() => setPrediction("tails")}
                  background={
                    state.prediction === "tails"
                      ? "#F5BA31"
                      : "rgba(255, 255, 255, 0.12)"
                  }
                  borderRadius="20px"
                  borderColor="transparent"
                  glareColor="#ffffff"
                  glareOpacity={0.3}
                  className={`px-4 flex-1 text-h5 font-semibold py-2 ${
                    state.prediction === "tails"
                      ? "text-dark-primary"
                      : "text-white"
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
          </div>
        )}
      </div>

      {/* Activity Component */}
      <Activity />

      {/* Result Modal */}
      <FlipResultModal
        isOpen={state.showResultModal}
        onClose={handleCloseResultModal}
        result={state.lastFlipResult}
      />
    </div>
  );
}
