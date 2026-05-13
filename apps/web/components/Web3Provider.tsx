"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, getDefaultConfig, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { mainnet } from "wagmi/chains";
import { http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const alchemyRpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;

const wagmiConfig = getDefaultConfig({
  appName: "Kandinsky",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "placeholder",
  chains: [mainnet],
  transports: {
    [mainnet.id]: alchemyRpc ? http(alchemyRpc) : http()
  },
  ssr: true
});

const queryClient = new QueryClient();

const kandinskyTheme = lightTheme({
  accentColor: "#14130f",
  accentColorForeground: "#efe4cf",
  borderRadius: "none",
  fontStack: "system",
});

// Bauhaus palette override
kandinskyTheme.colors.modalBackground        = "#efe4cf";
kandinskyTheme.colors.modalBorder            = "#14130f";
kandinskyTheme.colors.modalText              = "#14130f";
kandinskyTheme.colors.modalTextSecondary     = "#5a5040";
kandinskyTheme.colors.modalTextDim           = "#8a7a60";
kandinskyTheme.colors.menuItemBackground     = "#e4d8c0";
kandinskyTheme.colors.actionButtonBorder     = "#14130f";
kandinskyTheme.colors.actionButtonSecondaryBackground = "#e4d8c0";
kandinskyTheme.colors.closeButton            = "#14130f";
kandinskyTheme.colors.closeButtonBackground  = "#e4d8c0";
kandinskyTheme.colors.generalBorder          = "#14130f";
kandinskyTheme.colors.generalBorderDim       = "rgba(20,19,15,0.2)";
kandinskyTheme.colors.selectedOptionBorder   = "#cda846";
kandinskyTheme.colors.connectButtonBackground = "#14130f";
kandinskyTheme.colors.connectButtonText      = "#efe4cf";
kandinskyTheme.colors.connectButtonInnerBackground = "#14130f";
kandinskyTheme.shadows.dialog               = "4px 4px 0px #14130f";
kandinskyTheme.shadows.selectedOption       = "2px 2px 0px #cda846";

export function Web3Provider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={kandinskyTheme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
