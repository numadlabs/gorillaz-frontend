"use client";

import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import axiosClient from "@/lib/axios";
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

// Contract Configuration
const MINEGAME_ABI = [
  "function startGame(uint8 _mineCount) payable returns (uint256 gameId)",
  "function requestCashOut(uint256 _gameId)",
  "function getGame(uint256 _gameId) view returns (address player, uint8 mineCount, uint8 tilesRevealed, uint8 state, uint64 startTime, uint256 betAmount)",
  "function gameFee() view returns (uint256)",
  "function settleGame(uint256 gameId, uint8 finalState, uint8 tilesRevealed)",
  "event GameStarted(uint256 indexed gameId, address indexed player, uint8 mineCount, uint256 betAmount)",
  "event GameSettled(uint256 indexed gameId, address indexed player, uint8 finalState, uint8 tilesRevealed)",
];

const CONTRACT_ADDRESS = "0x5aAf078087a6FC75dD29b51665ce18063B2F139f";
// const API_BASE_URL = "http://localhost:3001/api/mine";

export default function EnhancedMineGameApp() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const [mineCount, setMineCount] = useState<number>(3);
  const [gameFee, setGameFee] = useState<string>("0");
  const [backendGame, setBackendGame] = useState<Game | null>(null);
  const [revealedTiles, setRevealedTiles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // New state for additional features
  const [activeTab, setActiveTab] = useState<"game" | "history" | "stats">(
    "game",
  );
  const [gameHistory, setGameHistory] = useState<GameHistory | null>(null);
  const [userStats, setUserStats] = useState<GameStats | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  // Connect wallet
  const connectWallet = async (): Promise<void> => {
    if (!window.ethereum) {
      setMessage("MetaMask not found!");
      return;
    }

    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);
      const signerInstance = await browserProvider.getSigner();
      const accountAddress = await signerInstance.getAddress();

      const contractInstance = new ethers.Contract(
        CONTRACT_ADDRESS,
        MINEGAME_ABI,
        signerInstance,
      );

      const fee = await contractInstance.gameFee();
      setGameFee(ethers.formatEther(fee));

      setProvider(browserProvider);
      setSigner(signerInstance);
      setAccount(accountAddress);
      setContract(contractInstance);

      // Load all user data
      await Promise.all([
        loadActiveGame(accountAddress),
        loadUserStats(accountAddress),
        loadGameHistory(accountAddress, 1),
      ]);
    } catch (error) {
      console.error("Wallet connection error:", error);
      setMessage("Failed to connect wallet");
    }
  };

  const loadActiveGame = async (address: string): Promise<void> => {
    try {
      const response = await axiosClient.get(`mine/active/${address}`);
      const data = await response.data;

      if (data.success && data.game) {
        setBackendGame(data.game);
        setRevealedTiles(new Set(data.game.revealedTiles || []));
        console.log("Loaded active game:", data.game);
      }
    } catch (err) {
      console.error("Failed to load active game:", err);
    }
  };

  const loadUserStats = async (address: string): Promise<void> => {
    try {
      const response = await axiosClient.get(`mine/stats/${address}`);
      const data = await response.data;

      if (data.success) {
        setUserStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load user stats:", err);
    }
  };

  const loadGameHistory = async (
    address: string,
    page: number = 1,
  ): Promise<void> => {
    try {
      const response = await axiosClient.get(
        `mine/history/${address}?page=${page}&limit=10`,
      );
      const data = await response.data;

      if (data.success) {
        setGameHistory(data);
        setHistoryPage(page);
      }
    } catch (err) {
      console.error("Failed to load game history:", err);
    }
  };

  // Start game - three-step process
  const startGame = async (): Promise<void> => {
    if (!contract || !account) return;
    setLoading(true);
    setMessage("Creating game session...");

    try {
      const fee = await contract.gameFee();

      // Step 1: Create backend session
      const sessionResponse = await axiosClient.post(`mine/start`, {
        userAddress: account,
        mineCount,
        betAmount: fee.toString(),
      });

      const session = await sessionResponse.data;

      if (!session.success) {
        setMessage(session.error || "Failed to start game");
        setLoading(false);
        return;
      }

      setMessage("Starting blockchain transaction...");

      // Step 2: Create blockchain game
      const tx = await contract.startGame(mineCount, { value: fee });
      setMessage("Waiting for transaction confirmation...");

      const receipt = await tx.wait();

      // Extract gameId from events
      const gameStartedLog = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "GameStarted";
        } catch (e) {
          return false;
        }
      });

      if (!gameStartedLog) {
        throw new Error("GameStarted event not found in transaction");
      }

      const parsed = contract.interface.parseLog(gameStartedLog);
      const blockchainGameId = parsed.args[0].toString();

      setMessage("Linking game to blockchain...");

      // Step 3: Link backend game with blockchain game ID
      const linkResponse = await axiosClient.post(`mine/link`, {
        id: session.game.id,
        blockchainGameId: blockchainGameId,
        transactionHash: tx.hash,
      });

      const linkResult = await linkResponse.data;

      if (!linkResult.success) {
        setMessage("Failed to link game: " + linkResult.error);
        setLoading(false);
        return;
      }

      setBackendGame(linkResult.game);
      setRevealedTiles(new Set());
      setMessage("Game started successfully!");
    } catch (e: any) {
      console.error("Start game error:", e);
      setMessage(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  // Reveal tile (backend only)
  const revealTile = async (tileIndex: number): Promise<void> => {
    if (!backendGame || loading) return;

    setLoading(true);
    try {
      const gameId = backendGame.blockchainGameId;
      const response = await axiosClient.post(
        `mine/reveal/${gameId}/${tileIndex}`,
      );

      const result: RevealResponse = await response.data;

      if (!result.success) {
        setMessage((result as any).error || "Reveal failed");
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
            setMessage("💥 Mine hit! Game Over!");
            // Reload stats after game completion
            if (account) {
              await loadUserStats(account);
              await loadGameHistory(account, 1);
            }
          } else if (result.gameState === "PERFECT") {
            setMessage("🎉 Perfect game! All safe tiles revealed!");
            // Reload stats after game completion
            if (account) {
              await loadUserStats(account);
              await loadGameHistory(account, 1);
            }
          }
        } else {
          setMessage(result.isMine ? "💥 Mine hit!" : "✅ Safe tile");
        }
      }
    } catch (e: any) {
      setMessage(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  // Manual cash out - two-step process
  const cashOut = async (): Promise<void> => {
    if (!contract || !backendGame || loading) return;

    setLoading(true);
    setMessage("Processing cash out...");

    try {
      // Step 1: Update backend to CASHED_OUT state
      const gameId = backendGame.id;
      const cashoutResponse = await axiosClient.post(`mine/cashout/${gameId}`);

      const cashoutResult = await cashoutResponse.data;

      if (!cashoutResult.success) {
        throw new Error(cashoutResult.error || "Backend cashout failed");
      }

      setMessage("Submitting cashout to blockchain...");

      // Step 2: Call blockchain requestCashOut
      const blockchainGameId = backendGame.blockchainGameId;
      if (!blockchainGameId) {
        throw new Error("No blockchain game ID found");
      }

      const tx = await contract.requestCashOut(blockchainGameId);
      setMessage("Waiting for cashout confirmation...");
      await tx.wait();

      // Clear local game state and reload data
      setBackendGame(null);
      setRevealedTiles(new Set());
      setMessage("💰 Successfully cashed out!");

      // Reload user data
      if (account) {
        await loadUserStats(account);
        await loadGameHistory(account, 1);
      }
    } catch (e) {
      console.error("Cash out error:", e);
      setMessage(`Cash out error: ${e}`);
    }
    setLoading(false);
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
                account && loadGameHistory(account, historyPage - 1)
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
                account && loadGameHistory(account, historyPage + 1)
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

  return (
    <div className="max-w-4xl min-h-screen p-6 mx-auto bg-white">
      <h1 className="mb-6 text-3xl font-bold">⛏️ MineGame V3</h1>

      {/* Wallet Connection */}
      {!account ? (
        <button
          onClick={connectWallet}
          className="px-6 py-3 text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="mb-6">
          <p className="text-sm text-gray-600">Connected:</p>
          <p className="font-mono text-sm">{account}</p>
        </div>
      )}

      {/* Tab Navigation */}
      {account && (
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
      {account && (
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
                    >
                      {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          {n} mines
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    disabled={loading}
                    onClick={startGame}
                    className="px-6 py-3 text-white transition-colors bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? "Starting..." : `Start Game (${gameFee} ETH)`}
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
            message.includes("Error") || message.includes("💥")
              ? "bg-red-100 text-red-800 border border-red-300"
              : message.includes("🎉") || message.includes("💰")
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
