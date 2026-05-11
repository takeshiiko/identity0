export type ScoreKey =
  | "age"
  | "tx"
  | "defi"
  | "nft"
  | "risk"
  | "multichain"
  | "wealth";

export type WalletScores = Record<ScoreKey, number>;

export type RarityTier = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface WalletProfile {
  address: `0x${string}`;
  scores: WalletScores;
  compositeScore: number;
  rarityTier: RarityTier;
  seed: `0x${string}`;
  analyzedAt: string;
}

export interface ContractDeployment {
  chainId: number;
  name: string;
  address: `0x${string}`;
}

export const COLLECTION_SIZE = 3333;
export const DEFAULT_MINT_PRICE_ETH = "0.00065";
export const MAX_MINTS_PER_WALLET = 3;
export const ROYALTY_BPS = 300;

export const RARITY_RULES: Array<{
  tier: RarityTier;
  minScore: number;
  maxScore: number;
  targetSupply: number;
}> = [
  { tier: "Common", minScore: 0, maxScore: 40, targetSupply: 1500 },
  { tier: "Uncommon", minScore: 41, maxScore: 65, targetSupply: 1000 },
  { tier: "Rare", minScore: 66, maxScore: 80, targetSupply: 500 },
  { tier: "Epic", minScore: 81, maxScore: 92, targetSupply: 250 },
  { tier: "Legendary", minScore: 93, maxScore: 100, targetSupply: 83 }
];

export const ATTRIBUTE_RULES = {
  form: {
    masculineOrNeutralTarget: 0.78,
    feminineTarget: 0.22,
    note: "The generator keeps feminine portrait forms intentionally scarcer than masculine/neutral forms while remaining deterministic per wallet."
  },
  clothing: {
    common: ["simple collar", "plain shoulder panel"],
    uncommon: ["contrast collar", "two-tone jacket"],
    rare: ["geometric robe", "identity brooch"],
    epic: ["layered garment", "aura collar"],
    legendary: ["ceremonial shoulder geometry", "signature emblem"]
  },
  rareItems: {
    uncommon: ["small rotated mark"],
    rare: ["halo ring", "identity emblem"],
    epic: ["crown diamond", "arc aura"],
    legendary: ["crown band", "double aura", "signature golden signal"]
  }
} as const;

export const SCORE_WEIGHTS: Record<ScoreKey, number> = {
  age: 0.2,
  tx: 0.15,
  defi: 0.18,
  nft: 0.12,
  risk: 0.1,
  multichain: 0.1,
  wealth: 0.15
};

export const deployments: ContractDeployment[] = [
  { chainId: 11155111, name: "sepolia", address: "0x1E9fE9a5bBA33d0403368fC2dce7af660DaF5B1E" }
];

