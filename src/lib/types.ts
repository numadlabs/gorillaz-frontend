// ========================================
// TYPE DEFINITIONS
// ========================================

/**
 * Represents the result of a coin flip
 */
export interface FlipResult {
  result: string;
  prediction: string;
  isWin: boolean;
}

/**
 * Main state interface for the coin flip component
 */
export interface FlipState {
  prediction: "heads" | "tails" | null;
  isFlipping: boolean;
  showResultModal: boolean;
  lastFlipResult: FlipResult | null;
  transactionPredictions: Record<string, string>;
  processedTxHash: string | null;
  toastShownForTx: string | null;
}

/**
 * API response interface for user stats
 */
export interface UserStats {
  totalFlips: number;
  wins: number;
  losses: number;
  winRate: number;
  totalWinnings: string;
  totalLosses: string;
}

/**
 * API response interface for flip history
 */
export interface FlipHistoryItem {
  id: string;
  result: string;
  prediction: string;
  isWin: boolean;
  timestamp: string;
  transactionHash: string;
}

/**
 * Decoded event structure from the smart contract
 */
export interface CoinFlippedEvent {
  player: string;
  guess: boolean;
  isHeads: boolean;
  blockNumber: bigint;
}

/**
 * Action types for the state reducer
 */
export type FlipAction =
  | { type: "SET_PREDICTION"; payload: "heads" | "tails" | null }
  | { type: "START_FLIP"; payload: { hash: string; prediction: string } }
  | { type: "SET_FLIPPING"; payload: boolean }
  | { type: "SET_RESULT"; payload: { result: FlipResult; txHash: string } }
  | { type: "SHOW_MODAL"; payload: boolean }
  | { type: "MARK_TX_PROCESSED"; payload: string }
  | { type: "MARK_TOAST_SHOWN"; payload: string }
  | { type: "CLEANUP_TX"; payload: string }
  | { type: "RESET_STATE" };