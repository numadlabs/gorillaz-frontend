// app/providers.tsx
"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import { metaMask } from "wagmi/connectors";

import { defineChain } from "viem";

export const somniaTestnet = defineChain({
  id: 50312,
  name: "Ethereum",
  nativeCurrency: { name: "STT", symbol: "STT", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://dream-rpc.somnia.network"] },
  },
  blockExplorers: {
    default: {
      name: "Blockscout",
      url: "https://shannon-explorer.somnia.network/",
    },
  },
});

const config = createConfig({
  chains: [somniaTestnet],
  connectors: [
    metaMask(),
  ],
  transports: {
    [somniaTestnet.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