export const identity0Abi = [
  { inputs: [{ internalType: "string", name: "initialUnrevealedURI", type: "string" }, { internalType: "address", name: "operator", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  { inputs: [], name: "AccessControlBadConfirmation", type: "error" },
  { inputs: [{ internalType: "address", name: "account", type: "address" }, { internalType: "bytes32", name: "neededRole", type: "bytes32" }], name: "AccessControlUnauthorizedAccount", type: "error" },
  { inputs: [{ internalType: "uint256", name: "numerator", type: "uint256" }, { internalType: "uint256", name: "denominator", type: "uint256" }], name: "ERC2981InvalidDefaultRoyalty", type: "error" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }], name: "ERC2981InvalidDefaultRoyaltyReceiver", type: "error" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }, { internalType: "uint256", name: "numerator", type: "uint256" }, { internalType: "uint256", name: "denominator", type: "uint256" }], name: "ERC2981InvalidTokenRoyalty", type: "error" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }, { internalType: "address", name: "receiver", type: "address" }], name: "ERC2981InvalidTokenRoyaltyReceiver", type: "error" },
  { inputs: [{ internalType: "address", name: "sender", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }, { internalType: "address", name: "owner", type: "address" }], name: "ERC721IncorrectOwner", type: "error" },
  { inputs: [{ internalType: "address", name: "operator", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "ERC721InsufficientApproval", type: "error" },
  { inputs: [{ internalType: "address", name: "approver", type: "address" }], name: "ERC721InvalidApprover", type: "error" },
  { inputs: [{ internalType: "address", name: "operator", type: "address" }], name: "ERC721InvalidOperator", type: "error" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "ERC721InvalidOwner", type: "error" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }], name: "ERC721InvalidReceiver", type: "error" },
  { inputs: [{ internalType: "address", name: "sender", type: "address" }], name: "ERC721InvalidSender", type: "error" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "ERC721NonexistentToken", type: "error" },
  { inputs: [], name: "EnforcedPause", type: "error" },
  { inputs: [], name: "ExpectedPause", type: "error" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "OwnableInvalidOwner", type: "error" },
  { inputs: [{ internalType: "address", name: "account", type: "address" }], name: "OwnableUnauthorizedAccount", type: "error" },
  { inputs: [], name: "ReentrancyGuardReentrantCall", type: "error" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: true, internalType: "address", name: "approved", type: "address" }, { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }], name: "Approval", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "owner", type: "address" }, { indexed: true, internalType: "address", name: "operator", type: "address" }, { indexed: false, internalType: "bool", name: "approved", type: "bool" }], name: "ApprovalForAll", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "_fromTokenId", type: "uint256" }, { indexed: false, internalType: "uint256", name: "_toTokenId", type: "uint256" }], name: "BatchMetadataUpdate", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "_tokenId", type: "uint256" }], name: "MetadataUpdate", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "uint256", name: "price", type: "uint256" }], name: "MintPriceUpdated", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "previousOwner", type: "address" }, { indexed: true, internalType: "address", name: "newOwner", type: "address" }], name: "OwnershipTransferred", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "account", type: "address" }], name: "Paused", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "role", type: "bytes32" }, { indexed: true, internalType: "bytes32", name: "previousAdminRole", type: "bytes32" }, { indexed: true, internalType: "bytes32", name: "newAdminRole", type: "bytes32" }], name: "RoleAdminChanged", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "role", type: "bytes32" }, { indexed: true, internalType: "address", name: "account", type: "address" }, { indexed: true, internalType: "address", name: "sender", type: "address" }], name: "RoleGranted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "bytes32", name: "role", type: "bytes32" }, { indexed: true, internalType: "address", name: "account", type: "address" }, { indexed: true, internalType: "address", name: "sender", type: "address" }], name: "RoleRevoked", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "minter", type: "address" }, { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }], name: "TokenMinted", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }, { indexed: false, internalType: "string", name: "tokenURI", type: "string" }], name: "TokenRevealed", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, internalType: "address", name: "from", type: "address" }, { indexed: true, internalType: "address", name: "to", type: "address" }, { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" }], name: "Transfer", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "address", name: "account", type: "address" }], name: "Unpaused", type: "event" },
  { anonymous: false, inputs: [{ indexed: false, internalType: "string", name: "uri", type: "string" }], name: "UnrevealedURIUpdated", type: "event" },
  { inputs: [], name: "DEFAULT_ADMIN_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MAX_MINTS_PER_WALLET", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "MAX_SUPPLY", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "OPERATOR_ROLE", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "ROYALTY_FEE_NUMERATOR", outputs: [{ internalType: "uint96", name: "", type: "uint96" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "approve", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }], name: "balanceOf", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256[]", name: "tokenIds", type: "uint256[]" }, { internalType: "string[]", name: "ipfsCidsOrURIs", type: "string[]" }], name: "batchReveal", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "getApproved", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }], name: "getRoleAdmin", outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "grantRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "hasRole", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "owner", type: "address" }, { internalType: "address", name: "operator", type: "address" }], name: "isApprovedForAll", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "mint", outputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], stateMutability: "payable", type: "function" },
  { inputs: [], name: "mintPrice", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "wallet", type: "address" }], name: "mintedByWallet", outputs: [{ internalType: "uint256", name: "minted", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "name", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "owner", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "ownerOf", outputs: [{ internalType: "address", name: "", type: "address" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "pause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "paused", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "renounceOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "callerConfirmation", type: "address" }], name: "renounceRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }, { internalType: "string", name: "ipfsCidOrURI", type: "string" }], name: "revealToken", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }, { internalType: "address", name: "account", type: "address" }], name: "revokeRole", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }, { internalType: "uint256", name: "salePrice", type: "uint256" }], name: "royaltyInfo", outputs: [{ internalType: "address", name: "receiver", type: "address" }, { internalType: "uint256", name: "amount", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "safeTransferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }, { internalType: "bytes", name: "data", type: "bytes" }], name: "safeTransferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "operator", type: "address" }, { internalType: "bool", name: "approved", type: "bool" }], name: "setApprovalForAll", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "uint256", name: "price", type: "uint256" }], name: "setMintPrice", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "receiver", type: "address" }], name: "setRoyaltyReceiver", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "string", name: "uri", type: "string" }], name: "setUnrevealedURI", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "bytes4", name: "interfaceId", type: "bytes4" }], name: "supportsInterface", outputs: [{ internalType: "bool", name: "", type: "bool" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "symbol", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }], name: "tokenURI", outputs: [{ internalType: "string", name: "", type: "string" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "totalSupply", outputs: [{ internalType: "uint256", name: "", type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ internalType: "address", name: "from", type: "address" }, { internalType: "address", name: "to", type: "address" }, { internalType: "uint256", name: "tokenId", type: "uint256" }], name: "transferFrom", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address", name: "newOwner", type: "address" }], name: "transferOwnership", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [], name: "unpause", outputs: [], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ internalType: "address payable", name: "recipient", type: "address" }], name: "withdrawFunds", outputs: [], stateMutability: "nonpayable", type: "function" }
] as const;
