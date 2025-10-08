"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import {
  useAccount,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import axiosClient from "@/lib/axios";
import { MINEGAME_ABI } from "@/lib/config";

// Types
interface Game {
  id: string;
  blockchainGameId?: string;
  mineCount: number;
  boardSize: number;
  betAmount: string;
  gameState: "WAITING" | "PLAYING" | "CASHED_OUT" | "EXPLODED" | "PERFECT";
  tilesRevealed: number;
  revealedTiles: number[];
  minePositions?: number[];
  createdAt?: string;
  endedAt?: string;
}

interface RevealResponse {
  success: boolean;
  isMine: boolean;
  tileIndex: number;
  gameComplete: boolean;
  gameState: string;
  tilesRevealed: number;
  revealedTiles: number[];
}

interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesPerfect: number;
  totalTilesRevealed: number;
  totalMinesHit: number;
  currentWinStreak: number;
  bestWinStreak: number;
  highestTilesInGame: number;
}

interface GameHistory {
  games: Game[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const CONTRACT_ADDRESS = "0x549bD51F0E53Ad1B7c4A1aECD71000462adcda09";

export default function EnhancedMineGameApp() {
  // Wallet state from wagmi (similar to coin flip)
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();

  // Game state
  const [mineCount, setMineCount] = useState<number>(3);
  const [gameFee, setGameFee] = useState<string>("0");
  const [backendGame, setBackendGame] = useState<Game | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [pendingTxType, setPendingTxType] = useState<
    "startGame" | "cashOut" | null
  >(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"game" | "history" | "stats">(
    "game",
  );
  const [gameHistory, setGameHistory] = useState<GameHistory | null>(null);
  const [userStats, setUserStats] = useState<GameStats | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  // Client-side initialization
  const [isClient, setIsClient] = useState(false);

  // Blockchain hooks (wagmi pattern like coin flip)
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

  // Initialize client-side state
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Load user data when wallet connects
  useEffect(() => {
    if (isConnected && address && isClient) {
      loadUserData();
    }
  }, [isConnected, address, isClient]);

  // Handle write contract errors (similar to coin flip)
  useEffect(() => {
    if (writeError) {
      console.error("Write contract error:", writeError);
      setLoading(false);
      setPendingTxType(null); // Reset pending transaction type on error

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
      } else {
        toast.error("Transaction failed", {
          description: writeError.message,
        });
      }
    }
  }, [writeError]);

  // Handle successful transaction submission
  useEffect(() => {
    if (hash && !writeError && pendingTxType) {
      if (pendingTxType === "startGame") {
        toast.success("Game transaction submitted", {
          description: "Your mine game is being processed on the blockchain.",
        });
        setMessage("Waiting for transaction confirmation...");
      } else if (pendingTxType === "cashOut") {
        toast.success("Cash out transaction submitted", {
          description: "Your cash out is being processed on the blockchain.",
        });
        setMessage("Processing cash out on blockchain...");
      }
    }
  }, [hash, writeError, pendingTxType]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && receipt && hash && pendingTxType) {
      if (pendingTxType === "startGame") {
        processGameStart();
      } else if (pendingTxType === "cashOut") {
        processCashOut();
      }
      setPendingTxType(null); // Clear the pending transaction type
    }
  }, [isConfirmed, receipt, hash, pendingTxType]);
  const loadUserData = async () => {
    if (!address) return;

    try {
      await Promise.all([
        loadActiveGame(address),
        loadUserStats(address),
        loadGameHistory(address, 1),
        loadGameFee(),
      ]);
    } catch (error) {
      console.error("Failed to load user data:", error);
    }
  };

