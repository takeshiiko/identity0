import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import { resolve } from "node:path";
import type { HardhatUserConfig } from "hardhat/config";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const accounts = process.env.OPERATOR_PRIVATE_KEY ? [process.env.OPERATOR_PRIVATE_KEY] : [];

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      url: process.env.ETH_SEPOLIA_RPC_URL ?? "",
      accounts
    },
    mainnet: {
      url: process.env.ETH_MAINNET_RPC_URL ?? "",
      accounts
    }
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY ?? "",
      mainnet: process.env.ETHERSCAN_API_KEY ?? ""
    }
  }
};

export default config;
