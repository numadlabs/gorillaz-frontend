export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export const COINFLIP_ADDRESS = "0xa6E4DC836a5d62247eD582C59FEA21B67d596D03";
export const REQUIRED_CHAIN_ID = 11155111;

export const COINFLIP_FEE = "0.0001";
export const COINFLIP_ABI = [
  {
    name: "flipCoin",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "guess",
        type: "bool",
      },
    ],
    outputs: [
      {
        name: "",
        type: "bool",
      },
    ],
  },
  {
    type: "event",
    name: "CoinFlipped",
    inputs: [
      {
        name: "player",
        type: "address",
        indexed: true,
      },
      {
        name: "guess",
        type: "bool",
        indexed: false,
      },
      {
        name: "isHeads",
        type: "bool",
        indexed: false,
      },
      {
        name: "blockNumber",
        type: "uint256",
        indexed: false,
      },
    ],
    anonymous: false,
  },
];