  const loadGameFee = async () => {
    try {
      if (!isConnected || !address) return;

      // Read the game fee from the smart contract
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        MINEGAME_ABI,
        provider,
      );

      const fee = await contract.gameFee();
      const feeInEth = ethers.formatEther(fee);
      setGameFee(feeInEth);

      console.log("Loaded game fee:", feeInEth, "ETH");
    } catch (error) {
      console.error("Failed to load game fee:", error);
      // Fallback to default fee if contract read fails
      setGameFee("0.01");
      toast.error("Failed to load game fee", {
        description: "Using default fee of 0.01 ETH",
      });
    }
  };

  const loadActiveGame = async (userAddress: string): Promise<void> => {
    try {
      const response = await axiosClient.get(`mine/active/${userAddress}`);
      const data = response.data;

      if (data.success && data.game) {
        setBackendGame(data.game);
        setRevealedTiles(new Set(data.game.revealedTiles || []));
        console.log("Loaded active game:", data.game);
      }
    } catch (err) {
      console.error("Failed to load active game:", err);
    }
  };

  const loadUserStats = async (userAddress: string): Promise<void> => {
    try {
      const response = await axiosClient.get(`mine/stats/${userAddress}`);
      const data = response.data;

      if (data.success) {
        setUserStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load user stats:", err);
    }
  };

  const loadGameHistory = async (
    userAddress: string,
    page: number = 1,
  ): Promise<void> => {
    try {
      const response = await axiosClient.get(
        `mine/history/${userAddress}?page=${page}&limit=10`,
      );
      const data = response.data;

      if (data.success) {
        setGameHistory(data);
        setHistoryPage(page);
      }
    } catch (err) {
      console.error("Failed to load game history:", err);
    }
  };

  const processGameStart = async (): Promise<void> => {
    if (!receipt || !hash) return;

    try {
      setMessage("Linking game to blockchain...");

      // Extract gameId from blockchain events
      const logs = receipt.logs;
      let blockchainGameId = null;

      // Create a contract interface for parsing logs
      const contractInterface = new ethers.Interface(MINEGAME_ABI);

      for (const log of logs) {
        try {
          // Check if log is from our contract
          if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
            // Parse the log using the contract interface
            const parsedLog = contractInterface.parseLog({
              topics: log.topics,
              data: log.data,
            });

            // Check if this is a GameStarted event
            if (parsedLog && parsedLog.name === "GameStarted") {
              blockchainGameId = parsedLog.args[0].toString();
              console.log(
                "Found GameStarted event with gameId:",
                blockchainGameId,
              );
              break;
            }
          }
        } catch (parseError) {
          console.log("Could not parse log:", parseError);
          continue;
        }
      }

      if (blockchainGameId && backendGame) {
        // Link backend game with blockchain game ID
        const linkResponse = await axiosClient.post(`mine/link`, {
          id: backendGame.id,
          blockchainGameId: blockchainGameId,
          transactionHash: hash,
        });

        const linkResult = linkResponse.data;

        if (linkResult.success) {
          setBackendGame(linkResult.game);
          setMessage("Game started successfully!");
          toast.success("Game started!", {
            description: "Your mine game has been created successfully.",
          });
        } else {
          throw new Error(linkResult.error || "Failed to link game");
        }
      } else {
        console.warn("Could not find GameStarted event or no backend game");
        setMessage("Game may have started but event parsing failed");
      }
    } catch (error) {
      console.error("Error processing game start:", error);
      toast.error("Game linking failed", {
        description: "The game may have started but linking failed.",
      });
    }

    setLoading(false);
  };

  // Start game - integrated with wagmi
  const startGame = async (): Promise<void> => {
    if (!address || !isConnected) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to start playing.",
      });
      return;
    }

    setLoading(true);
    setMessage("Creating game session...");

    try {
      // Step 1: Create backend session
      const sessionResponse = await axiosClient.post(`mine/start`, {
        userAddress: address,
        mineCount,
        betAmount: ethers.parseEther(gameFee).toString(),
      });

      const session = sessionResponse.data;

      if (!session.success) {
        throw new Error(session.error || "Failed to start game");
      }

      setBackendGame(session.game);
      setMessage("Starting blockchain transaction...");

      // Step 2: Create blockchain game using wagmi
      setPendingTxType("startGame");
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MINEGAME_ABI,
        functionName: "startGame",
        args: [mineCount],
        value: ethers.parseEther(gameFee),
      });
    } catch (error: any) {
      console.error("Start game error:", error);
      setMessage(`Error: ${error.message}`);
      toast.error("Failed to start game", {
        description: error.message,
      });
      setLoading(false);
    }
  };

  // Reveal tile (backend only)
  const revealTile = async (tileIndex: number): Promise<void> => {
    if (!backendGame || loading || !address) return;

    setLoading(true);
    try {
      const gameId = backendGame.blockchainGameId;
      const response = await axiosClient.post(
        `mine/reveal/${gameId}/${tileIndex}`,
      );

      const result: RevealResponse = response.data;

      if (!result.success) {
        toast.error("Reveal failed", {
          description: (result as any).error || "Could not reveal tile",
        });
      } else {
        setRevealedTiles(new Set(result.revealedTiles));

        // Update local game state
        setBackendGame((prev) =>
          prev
            ? {
                ...prev,
                gameState: result.gameState as any,
                tilesRevealed: result.tilesRevealed,
                revealedTiles: result.revealedTiles,
              }
            : null,
        );

        if (result.gameComplete) {
          if (result.isMine) {
            toast.error("Mine hit! Game Over!", {
              description: "Better luck next time!",
            });
            // Reload user data
            await loadUserData();
          } else if (result.gameState === "PERFECT") {
            toast.success("Perfect game!", {
              description: "All safe tiles revealed!",
            });
            // Reload user data
            await loadUserData();
          }
        } else {
          if (result.isMine) {
            toast.error("Mine hit!", {
              description: "Game over",
            });
          } else {
            toast.success("Safe tile!", {
              description: "Keep going!",
            });
          }
        }
      }
    } catch (error: any) {
      toast.error("Error revealing tile", {
        description: error.message,
      });
    }
    setLoading(false);
  };

  // Cash out with wagmi integration
  const cashOut = async (): Promise<void> => {
    if (!backendGame || loading || !address) return;

    setLoading(true);
    setMessage("Processing cash out...");

    try {
      // Step 1: Update backend to CASHED_OUT state
      const gameId = backendGame.id;
      const cashoutResponse = await axiosClient.post(`mine/cashout/${gameId}`);

      const cashoutResult = cashoutResponse.data;

      if (!cashoutResult.success) {
        throw new Error(cashoutResult.error || "Backend cashout failed");
      }

      setMessage("Submitting cashout to blockchain...");

      // Step 2: Set transaction type and call blockchain requestCashOut
      const blockchainGameId = backendGame.blockchainGameId;
      if (!blockchainGameId) {
        throw new Error("No blockchain game ID found");
      }

      setPendingTxType("cashOut");
      writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: MINEGAME_ABI,
        functionName: "requestCashOut",
        args: [BigInt(blockchainGameId)],
      });
    } catch (error: any) {
      console.error("Cash out error:", error);
      toast.error("Cash out failed", {
        description: error.message,
      });
      setLoading(false);
      setPendingTxType(null);
    }
  };

  // New processCashOut function to handle cash out confirmations
  const processCashOut = async (): Promise<void> => {
    if (!receipt || !hash) return;

    try {
      setMessage("Cash out confirmed on blockchain...");

      // Clear local game state
      setBackendGame(null);
      setRevealedTiles(new Set());
      setMessage("Successfully cashed out!");

      toast.success("Cash out confirmed!", {
        description: "Your winnings have been processed on the blockchain.",
      });

      // Reload user data
      await loadUserData();
    } catch (error: any) {
      console.error("Error processing cash out confirmation:", error);
      toast.error("Cash out confirmation failed", {
        description: error.message,
      });
    }

    setLoading(false);
  };

  // Connection status component
  const ConnectionStatus = () => {
    if (!isClient) return null;

    if (!isConnected) {
      return (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-yellow-800 font-semibold">Wallet Required</h3>
          <p className="text-yellow-700 text-sm">
            Please connect your wallet to start playing mine games.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="text-green-800 font-semibold">Wallet Connected</h3>
        <p className="text-green-700 text-sm font-mono">{address}</p>
      </div>
    );
  };

  // Render game board
  const renderGameBoard = () => {
    if (!backendGame) return null;

    const tiles = Array.from({ length: backendGame.boardSize }, (_, i) => {
      const isRevealed = revealedTiles.has(i);
      const isDisabled =
        isRevealed || backendGame.gameState !== "PLAYING" || loading;

      return (
        <button
          key={i}
          disabled={isDisabled}
          onClick={() => revealTile(i)}
          className={`
            w-12 h-12 border-2 rounded text-sm font-bold
            transition-all duration-200 hover:scale-105
            ${
              isRevealed
                ? "bg-green-300 border-green-500 text-green-800"
                : "bg-gray-200 border-gray-400 hover:bg-gray-300"
            }
            ${isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          `}
        >
          {isRevealed ? "✓" : i}
        </button>
      );
    });

    return <div className="grid max-w-xs grid-cols-5 gap-2 mt-4">{tiles}</div>;
  };

  // Render user stats
  const renderStats = () => {
    if (!userStats) return <div>No stats available</div>;

    const winRate =
      userStats.gamesPlayed > 0
        ? ((userStats.gamesWon / userStats.gamesPlayed) * 100).toFixed(1)
        : "0";

    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="p-4 rounded-lg bg-blue-50">
          <h4 className="font-semibold text-blue-800">Games Played</h4>
          <p className="text-2xl font-bold text-blue-600">
            {userStats.gamesPlayed}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-green-50">
          <h4 className="font-semibold text-green-800">Win Rate</h4>
          <p className="text-2xl font-bold text-green-600">{winRate}%</p>
        </div>
        <div className="p-4 rounded-lg bg-purple-50">
          <h4 className="font-semibold text-purple-800">Perfect Games</h4>
          <p className="text-2xl font-bold text-purple-600">
            {userStats.gamesPerfect}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-yellow-50">
          <h4 className="font-semibold text-yellow-800">Best Streak</h4>
          <p className="text-2xl font-bold text-yellow-600">
            {userStats.bestWinStreak}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-red-50">
          <h4 className="font-semibold text-red-800">Total Mines Hit</h4>
          <p className="text-2xl font-bold text-red-600">
            {userStats.totalMinesHit}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-indigo-50">
          <h4 className="font-semibold text-indigo-800">Current Streak</h4>
          <p className="text-2xl font-bold text-indigo-600">
            {userStats.currentWinStreak}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50">
          <h4 className="font-semibold text-gray-800">Tiles Revealed</h4>
          <p className="text-2xl font-bold text-gray-600">
            {userStats.totalTilesRevealed}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-orange-50">
          <h4 className="font-semibold text-orange-800">Best Game</h4>
          <p className="text-2xl font-bold text-orange-600">
            {userStats.highestTilesInGame}
          </p>
        </div>
      </div>
    );
  };

  // Render game history
  const renderHistory = () => {
    if (!gameHistory) return <div>No history available</div>;

    const getStateColor = (state: string) => {
      switch (state) {
        case "CASHED_OUT":
          return "text-green-600 bg-green-100";
        case "PERFECT":
          return "text-purple-600 bg-purple-100";
        case "EXPLODED":
          return "text-red-600 bg-red-100";
        default:
          return "text-gray-600 bg-gray-100";
      }
    };

    return (
      <div>
        <div className="space-y-4">
          {gameHistory.games.map((game) => (
            <div key={game.id} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${getStateColor(game.gameState)}`}
                    >
                      {game.gameState}
                    </span>
                    <span className="text-sm text-gray-500">
                      {game.mineCount} mines
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Tiles Revealed: {game.tilesRevealed} / {25 - game.mineCount}
                  </p>
                  <p className="text-sm text-gray-500">
                    {game.createdAt
                      ? new Date(game.createdAt).toLocaleString()
                      : "Unknown date"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {parseFloat(game.betAmount).toFixed(4)} ETH
                  </p>
                  {game.blockchainGameId && (
                    <p className="text-xs text-gray-500">
                      #{game.blockchainGameId}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {gameHistory.pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              disabled={historyPage === 1 || loading}
              onClick={() =>
                address && loadGameHistory(address, historyPage - 1)
              }
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">
              Page {gameHistory.pagination.page} of{" "}
              {gameHistory.pagination.pages}
            </span>
            <button
              disabled={historyPage === gameHistory.pagination.pages || loading}
              onClick={() =>
                address && loadGameHistory(address, historyPage + 1)
              }
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  };

  const isGameDisabled = !isConnected || loading || isWritePending;
  const getStartButtonText = () => {
    if (!isConnected) return "Connect Wallet to Play";
    if (isWritePending) return "Waiting for wallet...";
    if (loading) return "Starting...";
    return `Start Game (${gameFee} ETH)`;
  };

  if (!isClient) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl min-h-screen p-6 mx-auto bg-white">
      <h1 className="mb-6 text-3xl font-bold">⛏️ MineGame V3</h1>

      <ConnectionStatus />

      {/* Tab Navigation */}
      {isConnected && (
        <div className="mb-6">
          <div className="border-b">
            <nav className="flex -mb-px space-x-8">
              {[
                { id: "game", label: "Game" },
                { id: "history", label: "History" },
                { id: "stats", label: "Statistics" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {isConnected && (
        <div>
          {activeTab === "game" && (
            <div>
              {/* Game Setup */}
              {!backendGame && (
                <div className="p-4 mb-6 border rounded-lg">
                  <h3 className="mb-4 text-lg font-semibold">Start New Game</h3>

                  <div className="flex items-center gap-4 mb-4">
                    <label className="font-medium">Mine Count:</label>
                    <select
                      value={mineCount}
                      onChange={(e) => setMineCount(Number(e.target.value))}
                      className="px-3 py-2 border rounded"
                      disabled={isGameDisabled}
                    >
                      {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} mines
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={isGameDisabled}
                    onClick={startGame}
                    className="px-6 py-3 text-white transition-colors bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {getStartButtonText()}
                  </button>
                </div>
              )}

              {/* Active Game */}
              {backendGame && (
                <div>
                  <div className="p-4 mb-4 border rounded-lg">
                    <h3 className="mb-2 text-lg font-semibold">Game Active</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <p>
                        <strong>Mines:</strong> {backendGame.mineCount}
                      </p>
                      <p>
                        <strong>Tiles Revealed:</strong>{" "}
                        {backendGame.tilesRevealed}
                      </p>
                      <p>
                        <strong>State:</strong> {backendGame.gameState}
                      </p>
                      <p>
                        <strong>Safe Tiles Left:</strong>{" "}
                        {25 - backendGame.mineCount - backendGame.tilesRevealed}
                      </p>
                    </div>
                  </div>

                  {/* Game Board */}
                  {renderGameBoard()}

                  {/* Game Controls */}
                  {backendGame.gameState === "PLAYING" && (
                    <div className="flex gap-4 mt-6">
                      <button
                        disabled={loading || backendGame.tilesRevealed === 0}
                        onClick={cashOut}
                        className="px-6 py-3 text-white transition-colors bg-yellow-500 rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                      >
                        {loading ? "Cashing Out..." : "Cash Out"}
                      </button>

                      {backendGame.tilesRevealed === 0 && (
                        <p className="flex items-center text-sm text-gray-500">
                          Reveal at least one tile to cash out
                        </p>
                      )}
                    </div>
                  )}

                  {/* Game End States */}
                  {backendGame.gameState !== "PLAYING" && (
                    <div className="p-4 mt-6 border rounded-lg">
                      <h4 className="mb-2 font-semibold">Game Ended</h4>
                      <p className="text-sm">
                        Final State: <strong>{backendGame.gameState}</strong>
                      </p>
                      <p className="text-sm">
                        Tiles Revealed:{" "}
                        <strong>{backendGame.tilesRevealed}</strong>
                      </p>

                      <button
                        onClick={() => {
                          setBackendGame(null);
                          setRevealedTiles(new Set());
                          setMessage("");
                        }}
                        className="px-4 py-2 mt-3 text-white transition-colors bg-blue-500 rounded hover:bg-blue-600"
                      >
                        Start New Game
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Game History</h3>
              {renderHistory()}
            </div>
          )}

          {activeTab === "stats" && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Your Statistics</h3>
              {renderStats()}
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {message && (
        <div
          className={`mt-4 p-3 rounded-lg ${
            message.includes("Error") || message.includes("failed")
              ? "bg-red-100 text-red-800 border border-red-300"
              : message.includes("successfully") || message.includes("started")
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-blue-100 text-blue-800 border border-blue-300"
          }`}
        >
          {message}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-lg">
            <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-500 rounded-full animate-spin"></div>
            <p className="text-center">Processing...</p>
          </div>
        </div>
      )}
    </div>
  );
}
